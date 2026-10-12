import { execSync } from "node:child_process";

// Points git at the repo's shared hooks. Skipped silently outside a git checkout (e.g. a ZIP download).
try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  console.log("Git hooks enabled from .githooks/");
} catch {
  // Not a git repository or git is unavailable.
}
