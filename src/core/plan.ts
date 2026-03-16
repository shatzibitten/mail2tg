import type { ExecutionPlan, Mail2TgConfig, SecretsInput, ZoneInfo } from "../types/index.js";
import { CloudflareProvider } from "../providers/cloudflare.js";
import { TelegramProvider } from "../providers/telegram.js";

export interface BuiltPlan {
  plan: ExecutionPlan;
  zone: ZoneInfo;
  chatId: string | null;
}

export async function buildPlan(
  config: Mail2TgConfig,
  secrets: SecretsInput
): Promise<BuiltPlan> {
  const cf = new CloudflareProvider(secrets.cloudflareApiToken);
  const tg = new TelegramProvider(secrets.telegramBotToken);

  await cf.verifyToken();
  const zone = await cf.getZoneByName(config.domain);
  await tg.verifyToken();

  const chatId = config.telegramChatId ?? (await tg.resolveChatId());

  const dnsActions = await cf.planMxAndSpf(zone.id, config.domain);
  const routeAction = await cf.planRoutingRule(zone.id, config.mailbox, config.workerName);

  const actions = [
    {
      id: "preflight-cloudflare",
      type: "preflight.cloudflare",
      description: "Cloudflare token verified",
      status: "noop" as const
    },
    {
      id: "preflight-telegram",
      type: "preflight.telegram",
      description: "Telegram bot token verified",
      status: "noop" as const
    },
    {
      id: "resolve-chat-id",
      type: "telegram.chat",
      description: chatId
        ? `Telegram chat_id resolved (${chatId})`
        : "Telegram chat_id not found; user must send /start to bot",
      status: chatId ? ("noop" as const) : ("pending" as const)
    },
    {
      id: "deploy-worker",
      type: "worker.deploy",
      description: `Deploy or update worker ${config.workerName}`,
      status: "pending" as const,
      details: { accountId: zone.account.id }
    },
    ...dnsActions,
    routeAction,
    {
      id: "worker-secret-token",
      type: "worker.secret",
      description: "Set TELEGRAM_BOT_TOKEN secret",
      status: "pending" as const
    },
    {
      id: "worker-secret-chat",
      type: "worker.secret",
      description: "Set TELEGRAM_CHAT_ID secret",
      status: chatId ? ("pending" as const) : ("error" as const)
    }
  ];

  return {
    zone,
    chatId,
    plan: {
      generatedAt: new Date().toISOString(),
      actions
    }
  };
}
