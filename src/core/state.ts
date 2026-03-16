import fs from "node:fs";
import path from "node:path";
import type { StateFile } from "../types/index.js";

const STATE_FILE = ".mail2tg-state.json";

function emptyState(): StateFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    resources: {}
  };
}

export function getStatePath(): string {
  return path.resolve(process.cwd(), STATE_FILE);
}

export function loadState(): StateFile {
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) {
    return emptyState();
  }

  try {
    const raw = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.version === "number" &&
      typeof parsed.resources === "object"
    ) {
      return parsed as StateFile;
    }
    console.warn(`State file has invalid structure, resetting: ${statePath}`);
    return emptyState();
  } catch {
    console.warn(`State file is corrupted, resetting: ${statePath}`);
    return emptyState();
  }
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
