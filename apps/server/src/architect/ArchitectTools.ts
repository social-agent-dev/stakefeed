import type Anthropic from "@anthropic-ai/sdk";
import {
  readFileSafe,
  writeFileSafe,
  runCommandSafe,
  canReadFile,
  canWriteFile,
  canRunCommand,
} from "./ArchitectSandbox.js";

export const ARCHITECT_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description:
      "Read a file from the stakefeed codebase. Path is relative to project root.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to project root, e.g. apps/server/src/agents/AgentRunner.ts",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file. Only allowed in: apps/server/src/agents/, apps/server/src/config/, apps/server/src/epoch/, packages/shared/src/",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to project root",
        },
        content: {
          type: "string",
          description: "Full file content to write",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "search_code",
    description: "Search for a pattern in the codebase using grep",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: {
          type: "string",
          description: "Regex pattern to search for",
        },
        glob: {
          type: "string",
          description: "File glob filter, e.g. '*.ts'",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description:
      "Run a read-only shell command for testing. Allowed: npx tsc, grep, cat, ls, head, tail, wc, find",
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description: "Shell command to run",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to project root",
        },
      },
      required: ["path"],
    },
  },
];

export interface ToolResult {
  output: string;
  error?: boolean;
}

export function executeTool(
  name: string,
  input: Record<string, string>
): ToolResult {
  try {
    switch (name) {
      case "read_file": {
        const content = readFileSafe(input.path);
        return { output: content };
      }

      case "write_file": {
        writeFileSafe(input.path, input.content);
        return { output: `Written ${input.path} (${input.content.length} chars)` };
      }

      case "search_code": {
        const glob = input.glob ? `--include='${input.glob}'` : "--include='*.ts'";
        const cmd = `grep -rn ${glob} '${input.pattern}' apps/ packages/ 2>/dev/null | head -30`;
        const result = runCommandSafe(cmd);
        return { output: result || "No matches found" };
      }

      case "run_command": {
        const result = runCommandSafe(input.command);
        return { output: result };
      }

      case "list_files": {
        const cmd = `ls -la ${input.path} 2>/dev/null`;
        const result = runCommandSafe(cmd);
        return { output: result || "Directory not found" };
      }

      default:
        return { output: `Unknown tool: ${name}`, error: true };
    }
  } catch (err: any) {
    return { output: err.message, error: true };
  }
}
