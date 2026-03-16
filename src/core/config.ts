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
    throw new Error(`Config file not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, "utf8");
  const parsed = YAML.parse(raw);
  return configSchema.parse(parsed);
}

export function saveConfig(config: Mail2TgConfig, configPath?: string): string {
  const resolved = resolveConfigPath(configPath);
  const serialized = YAML.stringify(config);
  fs.writeFileSync(resolved, serialized, "utf8");
  return resolved;
}

export function loadSecretsFromEnv(): SecretsInput {
  const envParsed = {
    cloudflareApiToken:
      process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN ?? "",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? ""
  };
  return secretSchema.parse(envParsed);
}
