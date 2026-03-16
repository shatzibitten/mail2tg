import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function ask(question: string, fallback?: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const suffix = fallback ? ` (${fallback})` : "";
    const answer = (await rl.question(`${question}${suffix}: `)).trim();
    if (!answer && fallback) return fallback;
    return answer;
  } finally {
    rl.close();
  }
}
