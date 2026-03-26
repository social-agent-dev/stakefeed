import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import { eventBus } from "../events/EventBus.js";
import { getOrchestrator } from "../agents/AgentOrchestrator.js";
import { getCurrentEpoch, getPosts } from "../epoch/EpochManager.js";
import { ARCHITECT_TOOLS, executeTool } from "./ArchitectTools.js";
import { architectMemory, type ArchitectCommitRecord } from "./ArchitectMemory.js";
import { getProjectRoot } from "./ArchitectSandbox.js";
import { env } from "../config/env.js";

const ARCHITECT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const PROJECT_ROOT = getProjectRoot();

const SYSTEM_PROMPT = `You are the Architect of StakeFeed — an autonomous AI agent that maintains and evolves a self-building social media platform on Solana.

You have access to the full codebase through tools. Your job is to:
1. Analyze platform metrics (agent performance, epoch data, code patterns)
2. Identify one focused improvement (better strategies, new features, bug fixes, optimizations)
3. Write the code change using the write_file tool
4. Keep changes small and focused — one logical change per cycle

You are a real builder. Your commits appear on GitHub under the account social-agent-dev.
Users watch you work in real-time through a terminal panel on the platform.

Rules:
- Make ONE focused change per cycle. Don't try to do too much.
- Write clean TypeScript. Match existing code style.
- You can only write to: apps/server/src/agents/, apps/server/src/config/, apps/server/src/epoch/, packages/shared/src/
- You CANNOT modify: programs/ (Anchor), .env, node_modules, lock files
- After writing files, explain what you changed and why in a short "impact" summary
- Be opinionated. Don't ask for permission. Just build.

Think about what would make the platform more interesting, more alive, more robust.
Ideas: improve agent strategies, add new voice lines, tune ELO/bonding curve params, add agent rivalry logic, fix edge cases, add metrics tracking, improve epoch resolution logic.`;

function buildAnalysisPrompt(): string {
  const epoch = getCurrentEpoch();
  const posts = getPosts();
  const agents = getOrchestrator().getAgents();
  const recentCommits = architectMemory.getRecentCommitSummary();
  const cycle = architectMemory.incrementCycle();

  const agentSummary = agents
    .map((a) => `  ${a.name}: ELO=${a.elo} bal=${a.balance.toFixed(3)} streak=${a.streak} alive=${a.alive}`)
    .join("\n");

  const postSummary = posts.length > 0
    ? posts
        .slice(0, 5)
        .map((p) => `  [${p.authorType}] ${p.author}: ${p.likeCount} likes, ${p.totalStaked.toFixed(4)} SOL`)
        .join("\n")
    : "  No posts in current epoch";

  return `ARCHITECT CYCLE #${cycle}

PLATFORM STATE:
  Epoch: ${epoch?.number ?? 0}
  Pool: ${epoch?.totalPool?.toFixed(4) ?? "0"} SOL
  Posts this epoch: ${posts.length}
  Resolved: ${epoch?.resolved ?? false}

AGENTS:
${agentSummary}

CURRENT POSTS:
${postSummary}

RECENT COMMITS:
${recentCommits}

Analyze the platform state above. Pick ONE thing to improve, read the relevant code, make the change, and explain your reasoning. Focus on making the platform more interesting or fixing something that could be better.`;
}

function emitPhase(phase: string) {
  eventBus.emit("architect:phase", { phase });
}

function emitOutput(text: string) {
  eventBus.emit("architect:output", { text, stream: true });
}

async function gitCommitAndPush(
  message: string,
  filesChanged: string[]
): Promise<string | null> {
  try {
    const cwd = PROJECT_ROOT;
    execSync(`git add ${filesChanged.join(" ")}`, { cwd });

    const commitResult = execSync(
      `git commit -m "${message.replace(/"/g, '\\"')}"`,
      { cwd, encoding: "utf-8" }
    );

    // Extract hash
    const hashMatch = commitResult.match(/\[[\w\s]+\s([a-f0-9]+)\]/);
    const hash = hashMatch?.[1] || "unknown";

    // Push
    execSync(`git push origin main`, { cwd, timeout: 30000 });

    return hash;
  } catch (err: any) {
    console.error(`[ARCHITECT] Git error: ${err.message}`);
    return null;
  }
}

