// Webhook types — org_webhooks table
export type WebhookEventType =
  | "document.signed"
  | "document.expired"
  | "document.created";

export interface OrgWebhook {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  is_active: boolean;
  created_at: string;
}
