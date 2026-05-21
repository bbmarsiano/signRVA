// POST /api/documents/send — email signing invite to recipient via Resend
import { NextResponse } from "next/server";
import { sendSigningInvite, buildSignUrl } from "@/lib/email/send-document";
import { getPendingSignUrl, getSigningType, parseSigners } from "@/lib/sign/signers";
import { getAppUrl } from "@/lib/app-url";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types";

export async function POST(request: Request) {
  try {
    console.log("[documents/send] POST /api/documents/send");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const documentId = body?.document_id as string | undefined;

    if (!documentId) {
      return NextResponse.json({ error: "Липсва document_id." }, { status: 400 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userRow?.org_id) {
      return NextResponse.json(
        { error: "Нямате свързана организация." },
        { status: 400 }
      );
    }

    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("org_id", userRow.org_id)
      .single<Document>();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Документът не е намерен." },
        { status: 404 }
      );
    }

    const signingType = getSigningType(document);

    if (signingType === "self_sign") {
      return NextResponse.json(
        { error: "Самоподписът не изисква изпращане на покана." },
        { status: 400 }
      );
    }

    const appUrl = getAppUrl();
    const parsedSigners = parseSigners(document);
    let signersToEmail: {
      name: string;
      email: string;
      sign_url_token: string;
    }[];

    if (signingType === "two_sided" && parsedSigners.length > 0) {
      if (document.signing_order === "parallel") {
        signersToEmail = parsedSigners.filter((s) => s.status === "pending");
      } else {
        const idx = document.current_signer_index ?? 0;
        const current = parsedSigners[idx];
        signersToEmail =
          current && current.status === "pending" ? [current] : [];
      }
    } else if (parsedSigners.length > 0) {
      signersToEmail = parsedSigners.filter((s) => s.status === "pending");
    } else {
      signersToEmail = [
        {
          name: document.recipient_name,
          email: document.recipient_email,
          sign_url_token: document.sign_url_token,
        },
      ];
    }

    let emailSent = false;
    let warning: string | undefined;

    console.log("Resend API Key exists:", !!process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "[documents/send] RESEND_API_KEY missing — skipping email, QR link still valid"
      );
      warning =
        "Имейлът не беше изпратен (липсва конфигурация). Споделете линка или QR кода ръчно.";
    } else {
      try {
        for (const signer of signersToEmail) {
          await sendSigningInvite({
            recipientEmail: signer.email,
            recipientName: signer.name,
            title: document.title,
            signUrl: buildSignUrl(signer.sign_url_token),
            expiresAt: document.expires_at,
          });
        }
        emailSent = true;
        console.log("[documents/send] Invitation email(s) sent successfully");
      } catch (err) {
        console.error("[documents/send] Resend error:", err);
        return NextResponse.json(
          { error: "Грешка при изпращане на имейла." },
          { status: 500 }
        );
      }
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    await supabaseAdmin.from("audit_log").insert({
      org_id: userRow.org_id,
      document_id: documentId,
      event_type: "document.sent",
      actor: user.email ?? "unknown",
      metadata: {
        email_sent: emailSent,
        sign_url: getPendingSignUrl(document, appUrl),
        signing_type: signingType,
      },
      ip_address: ip,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      warning,
    });
  } catch (error) {
    console.error("Document send error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
