import { loadConfig, loadSecretsFromEnv } from "../core/config.js";
import { Output } from "../core/output.js";
import type { CliOptions } from "../types/index.js";
import { buildPlan } from "../core/plan.js";
import { CloudflareProvider } from "../providers/cloudflare.js";
import { deployWorker } from "../core/deploy-worker.js";
import { loadState, saveState } from "../core/state.js";

export async function runApply(options: CliOptions): Promise<void> {
  const out = new Output(options.json ? "json" : "human");
  const config = loadConfig(options.configPath);
  const secrets = loadSecretsFromEnv();
  const cf = new CloudflareProvider(secrets.cloudflareApiToken);
  const state = loadState();

  const built = await buildPlan(config, secrets);
  if (!built.chatId) {
    out.error(
      "Telegram chat_id not found. Send /start to the bot and rerun apply.",
      2
    );
  }
  const chatId = built.chatId as string;

  const summary: Array<{ step: string; status: string; error?: string }> = [];

  try {
    await deployWorker({
      workerName: config.workerName,
      accountId: built.zone.account.id,
      mailbox: config.mailbox,
      cloudflareApiToken: secrets.cloudflareApiToken
    });
    summary.push({ step: "deploy-worker", status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    summary.push({ step: "deploy-worker", status: "failed", error: message });
    out.error(`Worker deployment failed: ${message}`, 5, { summary });
  }

  const dnsActions = await cf.upsertMxAndSpf(built.zone.id, config.domain);
  summary.push({
    step: "dns-upsert",
    status: dnsActions.some((a) => a.status === "apply") ? "applied" : "noop"
  });

  const routeAction = await cf.upsertEmailRoutingRule(
    built.zone.id,
    config.mailbox,
    config.workerName
  );
  summary.push({ step: "routing-rule", status: routeAction.status });

  await cf.setWorkerSecret(
    built.zone.account.id,
    config.workerName,
    "TELEGRAM_BOT_TOKEN",
    secrets.telegramBotToken
  );
  await cf.setWorkerSecret(
    built.zone.account.id,
    config.workerName,
    "TELEGRAM_CHAT_ID",
    chatId
  );
  summary.push({ step: "worker-secrets", status: "ok" });

  state.resources.zoneId = built.zone.id;
  state.resources.accountId = built.zone.account.id;
  state.resources.workerName = config.workerName;
  state.resources.mailbox = config.mailbox;
  saveState(state);

  out.success("Apply completed", { summary });
}
