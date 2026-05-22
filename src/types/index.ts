// Shared TypeScript types — domain models and API contracts for sign.runverifiedapp.com

// ─── Enums & unions ───────────────────────────────────────────────────────────

export type PlanId = "free" | "small" | "business";

export type UserRole = "owner" | "member";

export type DocumentStatus = "pending" | "signed" | "expired";

export type SigningType = "one_sided" | "two_sided" | "self_sign";

export type SigningOrder = "sequential" | "parallel";

export type SignerStatus = "pending" | "signed";

export interface DocumentSigner {
  name: string;
  email: string;
  phone?: string | null;
  order: number;
  sign_url_token: string;
  signed_at: string | null;
  status: SignerStatus;
}

export type BiometricType = "face_id" | "touch_id" | "none";

export type AuditEventType =
  | "document.created"
  | "document.sent"
  | "document.viewed"
  | "document.signed"
  | "document.expired"
  | "api.request";

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  plan: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  documents_used: number;
  documents_limit: number;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  title: string;
  file_path: string;
  status: DocumentStatus;
  recipient_email: string;
  recipient_name: string;
  recipient_phone: string | null;
  ttl_hours: number;
  sign_url_token: string;
  signing_type: SigningType;
  signers: DocumentSigner[];
  signing_order: SigningOrder | null;
  current_signer_index: number;
  all_signed_at: string | null;
  biometric_required: boolean;
  attached_signature: boolean;
  internal_note: string | null;
  created_at: string;
  signed_at: string | null;
  expires_at: string;
  template_id?: string | null;
  recipient_fields_filled?: boolean;
  recipient_fields_required?: boolean;
}

export interface Signature {
  id: string;
  document_id: string;
  signer_name?: string | null;
  canvas_data_path: string;
  canvas_hash: string | null;
  document_hash: string | null;
  webauthn_credential_id: string | null;
  ip_address: string;
  user_agent: string;
  device_info: Record<string, unknown>;
  biometric_type: BiometricType;
  p7s_path: string | null;
  signed_pdf_path: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  document_id: string | null;
  event_type: AuditEventType;
  actor: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  is_live: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  price_monthly: number;
  price_yearly: number;
  documents_limit: number;
  users_limit: number;
  api_access: boolean;
  audit_log_days: number;
}

// ─── API envelope ─────────────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

// ─── Document API ───────────────────────────────────────────────────────────────

export interface CreateDocumentRequest {
  title: string;
  recipient_email: string;
  recipient_name: string;
  recipient_phone?: string;
  ttl_hours?: number;
  biometric_required?: boolean;
  attached_signature?: boolean;
  internal_note?: string;
}

export interface CreateDocumentResponse {
  id: string;
  sign_url_token: string;
  qr_url?: string;
  sign_url?: string;
  redirect_url?: string;
  self_sign?: boolean;
  expires_at: string;
  status: DocumentStatus;
}

// ─── Signing API ────────────────────────────────────────────────────────────────

export interface SignDocumentRequest {
  canvas_data: string;
  webauthn_credential_id?: string;
  biometric_type?: BiometricType;
  device_info?: Record<string, unknown>;
}

export interface SignDocumentResponse {
  document_id: string;
  signed_at: string;
  signed_pdf_url: string | null;
  p7s_url: string | null;
  message?: string;
  pending_next_signer?: boolean;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export type TemplateFieldType =
  | "text"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "textarea"
  | "checkbox"
  | "select";

export type TemplateFieldAssignee = "sender" | "recipient";

export type TemplateType = "system" | "custom";

export type TemplateCategory =
  | "rental"
  | "vehicle"
  | "services"
  | "power_of_attorney"
  | "membership"
  | "other";

export interface TemplateField {
  key: string;
  label: string;
  field_type: TemplateFieldType;
  assigned_to: TemplateFieldAssignee;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order_index: number;
  section?: string;
}

export interface Template {
  id: string;
  org_id: string | null;
  name: string;
  description: string;
  type: TemplateType;
  category: TemplateCategory;
  fields: TemplateField[];
  html_content?: string;
  pdf_path?: string;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export interface DocumentFieldValue {
  id: string;
  document_id: string;
  template_id?: string;
  field_key: string;
  field_label?: string;
  value: string;
  filled_by: TemplateFieldAssignee;
  filled_at: string;
  signer_index: number;
}
