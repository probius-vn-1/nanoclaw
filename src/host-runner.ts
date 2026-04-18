/**
 * Host Runner for NanoClaw
 * Spawns claude CLI directly on the macOS host (no container).
 * Useful for tasks that need local browser access, GUI automation,
 * or any capability that requires the host environment.
 */
import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  CONTAINER_TIMEOUT,
  DATA_DIR,
  GROUPS_DIR,
  IDLE_TIMEOUT,
} from './config.js';
import { ContainerInput, ContainerOutput } from './container-runner.js';
import { readEnvFile } from './env.js';
import { resolveGroupFolderPath } from './group-folder.js';
import { logger } from './logger.js';
import { RegisteredGroup } from './types.js';

// Keywords that route to the host runner (instant, no API call).
const HOST_KEYWORDS = [
  '@host',
  'browser',
  'chrome',
  'safari',
  'firefox',
  'chromium',
  'webpage',
  'web page',
  'website',
  'open url',
  'open link',
  'navigate to',
  'click on',
  'scroll down',
  'scroll up',
  'screenshot',
  'scrape',
  'crawl',
  'fill form',
  'submit form',
  'puppeteer',
  'playwright',
  'selenium',
  'applescript',
  'open app',
  'finder',
  'desktop app',
  'menu bar',
  'right-click',
  'double-click',
  'drag and drop',
  'system preferences',
  'system settings',
  '~/downloads',
  '~/desktop',
  '~/documents',
  'linkedin',
  'linkedin.com',
];

function keywordClassify(prompt: string): 'container' | 'host' {
  const lower = prompt.toLowerCase();
  return HOST_KEYWORDS.some((kw) => lower.includes(kw)) ? 'host' : 'container';
}

const HOST_CAPABILITIES_FILE = path.join(
  GROUPS_DIR,
  'global',
  'host-capabilities.md',
);

