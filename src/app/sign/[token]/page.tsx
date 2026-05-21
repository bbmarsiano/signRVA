// Public signing page — mobile-first QR flow for signers (no auth required)
import SignAlreadySigned from "@/components/sign/SignAlreadySigned";
import SignExpired from "@/components/sign/SignExpired";
import SignForm from "@/components/sign/SignForm";
import SignNotFound from "@/components/sign/SignNotFound";
import {
  fetchDocumentByToken,
  resolveDocumentStatus,
} from "@/lib/sign/fetch-document";
import { findSignerByToken, getSigningType } from "@/lib/sign/signers";
import { resolveTemplateFields } from "@/lib/templates/db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TemplateField } from "@/types";

function mapTableFieldRow(row: {
  key: string;
  label: string;
  field_type: string;
  assigned_to: string;
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
  order_index: number;
  section: string | null;
}): TemplateField {
  return {
    key: row.key,
    label: row.label,
    field_type: row.field_type as TemplateField["field_type"],
    assigned_to: row.assigned_to as TemplateField["assigned_to"],
    required: row.required,
    placeholder: row.placeholder ?? undefined,
    options: Array.isArray(row.options) ? row.options : undefined,
    order_index: row.order_index,
    section: row.section ?? undefined,
  };
}

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await fetchDocumentByToken(token);

  if (!payload) {
    return <SignNotFound />;
  }

  const { document, organization, previewUrl } = payload;
  const status = resolveDocumentStatus(document);

  if (status === "expired") {
    if (document.status !== "expired") {
      const supabase = createAdminClient();
      await supabase
        .from("documents")
        .update({ status: "expired" })
        .eq("id", document.id);
    }
    return <SignExpired document={document} />;
  }

  if (status === "signed") {
    return <SignAlreadySigned document={document} />;
  }

  const signerMatch = findSignerByToken(document, token);
  if (signerMatch?.signer.status === "signed") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">
          Вече подписахте
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {getSigningType(document) === "two_sided"
            ? "Очаква се подпис от следващата страна."
            : "Документът е в процес на обработка."}
        </p>
      </div>
    );
  }

  const supabase = createAdminClient();

  let recipientFields: TemplateField[] = [];
  let existingFieldValues: Record<string, string> = {};
  let templateName = "";
  let templateId: string | null = document.template_id ?? null;
  const alreadyFilled = document.recipient_fields_filled === true;

  if (document.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("fields, name")
      .eq("id", document.template_id)
      .single();

    if (template) {
      templateName = template.name as string;
      templateId = document.template_id;

      const jsonFields = template.fields;
      if (
        Array.isArray(jsonFields) &&
        jsonFields.length > 0
      ) {
        recipientFields = (jsonFields as TemplateField[])
          .filter((f) => f.assigned_to === "recipient")
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      } else {
        const { data: tableFields } = await supabase
          .from("template_fields")
          .select("*")
          .eq("template_id", document.template_id)
          .eq("assigned_to", "recipient")
          .order("order_index", { ascending: true });

        recipientFields = (tableFields ?? []).map(mapTableFieldRow);
      }
    }

    if (recipientFields.length === 0) {
      const resolved = await resolveTemplateFields(document.template_id);
      recipientFields = resolved.filter((f) => f.assigned_to === "recipient");
    }

    const { data: fieldRows } = await supabase
      .from("document_field_values")
      .select("field_key, value")
      .eq("document_id", document.id);

    for (const row of fieldRows ?? []) {
      existingFieldValues[row.field_key as string] = row.value as string;
    }
  }

  await supabase.from("audit_log").insert({
    org_id: document.org_id,
    document_id: document.id,
    event_type: "document.viewed",
    actor: document.recipient_email,
    metadata: {},
    ip_address: "unknown",
    created_at: new Date().toISOString(),
  });

  return (
    <SignForm
      document={document}
      orgName={organization.name}
      previewUrl={previewUrl}
      token={token}
      signerLabel={payload.signerLabel}
      progressLabel={payload.progressLabel}
      recipientFields={alreadyFilled ? [] : recipientFields}
      existingFieldValues={existingFieldValues}
      templateName={templateName}
      templateId={templateId}
    />
  );
}
