import type { ActionItem, ZoneInfo } from "../types/index.js";

interface CfResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  priority?: number;
}

interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  matchers: Array<{ type: string; field?: string; value?: string }>;
  actions: Array<{ type: string; value?: string[] }>;
}

export class CloudflareProvider {
  constructor(private readonly token: string) {}

  async verifyToken(): Promise<void> {
    await this.request("/user/tokens/verify");
  }

  async getZoneByName(domain: string): Promise<ZoneInfo> {
    const response = await this.request<ZoneInfo[]>(
      `/zones?name=${encodeURIComponent(domain)}`
    );
    const zone = response[0];
    if (!zone) {
      throw new Error(`Cloudflare zone not found for domain ${domain}`);
    }
    return zone;
  }

  async getDnsRecords(zoneId: string): Promise<DnsRecord[]> {
    return this.request<DnsRecord[]>(
      `/zones/${zoneId}/dns_records?per_page=500`
    );
  }

  async listEmailRoutingRules(zoneId: string): Promise<RoutingRule[]> {
    return this.request<RoutingRule[]>(`/zones/${zoneId}/email/routing/rules`);
  }

  async planMxAndSpf(zoneId: string, domain: string): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];
    const dnsRecords = await this.getDnsRecords(zoneId);
    const requiredMx = [
      { content: "amir.mx.cloudflare.net", priority: 13 },
      { content: "isaac.mx.cloudflare.net", priority: 24 },
      { content: "linda.mx.cloudflare.net", priority: 86 }
    ];
    for (const mx of requiredMx) {
      const existing = dnsRecords.find(
        (r) =>
          r.type === "MX" &&
          r.name === domain &&
          r.content === mx.content &&
          r.priority === mx.priority
      );
      actions.push({
        id: `dns-mx-${mx.content}`,
        type: "dns.mx",
        description: existing
          ? `MX ${mx.content} already configured`
          : `Create MX ${mx.content}`,
        status: existing ? "noop" : "pending"
      });
    }

    const spfValue = "v=spf1 include:_spf.mx.cloudflare.net ~all";
    const existingSpf = dnsRecords.find(
      (r) => r.type === "TXT" && r.name === domain && r.content.includes(spfValue)
    );
    actions.push({
      id: "dns-spf",
      type: "dns.txt",
      description: existingSpf ? "SPF already configured" : "Create SPF TXT",
      status: existingSpf ? "noop" : "pending"
    });
    return actions;
  }

  async planRoutingRule(
    zoneId: string,
    mailbox: string,
    workerName: string
  ): Promise<ActionItem> {
    const rules = await this.listEmailRoutingRules(zoneId);
    const existing = rules.find((rule) =>
      rule.matchers.some((m) => m.field === "to" && m.value === mailbox)
    );
    if (!existing) {
      return {
        id: "routing-rule",
        type: "email.routing",
        description: `Create routing rule for ${mailbox} -> ${workerName}`,
        status: "pending"
      };
    }
    const workerAction = existing.actions.find((a) => a.type === "worker");
    const alreadySet = workerAction?.value?.includes(workerName) ?? false;
    return {
      id: "routing-rule",
      type: "email.routing",
      description: alreadySet
        ? `Routing rule already configured for ${mailbox}`
        : `Update routing rule for ${mailbox} -> ${workerName}`,
      status: alreadySet && existing.enabled ? "noop" : "pending",
      details: { ruleId: existing.id }
    };
  }

  async upsertMxAndSpf(zoneId: string, domain: string): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];
    const dnsRecords = await this.getDnsRecords(zoneId);

    const requiredMx = [
      { content: "amir.mx.cloudflare.net", priority: 13 },
      { content: "isaac.mx.cloudflare.net", priority: 24 },
      { content: "linda.mx.cloudflare.net", priority: 86 }
    ];

    for (const mx of requiredMx) {
      const existing = dnsRecords.find(
        (r) =>
          r.type === "MX" &&
          r.name === domain &&
          r.content === mx.content &&
          r.priority === mx.priority
      );

      if (existing) {
        actions.push({
          id: `dns-mx-${mx.content}`,
          type: "dns.mx",
          description: `MX ${mx.content} already configured`,
          status: "noop"
        });
        continue;
      }

      await this.request(`/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: {
          type: "MX",
          name: domain,
          content: mx.content,
          priority: mx.priority,
          ttl: 300
        }
      });

      actions.push({
        id: `dns-mx-${mx.content}`,
        type: "dns.mx",
        description: `Created MX ${mx.content}`,
        status: "apply"
      });
    }

    const spfValue = "v=spf1 include:_spf.mx.cloudflare.net ~all";
    const existingSpf = dnsRecords.find(
      (r) => r.type === "TXT" && r.name === domain && r.content.includes(spfValue)
    );

    if (existingSpf) {
      actions.push({
        id: "dns-spf",
        type: "dns.txt",
        description: "SPF record already configured",
        status: "noop"
      });
    } else {
      await this.request(`/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: {
          type: "TXT",
          name: domain,
          content: spfValue,
          ttl: 300
        }
      });
      actions.push({
        id: "dns-spf",
        type: "dns.txt",
        description: "Created SPF TXT record",
        status: "apply"
      });
    }

    return actions;
  }

  async upsertEmailRoutingRule(
    zoneId: string,
    mailbox: string,
    workerName: string
  ): Promise<ActionItem> {
    const rules = await this.request<RoutingRule[]>(
      `/zones/${zoneId}/email/routing/rules`
    );

    const existing = rules.find((rule) =>
      rule.matchers.some((m) => m.field === "to" && m.value === mailbox)
    );

    if (existing) {
      const workerAction = existing.actions.find((a) => a.type === "worker");
      const alreadySet = workerAction?.value?.includes(workerName) ?? false;
      if (alreadySet && existing.enabled) {
        return {
          id: "routing-rule",
          type: "email.routing",
          description: `Routing rule for ${mailbox} already configured`,
          status: "noop",
          details: { ruleId: existing.id }
        };
      }

      await this.request(`/zones/${zoneId}/email/routing/rules/${existing.id}`, {
        method: "PUT",
        body: {
          name: existing.name || `mail2tg-${mailbox}`,
          enabled: true,
          matchers: [{ type: "literal", field: "to", value: mailbox }],
          actions: [{ type: "worker", value: [workerName] }]
        }
      });

      return {
        id: "routing-rule",
        type: "email.routing",
        description: `Updated routing rule for ${mailbox}`,
        status: "apply",
        details: { ruleId: existing.id }
      };
    }

    const created = await this.request<RoutingRule>(
      `/zones/${zoneId}/email/routing/rules`,
      {
        method: "POST",
        body: {
          name: `mail2tg-${mailbox}`,
          enabled: true,
          matchers: [{ type: "literal", field: "to", value: mailbox }],
          actions: [{ type: "worker", value: [workerName] }]
        }
      }
    );

    return {
      id: "routing-rule",
      type: "email.routing",
      description: `Created routing rule for ${mailbox}`,
      status: "apply",
      details: { ruleId: created.id }
    };
  }

  async setWorkerSecret(
    accountId: string,
    workerName: string,
    secretName: string,
    secretValue: string
  ): Promise<void> {
    await this.request(
      `/accounts/${accountId}/workers/scripts/${workerName}/secrets`,
      {
        method: "PUT",
        body: {
          name: secretName,
          text: secretValue,
          type: "secret_text"
        }
      }
    );
  }

  private async request<T>(
    resource: string,
    init?: { method?: string; body?: Record<string, unknown> }
  ): Promise<T> {
    const response = await fetch(`https://api.cloudflare.com/client/v4${resource}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: init?.body ? JSON.stringify(init.body) : null
    });

    const payload = (await response.json()) as CfResponse<T>;
    if (!response.ok || !payload.success) {
      const message = payload.errors?.[0]?.message ?? "Cloudflare API error";
      throw new Error(`${message} [${resource}]`);
    }
    return payload.result;
  }
}
