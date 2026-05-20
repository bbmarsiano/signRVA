// POST /api/documents/create — upload PDF, insert document, generate QR, audit log
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { getAppUrl } from "@/lib/app-url";
import { createPlaceholderPdf } from "@/lib/pdf/create-placeholder-pdf";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 20 * 1024 * 1024;

function parseBool(value: FormDataEntryValue | null, defaultValue: boolean): boolean {
  if (value === null || value === "") return defaultValue;
  return value === "true" || value === "1";
}

export async function POST(request: Request) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const { user, organization } = session;

  if (organization.documents_used >= organization.documents_limit) {
    return NextResponse.json(
      { error: "Достигнахте лимита на документи за вашия план." },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const pdfFile = formData.get("pdf");
  const templateId = (formData.get("template_id") as string) || null;
  const title = (formData.get("title") as string)?.trim();
  const recipientEmail = (formData.get("recipient_email") as string)?.trim();
  const recipientName = (formData.get("recipient_name") as string)?.trim();
  const recipientPhone = (formData.get("recipient_phone") as string)?.trim() || null;
  const ttlHours = Number(formData.get("ttl_hours") ?? 24);
  const internalNote = (formData.get("internal_note") as string)?.trim() || null;
  const biometricRequired = parseBool(formData.get("biometric_required"), true);
  const attachedSignature = parseBool(formData.get("attached_signature"), true);
  const emailBothParties = parseBool(formData.get("email_both_parties"), true);
  const smsNotification = parseBool(formData.get("sms_notification"), false);

  if (!title) {
    return NextResponse.json({ error: "Заглавието е задължително." }, { status: 400 });
  }

  if (!recipientEmail || !recipientName) {
    return NextResponse.json(
      { error: "Името и имейлът на получателя са задължителни." },
      { status: 400 }
    );
  }

  let pdfBytes: Uint8Array | null = null;

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
  } else if (templateId && templateId !== "custom") {
    pdfBytes = await createPlaceholderPdf(templateId, title);
  } else {
    return NextResponse.json(
      { error: "Качете PDF файл или изберете шаблон." },
      { status: 400 }
    );
  }

  const documentId = randomUUID();
  const signUrlToken = randomUUID();
  const expiresAt = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000
  ).toISOString();
  const storagePath = `${organization.id}/${documentId}/original.pdf`;

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Грешка при качване на файла." },
      { status: 500 }
    );
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    org_id: organization.id,
    title,
    file_path: storagePath,
    status: "pending",
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    ttl_hours: ttlHours,
    sign_url_token: signUrlToken,
    biometric_required: biometricRequired,
    attached_signature: attachedSignature,
    internal_note: internalNote,
    created_at: new Date().toISOString(),
    signed_at: null,
    expires_at: expiresAt,
  });

  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json(
      { error: "Грешка при запис на документа." },
      { status: 500 }
    );
  }

  const signUrl = `${getAppUrl()}/sign/${signUrlToken}`;
  const qrUrl = await QRCode.toDataURL(signUrl, { width: 320, margin: 1 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  await supabase.from("audit_log").insert({
    org_id: organization.id,
    document_id: documentId,
    event_type: "document.created",
    actor: user.email,
    metadata: {
      template_id: templateId,
      email_both_parties: emailBothParties,
      sms_notification: smsNotification,
      ttl_hours: ttlHours,
    },
    ip_address: ip,
    created_at: new Date().toISOString(),
  });

  await supabase
    .from("organizations")
    .update({ documents_used: organization.documents_used + 1 })
    .eq("id", organization.id);

  return NextResponse.json({
    id: documentId,
    qr_url: qrUrl,
    sign_url: signUrl,
    expires_at: expiresAt,
    token: signUrlToken,
  });
}
