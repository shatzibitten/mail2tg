import fs from "node:fs";
import path from "node:path";
import type { StateFile } from "../types/index.js";

const STATE_FILE = ".mail2tg-state.json";

export function getStatePath(): string {
  return path.resolve(process.cwd(), STATE_FILE);
}

export function loadState(): StateFile {
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      resources: {}
    };
  }

  const raw = fs.readFileSync(statePath, "utf8");
  return JSON.parse(raw) as StateFile;
}

export function saveState(state: StateFile): void {
  const statePath = getStatePath();
  const next: StateFile = {
    ...state,
    version: 1,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(statePath, JSON.stringify(next, null, 2), "utf8");
}
