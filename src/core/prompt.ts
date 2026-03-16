import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function ask(question: string, fallback?: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  const suffix = fallback ? ` (${fallback})` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  rl.close();
  if (!answer && fallback) return fallback;
  return answer;
}
