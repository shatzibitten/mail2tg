import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import type { Mail2TgConfig, SecretsInput } from "../types/index.js";

const configSchema = z.object({
  projectName: z.string().min(1).default("mail2tg-project"),
  domain: z.string().min(1),
  mailbox: z.string().email(),
  workerName: z.string().min(1).default("mail2tg-worker"),
  telegramChatId: z.string().optional(),
  dryRun: z.boolean().optional()
});

const secretSchema = z.object({
  cloudflareApiToken: z.string().min(1),
  telegramBotToken: z.string().min(1)
});

export function resolveConfigPath(inputPath?: string): string {
  if (inputPath) {
    return path.resolve(process.cwd(), inputPath);
  }
  return path.resolve(process.cwd(), "mail2tg.config.yaml");
}

export function loadConfig(configPath?: string): Mail2TgConfig {
  const resolved = resolveConfigPath(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}\nRun "mail2tg init" to create one.`);
  }

  let raw: string;
  try {
    raw = fs.readFileSync(resolved, "utf8");
  } catch (err) {
    throw new Error(`Cannot read config file ${resolved}: ${err instanceof Error ? err.message : String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (err) {
    throw new Error(`Invalid YAML in ${resolved}: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    return configSchema.parse(parsed);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Invalid config in ${resolved}:\n${issues}`);
    }
    throw err;
  }
}

export function saveConfig(config: Mail2TgConfig, configPath?: string): string {
  const resolved = resolveConfigPath(configPath);
  const serialized = YAML.stringify(config);
  fs.writeFileSync(resolved, serialized, "utf8");
  return resolved;
}

export function loadSecretsFromEnv(): SecretsInput {
  const cloudflareApiToken =
    process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN ?? "";
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

  const missing: string[] = [];
  if (!cloudflareApiToken) missing.push("CLOUDFLARE_API_TOKEN");
  if (!telegramBotToken) missing.push("TELEGRAM_BOT_TOKEN");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Export them before running:\n" +
      '  export CLOUDFLARE_API_TOKEN="..."\n' +
      '  export TELEGRAM_BOT_TOKEN="..."'
    );
  }

  return secretSchema.parse({ cloudflareApiToken, telegramBotToken });
}
