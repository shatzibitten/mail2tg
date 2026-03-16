import { buildPlan } from "../core/plan.js";
import { loadConfig, loadSecretsFromEnv } from "../core/config.js";
import type { CliOptions } from "../types/index.js";
import { Output } from "../core/output.js";

export async function runPlan(options: CliOptions): Promise<void> {
  const out = new Output(options.json ? "json" : "human");
  const config = loadConfig(options.configPath);
  const secrets = loadSecretsFromEnv();
  const result = await buildPlan(config, secrets);

  const pending = result.plan.actions.filter((a) => a.status === "pending").length;
  const errors = result.plan.actions.filter((a) => a.status === "error").length;

  if (options.json) {
    out.info("Execution plan generated", result);
    return;
  }

  out.info(`Plan generated for zone ${result.zone.name} (${result.zone.id})`);
  for (const action of result.plan.actions) {
    const prefix =
      action.status === "pending"
        ? "[apply]"
        : action.status === "error"
          ? "[error]"
          : "[ok]";
    out.info(`${prefix} ${action.description}`);
  }
  out.info(`Summary: ${pending} apply, ${errors} errors`);
  if (errors > 0) {
    out.warn(
      "Resolve errors before apply. Most common issue: send /start to Telegram bot to create chat_id."
    );
  }
}
