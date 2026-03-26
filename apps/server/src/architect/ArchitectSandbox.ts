import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, relative } from "path";
import { execSync } from "child_process";

const PROJECT_ROOT = resolve(process.cwd(), "../..");

/** Paths the Architect CAN write to (relative to project root) */
const WRITE_ALLOWLIST = [
  "apps/server/src/agents/",
  "apps/server/src/config/",
  "apps/server/src/epoch/",
  "packages/shared/src/",
];

/** Paths the Architect CANNOT touch */
const WRITE_BLOCKLIST = [
  "programs/",
  ".env",
  ".git/",
  "node_modules/",
  "target/",
  "pnpm-lock.yaml",
  "Cargo.lock",
];

/** Commands the Architect CAN run */
const COMMAND_ALLOWLIST = [
  /^npx tsc/,
  /^grep\b/,
  /^cat\b/,
  /^ls\b/,
  /^head\b/,
  /^tail\b/,
  /^wc\b/,
  /^find\b.*-name/,
];

/** Commands that are NEVER allowed */
const COMMAND_BLOCKLIST = [
  /\brm\b/,
  /\bnpm install\b/,
  /\bpnpm install\b/,
  /\bpnpm add\b/,
  /\banchor deploy\b/,
  /\bgit push --force\b/,
  /\bgit reset\b/,
  /\bcurl\b/,
  /\bwget\b/,
  /\bchmod\b/,
  /\bsudo\b/,
  /\beval\b/,
  /\bexec\b/,
];

function normalizePath(filePath: string): string {
  const abs = resolve(PROJECT_ROOT, filePath);
  return relative(PROJECT_ROOT, abs);
}

export function canReadFile(filePath: string): boolean {
  const rel = normalizePath(filePath);
  // Can read anything in the project except .env and .git
  if (rel.startsWith(".env") || rel.startsWith(".git/")) return false;
  const abs = resolve(PROJECT_ROOT, rel);
  return abs.startsWith(PROJECT_ROOT) && existsSync(abs);
}

export function canWriteFile(filePath: string): boolean {
  const rel = normalizePath(filePath);

  // Check blocklist first
  for (const blocked of WRITE_BLOCKLIST) {
    if (rel.startsWith(blocked) || rel === blocked) return false;
  }

  // Must be in allowlist
  for (const allowed of WRITE_ALLOWLIST) {
    if (rel.startsWith(allowed)) return true;
  }

  return false;
}

export function canRunCommand(command: string): boolean {
  // Check blocklist
  for (const blocked of COMMAND_BLOCKLIST) {
    if (blocked.test(command)) return false;
  }

  // Check allowlist
  for (const allowed of COMMAND_ALLOWLIST) {
    if (allowed.test(command)) return true;
  }

  return false;
}

export function readFileSafe(filePath: string): string {
  if (!canReadFile(filePath)) {
    throw new Error(`SANDBOX: Cannot read ${filePath}`);
  }
  const abs = resolve(PROJECT_ROOT, normalizePath(filePath));
  return readFileSync(abs, "utf-8");
}

export function writeFileSafe(filePath: string, content: string): void {
  if (!canWriteFile(filePath)) {
    throw new Error(`SANDBOX: Cannot write to ${filePath} — outside allowlist`);
  }
  const abs = resolve(PROJECT_ROOT, normalizePath(filePath));
  writeFileSync(abs, content, "utf-8");
}

export function runCommandSafe(command: string): string {
  if (!canRunCommand(command)) {
    throw new Error(`SANDBOX: Command blocked — ${command}`);
  }
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      timeout: 30000,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
  } catch (err: any) {
    return err.stdout || err.message;
  }
}

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}
