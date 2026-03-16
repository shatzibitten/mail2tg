import { loadConfig, loadSecretsFromEnv } from "../core/config.js";
import type { CliOptions } from "../types/index.js";
import { Output } from "../core/output.js";
import { CloudflareProvider } from "../providers/cloudflare.js";
import { TelegramProvider } from "../providers/telegram.js";

function hasMx(records: Array<{ type: string; content: string }>): boolean {
  const required = new Set([
    "amir.mx.cloudflare.net",
    "isaac.mx.cloudflare.net",
    "linda.mx.cloudflare.net"
  ]);
  const found = records
    .filter((r) => r.type === "MX")
    .map((r) => r.content.toLowerCase());
  return [...required].every((mx) => found.includes(mx));
}

export async function runDoctor(options: CliOptions): Promise<void> {
  const out = new Output(options.json ? "json" : "human");
  const config = loadConfig(options.configPath);
  const secrets = loadSecretsFromEnv();
  const cf = new CloudflareProvider(secrets.cloudflareApiToken);
  const tg = new TelegramProvider(secrets.telegramBotToken);

  const zone = await cf.getZoneByName(config.domain);
  const dns = await cf.getDnsRecords(zone.id);
  const rules = await cf.listEmailRoutingRules(zone.id);
  const me = await tg.verifyToken();
  const chatId = config.telegramChatId ?? (await tg.resolveChatId());

  const checks = {
    zone: true,
    mxConfigured: hasMx(dns),
    routingConfigured: rules.some((rule) =>
      rule.matchers.some((m) => m.field === "to" && m.value === config.mailbox)
    ),
    telegramBotValid: Boolean(me.username),
    telegramChatResolvable: Boolean(chatId)
  };

  if (chatId) {
    await tg.sendTestMessage(
      chatId,
      `mail2tg doctor check ok for ${config.mailbox} (${new Date().toISOString()})`
    );
  }

  const allOk = Object.values(checks).every(Boolean);
  if (!allOk) {
    out.error("Doctor checks failed", 4, checks);
  }
  out.success("Doctor checks passed", checks);
}
