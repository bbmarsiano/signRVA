// POST /api/documents/create — upload PDF, insert document, generate QR, audit log
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { htmlToPdf } from "@/lib/pdf/html-to-pdf";
import { createPlaceholderPdf } from "@/lib/pdf/create-placeholder-pdf";
import {
  buildFilledTemplateHtml,
  fetchTemplateForPdf,
} from "@/lib/templates/prepare-html";
import { generateQrForToken } from "@/lib/sign/process-signature";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DocumentSigner, PlanId, SigningOrder, SigningType } from "@/types";

const MAX_BYTES = 20 * 1024 * 1024;

type UserOrgRow = {
  org_id: string;
  email: string;
  organizations: {
    id: string;
    plan: PlanId;
    documents_used: number;
    documents_limit: number;
  } | null;
};

function parseBool(value: FormDataEntryValue | null, defaultValue: boolean): boolean {
  if (value === null || value === "") return defaultValue;
  return value === "true" || value === "1";
}

function parseSigningType(value: string | null): SigningType {
  if (value === "two_sided" || value === "self_sign") return value;
  return "one_sided";
}

function parseSigningOrder(value: string | null): SigningOrder {
  return value === "parallel" ? "parallel" : "sequential";
}

function buildSigner(
  name: string,
  email: string,
  order: number,
  phone?: string | null
): DocumentSigner {
  return {
    name,
    email,
    phone: phone ?? null,
    order,
    sign_url_token: randomUUID(),
    signed_at: null,
    status: "pending",
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("org_id, email, organizations(id, plan, documents_used, documents_limit)")
      .eq("id", user.id)
      .single<UserOrgRow>();

    if (userError || !userRow?.org_id) {
      return NextResponse.json(
        { error: "Нямате свързана организация." },
        { status: 400 }
      );
    }

    const orgId = userRow.org_id;
    const org = userRow.organizations;

    if (!org) {
      return NextResponse.json(
        { error: "Организацията не е намерена." },
        { status: 400 }
      );
    }

    if (org.documents_used >= org.documents_limit && org.plan === "free") {
      return NextResponse.json(
        { error: "Достигнахте лимита от 3 документа. Надградете плана си." },
        { status: 402 }
      );
    }

    if (org.documents_limit >= 0 && org.documents_used >= org.documents_limit) {
      return NextResponse.json(
        { error: "Достигнахте лимита на документи за вашия план." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const templateId = (formData.get("template_id") as string) || null;
    const dbTemplateId = (formData.get("db_template_id") as string) || null;
    const senderFieldValuesRaw = formData.get("sender_field_values") as
      | string
      | null;
    let senderFieldValues: Record<string, string> = {};
    if (senderFieldValuesRaw) {
      try {
        senderFieldValues = JSON.parse(senderFieldValuesRaw) as Record<
          string,
          string
        >;
      } catch {
        senderFieldValues = {};
      }
    }
    const title = (formData.get("title") as string)?.trim();
    const signingType = parseSigningType(
      (formData.get("signing_type") as string) || null
    );
    const signingOrder = parseSigningOrder(
      (formData.get("signing_order") as string) || null
    );
    const ttlHours = Number(formData.get("ttl_hours") ?? 48);
    const internalNote = (formData.get("internal_note") as string)?.trim() || null;
    const biometricRequired = parseBool(formData.get("biometric_required"), true);
    const attachedSignature = parseBool(formData.get("attached_signature"), true);
    const emailBothParties = parseBool(formData.get("email_both_parties"), true);
    const smsNotification = parseBool(formData.get("sms_notification"), false);

    if (!title) {
      return NextResponse.json(
        { error: "Заглавието е задължително." },
        { status: 400 }
      );
    }

    let recipientName = (formData.get("recipient_name") as string)?.trim() ?? "";
    let recipientEmail = (formData.get("recipient_email") as string)?.trim() ?? "";
    let recipientPhone =
      (formData.get("recipient_phone") as string)?.trim() || null;

    let signers: DocumentSigner[] = [];

    if (signingType === "self_sign") {
      const ownerName =
        (formData.get("owner_name") as string)?.trim() ||
        user.user_metadata?.full_name ||
        "Собственик";
      const ownerEmail = userRow.email ?? user.email ?? "";
      recipientName = ownerName;
      recipientEmail = ownerEmail;
      signers = [buildSigner(ownerName, ownerEmail, 1)];
    } else if (signingType === "two_sided") {
      const name1 = (formData.get("signer1_name") as string)?.trim();
      const email1 = (formData.get("signer1_email") as string)?.trim();
      const phone1 = (formData.get("signer1_phone") as string)?.trim() || null;
      const name2 = (formData.get("signer2_name") as string)?.trim();
      const email2 = (formData.get("signer2_email") as string)?.trim();
      const phone2 = (formData.get("signer2_phone") as string)?.trim() || null;

      if (!name1 || !email1 || !name2 || !email2) {
        return NextResponse.json(
          { error: "И двете страни трябва да имат име и имейл." },
          { status: 400 }
        );
      }

      signers = [
        buildSigner(name1, email1, 1, phone1),
        buildSigner(name2, email2, 2, phone2),
      ];
      recipientName = name1;
      recipientEmail = email1;
      recipientPhone = phone1;
    } else {
      if (!recipientEmail || !recipientName) {
        return NextResponse.json(
          { error: "Името и имейлът на получателя са задължителни." },
          { status: 400 }
        );
      }
      signers = [buildSigner(recipientName, recipientEmail, 1, recipientPhone)];
    }

    let pdfBytes: Uint8Array | null = null;
    let storedTemplateId: string | null = null;
    let recipientFieldsRequired = false;

    if (pdfFile instanceof File && pdfFile.size > 0) {
      if (pdfFile.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Позволени са само PDF файлове." },
          { status: 400 }
        );
      }
      if (pdfFile.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Файлът надвишава максималния размер от 20 MB." },
          { status: 400 }
        );
      }
      pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
    } else if (dbTemplateId) {
      const template = await fetchTemplateForPdf(dbTemplateId);
      if (!template) {
        return NextResponse.json(
          { error: "Шаблонът не е намерен." },
          { status: 400 }
        );
      }
      const html = buildFilledTemplateHtml(
        template.html_content,
        senderFieldValues
      );
      pdfBytes = await htmlToPdf(html);
      storedTemplateId = dbTemplateId;
      recipientFieldsRequired = template.fields.some(
        (f) => f.assigned_to === "recipient"
      );
    } else if (templateId && templateId !== "custom") {
      pdfBytes = await createPlaceholderPdf(templateId, title);
    } else {
      return NextResponse.json(
        { error: "Качете PDF файл или изберете шаблон." },
        { status: 400 }
      );
    }

    const documentId = randomUUID();
    const primaryToken =
      signingType === "self_sign"
        ? signers[0].sign_url_token
        : signingType === "two_sided" && signingOrder === "sequential"
          ? signers[0].sign_url_token
          : signers[0].sign_url_token;

    const expiresAt = new Date(
      Date.now() + ttlHours * 60 * 60 * 1000
    ).toISOString();
    const storagePath = `${orgId}/${documentId}/original.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Грешка при качване на файла: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabaseAdmin.from("documents").insert({
      id: documentId,
      org_id: orgId,
      title,
      file_path: storagePath,
      status: "pending",
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      ttl_hours: ttlHours,
      sign_url_token: primaryToken,
      signing_type: signingType,
      signers,
      signing_order: signingType === "two_sided" ? signingOrder : null,
      current_signer_index: 0,
      all_signed_at: null,
      biometric_required: biometricRequired,
      attached_signature: attachedSignature,
      internal_note: internalNote,
      created_at: new Date().toISOString(),
      signed_at: null,
      expires_at: expiresAt,
      template_id: storedTemplateId,
      recipient_fields_required: recipientFieldsRequired,
      recipient_fields_filled: false,
    });

    if (insertError) {
      await supabaseAdmin.storage.from("documents").remove([storagePath]);
      return NextResponse.json(
        { error: `Грешка при запис на документа: ${insertError.message}` },
        { status: 500 }
      );
    }

    const appUrl = getAppUrl();

    if (signingType === "self_sign") {
      const redirectUrl = `/documents/${documentId}/sign`;

      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

      await supabaseAdmin.from("audit_log").insert({
        org_id: orgId,
        document_id: documentId,
        event_type: "document.created",
        actor: user.email ?? "unknown",
        metadata: { signing_type: signingType, self_sign: true },
        ip_address: ip,
        created_at: new Date().toISOString(),
      });

      await supabaseAdmin
        .from("organizations")
        .update({ documents_used: org.documents_used + 1 })
        .eq("id", orgId);

      return NextResponse.json({
        id: documentId,
        self_sign: true,
        redirect_url: redirectUrl,
        sign_url_token: primaryToken,
        expires_at: expiresAt,
        status: "pending",
      });
    }

    const signUrl = `${appUrl}/sign/${primaryToken}`;
    const qrUrl = await generateQrForToken(primaryToken);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    await supabaseAdmin.from("audit_log").insert({
      org_id: orgId,
      document_id: documentId,
      event_type: "document.created",
      actor: user.email ?? "unknown",
      metadata: {
        signing_type: signingType,
        signing_order: signingOrder,
        email_both_parties: emailBothParties,
        sms_notification: smsNotification,
        ttl_hours: ttlHours,
      },
      ip_address: ip,
      created_at: new Date().toISOString(),
    });

    await supabaseAdmin
      .from("organizations")
      .update({ documents_used: org.documents_used + 1 })
      .eq("id", orgId);

    return NextResponse.json({
      id: documentId,
      qr_url: qrUrl,
      sign_url: signUrl,
      expires_at: expiresAt,
      token: primaryToken,
      signing_type: signingType,
    });
  } catch (error) {
    console.error("Document create error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