function loadHostCapabilities(): string | null {
  try {
    return fs.readFileSync(HOST_CAPABILITIES_FILE, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Classify whether a prompt should run on the host or in a container.
 * Uses instant keyword matching — no API call overhead.
 */
export async function classifyRunner(
  prompt: string,
  _proxyPort: number,
): Promise<'container' | 'host'> {
  return keywordClassify(prompt);
}

// Chrome lifecycle: not our job at spawn time. The com.nanoclaw.chrome-keepalive
// LaunchAgent pings Chrome every 60s, and the agent itself can `open -a "Google Chrome"`
// on demand if the extension is disconnected when a browser tool is called. Skipping
// a preflight check here avoids a 3s cold-start penalty on every run.

// Candidate locations for the claude CLI binary
const CLAUDE_BINARY_CANDIDATES = [
  `${os.homedir()}/.local/bin/claude`,
  '/usr/local/bin/claude',
  '/opt/homebrew/bin/claude',
];

function findClaudeBinary(): string {
  for (const candidate of CLAUDE_BINARY_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'claude'; // fall back to PATH
}

export async function runHostAgent(
  group: RegisteredGroup,
  input: ContainerInput,
  onProcess: (proc: ChildProcess, runId: string) => void,
  onOutput?: (output: ContainerOutput) => Promise<void>,
): Promise<ContainerOutput> {
  const startTime = Date.now();
  const groupDir = resolveGroupFolderPath(group.folder);
  fs.mkdirSync(groupDir, { recursive: true });

  const logsDir = path.join(groupDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  const claudeBin = findClaudeBinary();
  const runId = `host-${group.folder}-${Date.now()}`;

  // Sync agents from the group's own agents/ folder into .claude/agents/
  const groupAgentsDir = path.join(groupDir, 'agents');
  const agentsDst = path.join(groupDir, '.claude', 'agents');
  if (fs.existsSync(groupAgentsDir)) {
    fs.mkdirSync(agentsDst, { recursive: true });
    for (const agentFile of fs.readdirSync(groupAgentsDir)) {
      const srcFile = path.join(groupAgentsDir, agentFile);
      if (!fs.statSync(srcFile).isFile()) continue;
      fs.copyFileSync(srcFile, path.join(agentsDst, agentFile));
    }
  }

  const hostCapabilities = loadHostCapabilities();
  const ipcMessagesDir = path.join(DATA_DIR, 'ipc', group.folder, 'messages');
  fs.mkdirSync(ipcMessagesDir, { recursive: true });

  const dynamicContext = [
    hostCapabilities ?? '',
    `\n## IPC — sending files back to the user`,
    `To send a file (e.g. a screenshot) back to the user over Slack, write a JSON file to:`,
    `  ${ipcMessagesDir}/`,
    `File content: {"type":"file","chatJid":"${input.chatJid}","filePath":"/absolute/path/to/file.png","filename":"file.png","title":"optional title"}`,
    `The file will be uploaded to Slack automatically within 1 second.`,
    `Always send a follow-up text message via IPC (type:"message") so the user knows the file is coming.`,
    `IPC text message format: {"type":"message","chatJid":"${input.chatJid}","text":"your message"}`,
  ].join('\n');

  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
    '--chrome', // Chrome extension integration — gives agent navigate/click/screenshot tools
    '--append-system-prompt',
    dynamicContext,
  ];

  if (input.sessionId) {
    args.push('--resume', input.sessionId);
  }

  logger.info(
    { group: group.name, runId, sessionId: input.sessionId, claudeBin },
    'Spawning host agent',
  );

  const configTimeout = group.containerConfig?.timeout ?? CONTAINER_TIMEOUT;
  const timeoutMs = Math.max(configTimeout, IDLE_TIMEOUT + 30_000);

  return new Promise((resolve) => {
    const proc = spawn(claudeBin, args, {
      cwd: groupDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Third-party API tokens from .env (launchd env doesn't load .env).
        // Needed by host-runner skills that call upstream APIs directly —
        // e.g. vizonare:notion-tool scripts that curl api.notion.com with
        // NOTION_API_TOKEN. Keep this list narrow; only tokens the host
        // agents actually need.
        ...readEnvFile(['NOTION_API_TOKEN']),
        HOME: os.homedir(),
        // Ensure all system tools are reachable (screencapture, node, brew, etc.)
        PATH: [
          '/usr/sbin',
          '/usr/bin',
          '/bin',
          '/usr/local/bin',
          '/opt/homebrew/bin',
          '/opt/homebrew/opt/node@22/bin',
          `${os.homedir()}/.local/bin`,
          process.env.PATH ?? '',
        ]
          .filter(Boolean)
          .join(':'),
      },
    });

    onProcess(proc, runId);

    // Write prompt to stdin and close it
    proc.stdin.write(input.prompt);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';
    let newSessionId: string | undefined;
    let finalResult: string | null = null;
    let timedOut = false;
    // Buffer for partial JSON lines that span data chunks
    let lineBuffer = '';

    const killOnTimeout = () => {
      timedOut = true;
      logger.error({ group: group.name, runId }, 'Host agent timeout, killing');
      proc.kill('SIGTERM');
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* already gone */
        }
      }, 5000);
    };

    const timeout = setTimeout(killOnTimeout, timeoutMs);

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;

      // Parse newline-delimited JSON events from stream-json output
      lineBuffer += chunk;
      const lines = lineBuffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          // Capture session_id from any event
          if (event.session_id && !newSessionId) {
            newSessionId = event.session_id;
          }
          // Final result event — use this as the agent's response
          if (event.type === 'result') {
            newSessionId = event.session_id ?? newSessionId;
            if (!event.is_error && event.result) {
              finalResult = event.result;
            }
          }
        } catch {
          // Non-JSON line (e.g. debug output), skip
        }
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      for (const line of chunk.trim().split('\n')) {
        if (line) logger.debug({ group: group.folder }, line);
      }
    });

    proc.on('close', async (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      // Write run log
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logsDir, `host-${ts}.log`);
      fs.writeFileSync(
        logFile,
        [
          `=== Host Agent Run Log ===`,
          `Timestamp: ${new Date().toISOString()}`,
          `Group: ${group.name}`,
          `Duration: ${duration}ms`,
          `Exit Code: ${code}`,
          `Session ID: ${newSessionId ?? 'none'}`,
          ``,
          `=== Input Summary ===`,
          `Prompt length: ${input.prompt.length} chars`,
          ``,
          `=== Stderr ===`,
          stderr,
        ].join('\n'),
      );

      if (timedOut) {
        resolve({
          status: 'error',
          result: null,
          error: `Host agent timed out after ${configTimeout}ms`,
        });
        return;
      }

      if (code !== 0) {
        logger.error(
          { group: group.name, code, duration },
          'Host agent exited with error',
        );
        resolve({
          status: 'error',
          result: null,
          error: `Host agent exited with code ${code}: ${stderr.slice(-200)}`,
        });
        return;
      }

      logger.info(
        { group: group.name, duration, newSessionId, hasResult: !!finalResult },
        'Host agent completed',
      );

      if (onOutput) {
        // Emit the result to the streaming callback
        await onOutput({
          status: 'success',
          result: finalResult,
          newSessionId,
        });
        // Emit a success marker with no result so the caller can detect completion
        await onOutput({
          status: 'success',
          result: null,
          newSessionId,
        });
      }

      resolve({
        status: 'success',
        result: null,
        newSessionId,
      });
    });

    proc.on('error', (err: Error) => {
      clearTimeout(timeout);
      logger.error(
        { group: group.name, runId, error: err },
        'Host agent spawn error',
      );
      resolve({
        status: 'error',
        result: null,
        error: `Host agent spawn error: ${err.message}`,
      });
    });
  });
}
