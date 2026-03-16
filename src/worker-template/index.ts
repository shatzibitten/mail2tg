import PostalMime from "postal-mime";

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  ALLOWED_RECIPIENTS: string;
}

const MAX_TG_MESSAGE = 4096;
const MAX_TG_CAPTION = 1024;
const MAX_TG_FILE = 50 * 1024 * 1024;
const BODY_PREVIEW = 2000;

type ForwardableEmailMessage = {
  to: string;
  from: string;
  raw: ReadableStream;
  setReject(reason: string): void;
};

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function splitByLength(value: string, maxLength: number): string[] {
  if (!value) return [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    chunks.push(value.slice(cursor, cursor + maxLength));
    cursor += maxLength;
  }
  return chunks;
}

function formatAddress(addr: { name?: string; address?: string } | undefined): string {
  if (!addr) return "unknown";
  if (addr.name && addr.address) return `${addr.name} <${addr.address}>`;
  return addr.address || addr.name || "unknown";
}

interface TgResponse {
  ok: boolean;
  description?: string;
}

async function sendMessage(token: string, chatId: string, text: string): Promise<TgResponse> {
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncate(text, MAX_TG_MESSAGE),
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });
  return resp.json() as Promise<TgResponse>;
}

async function sendDocument(
  token: string,
  chatId: string,
  filename: string,
  mimeType: string,
  content: ArrayBuffer,
  caption: string
): Promise<TgResponse> {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", new Blob([content], { type: mimeType }), filename);
  form.append("caption", truncate(caption, MAX_TG_CAPTION));
  form.append("parse_mode", "HTML");
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form
  });
  return resp.json() as Promise<TgResponse>;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      message.setReject("Worker is missing required secrets");
      return;
    }

    if (env.ALLOWED_RECIPIENTS) {
      const allow = env.ALLOWED_RECIPIENTS.split(",").map((s) => s.trim().toLowerCase());
      if (!allow.includes(message.to.toLowerCase())) {
        message.setReject(`Recipient ${message.to} is not allowed`);
        return;
      }
    }

    const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;

    try {
      const raw = await new Response(message.raw).arrayBuffer();
      const parsed = await PostalMime.parse(raw);

      const from = formatAddress(parsed.from);
      const to = message.to;
      const subject = parsed.subject || "(no subject)";
      const date = parsed.date || new Date().toISOString();
      const attachCount = (parsed.attachments ?? []).length;

      const header = [
        `📧 <b>New Email</b>`,
        ``,
        `<b>From:</b> ${esc(from)}`,
        `<b>To:</b> ${esc(to)}`,
        `<b>Subject:</b> ${esc(subject)}`,
        `<b>Date:</b> ${esc(date)}`
      ].join("\n");

      const bodyText = (parsed.text ?? "").trim();
      const bodyPreview = bodyText
        ? `\n\n<b>Body:</b>\n<pre>${esc(truncate(bodyText, BODY_PREVIEW))}</pre>`
        : "";

      const attachSummary = attachCount > 0
        ? `\n\n📎 <b>Attachments:</b> ${attachCount} file(s)`
        : "";

      const mainMsg = header + bodyPreview + attachSummary;
      const mainResult = await sendMessage(token, chatId, mainMsg);

      if (!mainResult.ok) {
        console.error("Failed to send header message:", mainResult.description);
      }

      if (bodyText.length > BODY_PREVIEW) {
        const remainder = bodyText.slice(BODY_PREVIEW);
        const chunks = splitByLength(remainder, 3500);
        for (const [i, chunk] of chunks.entries()) {
          const prefix = `<b>Body (continued ${i + 2}/${chunks.length + 1})</b>\n`;
          await sendMessage(token, chatId, `${prefix}<pre>${esc(chunk)}</pre>`);
        }
      }

      for (const att of parsed.attachments ?? []) {
        const filename = att.filename || "attachment.bin";
        const content = att.content as ArrayBuffer;
        const mimeType = att.mimeType || "application/octet-stream";
        const sizeKB = (content.byteLength / 1024).toFixed(0);
        const sizeMB = (content.byteLength / 1024 / 1024).toFixed(1);

        if (content.byteLength > MAX_TG_FILE) {
          await sendMessage(
            token,
            chatId,
            `⚠️ Attachment <b>${esc(filename)}</b> is too large (${sizeMB} MB), skipped.`
          );
          continue;
        }

        const caption = `📎 ${esc(filename)} (${sizeKB} KB)\nFrom: ${esc(subject)}`;
        const docResult = await sendDocument(token, chatId, filename, mimeType, content, caption);

        if (!docResult.ok) {
          console.error(`Failed to send attachment ${filename}:`, docResult.description);
          await sendMessage(
            token,
            chatId,
            `❌ Failed to send attachment <b>${esc(filename)}</b>: ${esc(docResult.description || "unknown error")}`
          );
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error("Worker error:", reason);
      message.setReject(`Failed to forward email: ${reason}`);
    }
  }
};
