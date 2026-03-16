import PostalMime from "postal-mime";

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  ALLOWED_RECIPIENTS: string;
}

const TELEGRAM_MAX_FILE = 50 * 1024 * 1024;
type ForwardableEmailMessage = {
  to: string;
  raw: ReadableStream;
  setReject(reason: string): void;
};

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendMessage(
  token: string,
  chatId: string,
  text: string
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
  });
}

async function sendDocument(
  token: string,
  chatId: string,
  filename: string,
  mimeType: string,
  content: ArrayBuffer,
  caption: string
): Promise<void> {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", new Blob([content], { type: mimeType }), filename);
  form.append("caption", caption.slice(0, 1000));
  await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form
  });
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      message.setReject("Worker is missing required secrets");
      return;
    }

    if (env.ALLOWED_RECIPIENTS) {
      const allow = env.ALLOWED_RECIPIENTS.split(",").map((s) =>
        s.trim().toLowerCase()
      );
      if (!allow.includes(message.to.toLowerCase())) {
        message.setReject(`Recipient ${message.to} is not allowed`);
        return;
      }
    }

    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);
    const header = [
      "<b>New Email</b>",
      `<b>From:</b> ${esc(parsed.from?.address || "unknown")}`,
      `<b>To:</b> ${esc(message.to)}`,
      `<b>Subject:</b> ${esc(parsed.subject || "(no subject)")}`
    ].join("\n");

    await sendMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, header);

    for (const attachment of parsed.attachments ?? []) {
      const content = attachment.content as ArrayBuffer;
      if (content.byteLength > TELEGRAM_MAX_FILE) {
        await sendMessage(
          env.TELEGRAM_BOT_TOKEN,
          env.TELEGRAM_CHAT_ID,
          `Attachment ${esc(attachment.filename || "file")} exceeds 50MB and was skipped.`
        );
        continue;
      }
      await sendDocument(
        env.TELEGRAM_BOT_TOKEN,
        env.TELEGRAM_CHAT_ID,
        attachment.filename || "attachment.bin",
        attachment.mimeType || "application/octet-stream",
        content,
        `From: ${parsed.from?.address || "unknown"}`
      );
    }
  }
};
