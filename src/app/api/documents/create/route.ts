// POST /api/documents/create — upload PDF, insert document, generate QR, audit log
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createPlaceholderPdf } from "@/lib/pdf/create-placeholder-pdf";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/types";

const MAX_BYTES = 20 * 1024 * 1024;

type UserOrgRow = {
  org_id: string;
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

    console.log("Step 1: user found", user.id);

    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("org_id, organizations(id, plan, documents_used, documents_limit)")
      .eq("id", user.id)
      .single<UserOrgRow>();

    console.log("Step 2: userRow", userRow, "error", userError);

    if (userError) {
      return NextResponse.json(
        { error: `Грешка при зареждане на профила: ${userError.message}` },
        { status: 500 }
      );
    }

    if (!userRow?.org_id) {
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
        {
          error:
            "Достигнахте лимита от 3 документа. Надградете плана си.",
        },
        { status: 402 }
      );
    }

    if (org.documents_limit >= 0 && org.documents_used >= org.documents_limit) {
      return NextResponse.json(
        { error: "Достигнахте лимита на документи за вашия план." },
        { status: 403 }
      );
    }

    console.log("Step 3: parsing form data");

    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const templateId = (formData.get("template_id") as string) || null;
    const title = (formData.get("title") as string)?.trim();
    const recipientEmail = (formData.get("recipient_email") as string)?.trim();
    const recipientName = (formData.get("recipient_name") as string)?.trim();
    const recipientPhone =
      (formData.get("recipient_phone") as string)?.trim() || null;
    const ttlHours = Number(formData.get("ttl_hours") ?? 24);
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
    const storagePath = `${orgId}/${documentId}/original.pdf`;

    console.log("Step 4: uploading to storage", storagePath);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Грешка при качване на файла: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log("Step 5: inserting document");

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
      sign_url_token: signUrlToken,
      biometric_required: biometricRequired,
      attached_signature: attachedSignature,
      internal_note: internalNote,
      created_at: new Date().toISOString(),
      signed_at: null,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Document insert error:", insertError);
      await supabaseAdmin.storage.from("documents").remove([storagePath]);
      return NextResponse.json(
        { error: `Грешка при запис на документа: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log("Step 6: generating QR");

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_APP_URL_LOCAL ?? "http://localhost:3000"
        : "https://sign.runverifiedapp.com");
    const signUrl = `${appUrl}/sign/${signUrlToken}`;
    console.log("Sign URL for QR:", signUrl);
    const qrUrl = await QRCode.toDataURL(signUrl, { width: 320, margin: 1 });

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    console.log("Step 7: audit log + org counter");

    await supabaseAdmin.from("audit_log").insert({
      org_id: orgId,
      document_id: documentId,
      event_type: "document.created",
      actor: user.email ?? "unknown",
      metadata: {
        template_id: templateId,
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

    console.log("Step 8: success", documentId);

    return NextResponse.json({
      id: documentId,
      qr_url: qrUrl,
      sign_url: signUrl,
      expires_at: expiresAt,
      token: signUrlToken,
    });
  } catch (error) {
    console.error("Document create error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
