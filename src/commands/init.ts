import { saveConfig } from "../core/config.js";
import { ask } from "../core/prompt.js";
import type { CliOptions, Mail2TgConfig } from "../types/index.js";
import { Output } from "../core/output.js";

export async function runInit(options: CliOptions): Promise<void> {
  const out = new Output(options.json ? "json" : "human");

  if (options.nonInteractive) {
    const domain = process.env.MAIL2TG_DOMAIN;
    const mailbox = process.env.MAIL2TG_MAILBOX;
    const workerName = process.env.MAIL2TG_WORKER_NAME ?? "mail2tg-worker";
    const projectName = process.env.MAIL2TG_PROJECT_NAME ?? "mail2tg-project";
    const telegramChatId = process.env.MAIL2TG_CHAT_ID;

    if (!domain || !mailbox) {
      out.error(
        "For --non-interactive provide MAIL2TG_DOMAIN and MAIL2TG_MAILBOX",
        2
      );
    }
    const safeDomain = domain as string;
    const safeMailbox = mailbox as string;

    const config: Mail2TgConfig = {
      projectName,
      domain: safeDomain,
      mailbox: safeMailbox,
      workerName,
      telegramChatId
    };

    const saved = saveConfig(config, options.configPath);
    out.success(`Config written to ${saved}`, {
      next: "Set CLOUDFLARE_API_TOKEN and TELEGRAM_BOT_TOKEN, then run: mail2tg plan"
    });
    return;
  }

  const domain = await ask("Domain (e.g. example.com)");
  const mailbox = await ask("Mailbox to route (e.g. info@example.com)");
  const workerName = await ask("Worker name", "mail2tg-worker");
  const projectName = await ask("Project name", "mail2tg-project");
  const telegramChatId = await ask(
    "Telegram chat id (optional; leave empty to auto-resolve via getUpdates)",
    ""
  );

  if (!domain || !mailbox) {
    out.error("Domain and mailbox are required", 2);
  }
  const safeDomain = domain as string;
  const safeMailbox = mailbox as string;

  const configBase: Mail2TgConfig = {
    projectName,
    domain: safeDomain,
    mailbox: safeMailbox,
    workerName
  };
  const config: Mail2TgConfig = telegramChatId
    ? { ...configBase, telegramChatId }
    : configBase;

  const saved = saveConfig(config, options.configPath);
  out.success(`Config written to ${saved}`, {
    reminder:
      "Secrets are not stored in config. Export CLOUDFLARE_API_TOKEN and TELEGRAM_BOT_TOKEN before apply."
  });
}
