#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runPlan } from "./commands/plan.js";
import { runApply } from "./commands/apply.js";
import { runDoctor } from "./commands/doctor.js";
import type { CliOptions } from "./types/index.js";
import { Output } from "./core/output.js";
import { getExitCode } from "./core/errors.js";

const program = new Command();

program
  .name("mail2tg")
  .description("Configure Email -> Telegram routing on Cloudflare")
  .version("0.1.0")
  .option("-c, --config <path>", "Path to config file")
  .option("--json", "JSON output for agent environments")
  .option("--non-interactive", "Disable prompts and rely on config/env");

program
  .command("init")
  .description("Initialize mail2tg config")
  .action(async () => {
    const global = program.opts();
    await runInit({
      configPath: global.config,
      json: global.json,
      nonInteractive: global.nonInteractive
    } satisfies CliOptions);
  });

program
  .command("plan")
  .description("Build execution plan (dry-run)")
  .action(async () => {
    const global = program.opts();
    await runPlan({
      configPath: global.config,
      json: global.json,
      nonInteractive: global.nonInteractive
    } satisfies CliOptions);
  });

program
  .command("apply")
  .description("Apply configuration changes")
  .action(async () => {
    const global = program.opts();
    await runApply({
      configPath: global.config,
      json: global.json,
      nonInteractive: global.nonInteractive
    } satisfies CliOptions);
  });

program
  .command("doctor")
  .description("Run health checks and optional Telegram test")
  .action(async () => {
    const global = program.opts();
    await runDoctor({
      configPath: global.config,
      json: global.json,
      nonInteractive: global.nonInteractive
    } satisfies CliOptions);
  });

program.parseAsync(process.argv).catch((error) => {
  const out = new Output(process.argv.includes("--json") ? "json" : "human");
  out.error(error instanceof Error ? error.message : String(error), getExitCode(error));
});