export async function runArchitectCycle(): Promise<void> {
  if (!env.ANTHROPIC_API_KEY) {
    console.log("[ARCHITECT] No ANTHROPIC_API_KEY set — skipping cycle");
    emitOutput("⚠ No API key configured. Architect is idle.\n");
    return;
  }

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  console.log("[ARCHITECT] Starting cycle...");

  // Phase 1: ANALYZING
  emitPhase("analyzing");
  emitOutput("▸ analyzing platform state...\n");

  const prompt = buildAnalysisPrompt();
  emitOutput(prompt.split("\n").slice(0, 8).join("\n") + "\n...\n\n");

  // Phase 2: WRITING — stream Claude's response
  emitPhase("writing");
  emitOutput("▸ thinking about what to build...\n\n");

  const filesChanged: string[] = [];
  let commitMessage = "";
  let impactSummary = "";

  try {
    // Agentic loop — handle tool_use
    let messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];
    let done = false;
    let retries = 0;

    while (!done && retries < 5) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: ARCHITECT_TOOLS,
        messages,
      });

      // Process content blocks
      const assistantContent: Anthropic.ContentBlock[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          emitOutput(block.text);
          assistantContent.push(block);

          // Extract commit message and impact from the text
          const commitMatch = block.text.match(/commit:\s*(.+)/i);
          if (commitMatch) commitMessage = commitMatch[1].trim();

          const impactMatch = block.text.match(/impact:\s*(.+)/i);
          if (impactMatch) impactSummary = impactMatch[1].trim();
        }

        if (block.type === "tool_use") {
          assistantContent.push(block);
          const input = block.input as Record<string, string>;

          emitOutput(`\n> ${block.name}(${input.path || input.pattern || input.command || ""})\n`);

          const result = executeTool(block.name, input);

          if (block.name === "write_file" && !result.error) {
            filesChanged.push(input.path);
            emitOutput(`  ✓ wrote ${input.path}\n`);
          } else if (block.name === "read_file" && !result.error) {
            // Show truncated file content
            const lines = result.output.split("\n");
            emitOutput(`  (${lines.length} lines)\n`);
          } else if (result.error) {
            emitOutput(`  ✗ ${result.output}\n`);
          } else {
            const preview = result.output.slice(0, 200);
            emitOutput(`  ${preview}${result.output.length > 200 ? "..." : ""}\n`);
          }

          // Add assistant message with tool use, then tool result
          messages = [
            ...messages,
            { role: "assistant", content: assistantContent.splice(0) },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: result.output.slice(0, 3000),
                },
              ],
            },
          ];
        }
      }

      // If no tool use in this response, we're done
      if (response.stop_reason === "end_turn" || !response.content.some((b) => b.type === "tool_use")) {
        // Add any remaining text content to messages
        if (assistantContent.length > 0) {
          messages.push({ role: "assistant", content: assistantContent });
        }
        done = true;
      }

      retries++;
    }
  } catch (err: any) {
    console.error(`[ARCHITECT] Claude error: ${err.message}`);
    emitOutput(`\n✗ Error: ${err.message}\n`);
    emitPhase("idle");
    return;
  }

  // Phase 3: TESTING
  if (filesChanged.length > 0) {
    emitPhase("testing");
    emitOutput("\n▸ running type check...\n");

    try {
      const testResult = execSync("npx tsc --noEmit 2>&1", {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        timeout: 30000,
      });
      emitOutput("  ✓ types OK\n");
    } catch (err: any) {
      const output = err.stdout || err.message;
      emitOutput(`  ⚠ type errors (non-blocking):\n${output.slice(0, 500)}\n`);
    }

    // Phase 4: DEPLOYING
    emitPhase("deploying");
    if (!commitMessage) {
      commitMessage = `architect: update ${filesChanged.join(", ")}`;
    }
    if (!impactSummary) {
      impactSummary = `Modified ${filesChanged.length} file(s)`;
    }

    emitOutput(`\n▸ committing: ${commitMessage}\n`);

    const hash = await gitCommitAndPush(commitMessage, filesChanged);

    if (hash) {
      const type = commitMessage.startsWith("fix") ? "bugfix"
        : commitMessage.startsWith("feat") ? "feature"
        : commitMessage.startsWith("perf") ? "performance"
        : "refactor";

      const record: ArchitectCommitRecord = {
        hash,
        message: commitMessage,
        filesChanged,
        timestamp: Date.now(),
        type,
        impact: impactSummary,
      };

      architectMemory.addCommit(record);
      eventBus.emit("architect:commit", record);

      emitOutput(`  ✓ pushed ${hash} to github.com/social-agent-dev/stakefeed\n`);
      console.log(`[ARCHITECT] Committed ${hash}: ${commitMessage}`);
    } else {
      emitOutput("  ✗ git push failed\n");
    }
  } else {
    emitOutput("\n▸ no files changed this cycle\n");
  }

  emitPhase("idle");
  emitOutput("\n● cycle complete. next run in 10 minutes.\n");
  eventBus.emit("architect:idle", { nextRunIn: ARCHITECT_INTERVAL_MS / 1000 });
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startArchitect() {
  console.log("[ARCHITECT] Starting — first cycle in 30 seconds, then every 10 minutes");

  // First cycle after a short delay (let the server settle)
  setTimeout(() => {
    runArchitectCycle().catch((err) =>
      console.error("[ARCHITECT] Cycle failed:", err)
    );
  }, 30000);

  // Then every 10 minutes
  interval = setInterval(() => {
    runArchitectCycle().catch((err) =>
      console.error("[ARCHITECT] Cycle failed:", err)
    );
  }, ARCHITECT_INTERVAL_MS);
}

export function stopArchitect() {
  if (interval) clearInterval(interval);
}

export function getArchitectStatus() {
  return {
    commits: architectMemory.getCommits(),
    cycleCount: architectMemory.getCycleCount(),
  };
}
