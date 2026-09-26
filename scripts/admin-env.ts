// biome-ignore-all lint: dev script
/**
 * Loaded first by scripts/check-api.ts so that src/config/env.ts validates
 * ADMIN_EMAILS with the check account already listed. t3-env reads
 * process.env once, at module load, so later edits would be too late.
 */

const CHECK_ADMIN_EMAIL = "api-check-admin@example.com";

const configured = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

if (!configured.includes(CHECK_ADMIN_EMAIL)) {
  configured.push(CHECK_ADMIN_EMAIL);
}

process.env.ADMIN_EMAILS = configured.join(",");
