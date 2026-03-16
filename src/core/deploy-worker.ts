import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveWorkerTemplate(): string {
  const fromDist = path.resolve(__dirname, "..", "..", "src", "worker-template", "index.ts");
  if (fs.existsSync(fromDist)) return fromDist;

  const fromSrc = path.resolve(__dirname, "..", "worker-template", "index.ts");
  if (fs.existsSync(fromSrc)) return fromSrc;

  throw new Error(
    `Worker template not found. Searched:\n  ${fromDist}\n  ${fromSrc}\n` +
    "Reinstall mail2tg or check your installation."
  );
}

function npxBin(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

export async function deployWorker(params: {
  workerName: string;
  accountId: string;
  mailbox: string;
  cloudflareApiToken: string;
}): Promise<void> {
  const entryFile = resolveWorkerTemplate();
  const compatibilityDate = new Date().toISOString().slice(0, 10);
  const args = [
    "wrangler",
    "deploy",
    entryFile,
    "--name",
    params.workerName,
    "--compatibility-date",
    compatibilityDate,
    "--var",
    `ALLOWED_RECIPIENTS:${params.mailbox}`
  ];

  try {
    await execFileAsync(npxBin(), args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: params.cloudflareApiToken,
        CLOUDFLARE_ACCOUNT_ID: params.accountId
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Worker deployment failed.\n${message}\n\n` +
      "Ensure wrangler is installed: npm install -g wrangler\n" +
      "Then retry: mail2tg apply"
    );
  }
}
