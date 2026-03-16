export type OutputMode = "human" | "json";

export interface CliOptions {
  configPath?: string;
  json?: boolean;
  nonInteractive?: boolean;
}

export interface Mail2TgConfig {
  projectName: string;
  domain: string;
  mailbox: string;
  workerName: string;
  telegramChatId?: string;
  dryRun?: boolean;
}

export interface SecretsInput {
  cloudflareApiToken: string;
  telegramBotToken: string;
}

export interface ActionItem {
  id: string;
  type: string;
  description: string;
  status: "pending" | "apply" | "noop" | "error";
  details?: Record<string, unknown>;
}

export interface ExecutionPlan {
  generatedAt: string;
  actions: ActionItem[];
}

export interface StateFile {
  version: number;
  updatedAt: string;
  resources: Record<string, string>;
}

export interface ZoneInfo {
  id: string;
  name: string;
  account: {
    id: string;
    name: string;
  };
}
