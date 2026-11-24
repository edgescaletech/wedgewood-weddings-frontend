import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const [environment, ...options] = process.argv.slice(2);
const require = createRequire(import.meta.url);

try {
  if (environment !== "local" && environment !== "staging") {
    throw new Error("Select local or staging with npm run test:e2e:local or npm run test:e2e:staging.");
  }
  const envFile = `.env.e2e.${environment}`;
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  process.env.E2E_ENV = environment;
  const projects = options.flatMap((option, index) => {
    if (option === "--project") return [options[index + 1]];
    if (option.startsWith("--project=")) return [option.slice("--project=".length)];
    return [];
  });
  if (projects.includes("chromium-live") && process.env.E2E_LIVE_AUTH !== "1") {
    throw new Error("Set E2E_LIVE_AUTH=1 to request the chromium-live project.");
  }
  if (projects.includes("chromium-go") && process.env.E2E_GO_AUTH !== "1" && process.env.E2E_LIVE_AUTH !== "1") {
    throw new Error("Set E2E_GO_AUTH=1 to request the chromium-go project.");
  }

  const result = spawnSync(process.execPath, [require.resolve("@playwright/test/cli"), "test", ...options], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(`E2E configuration: ${error.message}`);
  process.exitCode = 1;
}
