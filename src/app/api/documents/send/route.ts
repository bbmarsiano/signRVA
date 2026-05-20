// POST /api/documents/send — send signing invite email via Resend
import { NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/dashboard/session";
import { sendDocumentInvite, buildSignUrl } from "@/lib/email/send-document";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types";

export async function POST(request: Request) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const documentId = body?.document_id as string | undefined;
  const emailBothParties = body?.email_both_parties !== false;

  if (!documentId) {
    return NextResponse.json({ error: "Липсва document_id." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("org_id", session.organization.id)
    .single<Document>();

  if (error || !document) {
    return NextResponse.json({ error: "Документът не е намерен." }, { status: 404 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Имейл услугата не е конфигурирана." },
      { status: 500 }
    );
  }

  try {
    await sendDocumentInvite({
      recipientEmail: document.recipient_email,
      recipientName: document.recipient_name,
      senderEmail: session.user.email,
      title: document.title,
      signUrl: buildSignUrl(document.sign_url_token),
      emailBothParties,
    });
  } catch {
    return NextResponse.json(
      { error: "Грешка при изпращане на имейла." },
      { status: 500 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  await supabase.from("audit_log").insert({
    org_id: session.organization.id,
    document_id: documentId,
    event_type: "document.sent",
    actor: session.user.email,
    metadata: { email_both_parties: emailBothParties },
    ip_address: ip,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
