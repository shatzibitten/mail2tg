import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function deployWorker(params: {
  workerName: string;
  accountId: string;
  mailbox: string;
  cloudflareApiToken: string;
}): Promise<void> {
  const entryFile = path.resolve(process.cwd(), "src/worker-template/index.ts");
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

  await execFileAsync("npx", args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: params.cloudflareApiToken,
      CLOUDFLARE_ACCOUNT_ID: params.accountId
    }
  });
}
