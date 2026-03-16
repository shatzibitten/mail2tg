interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: {
      id: number;
      type: string;
      username?: string;
      first_name?: string;
      title?: string;
    };
    text?: string;
  };
}

export class TelegramProvider {
  constructor(private readonly botToken: string) {}

  async verifyToken(): Promise<{ username: string; id: number }> {
    const me = await this.request<{ username: string; id: number }>("getMe");
    return { username: me.username, id: me.id };
  }

  async resolveChatId(): Promise<string | null> {
    const updates = await this.request<TelegramUpdate[]>("getUpdates?limit=20");
    const latest = updates
      .slice()
      .reverse()
      .find((item) => item.message?.chat?.id);
    if (!latest?.message?.chat?.id) {
      return null;
    }
    return String(latest.message.chat.id);
  }

  async sendTestMessage(chatId: string, text: string): Promise<void> {
    await this.request("sendMessage", {
      method: "POST",
      body: {
        chat_id: chatId,
        text
      }
    });
  }

  private async request<T>(
    method: string,
    init?: { method?: string; body?: Record<string, unknown> }
  ): Promise<T> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/${method}`,
      {
        method: init?.method ?? "GET",
        headers: {
          "Content-Type": "application/json"
        },
        body: init?.body ? JSON.stringify(init.body) : null
      }
    );

    const payload = (await response.json()) as TelegramApiResponse<T>;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.description ?? "Telegram API error");
    }
    return payload.result;
  }
}
