// Cross-platform replacement for the previous `sh -c` preinstall one-liner.
// On Windows there is no `sh`, so the same checks are done in Node instead:
//   1. remove npm/yarn lockfiles so pnpm stays the single source of truth
//   2. fail fast when the workspace is not being installed with pnpm
const fs = require("node:fs");

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  try {
    fs.rmSync(lockfile, { force: true });
  } catch {
    // ignore: nothing to delete
  }
}

const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
