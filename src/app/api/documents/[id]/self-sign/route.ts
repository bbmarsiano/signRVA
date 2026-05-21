// POST /api/documents/[id]/self-sign — authenticated self-signing flow
import { NextResponse } from "next/server";
import { processDocumentSignature } from "@/lib/sign/process-signature";
import { getSigningType } from "@/lib/sign/signers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BiometricType, Document } from "@/types";

function parseBiometricType(value: string | null): BiometricType {
  if (value === "face_id" || value === "touch_id") return value;
  return "none";
}

function base64ToUint8Array(base64: string): Uint8Array {
  const raw = base64.replace(/^data:image\/png;base64,/, "");
  return new Uint8Array(Buffer.from(raw, "base64"));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("org_id, email")
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
      .eq("id", id)
      .eq("org_id", userRow.org_id)
      .single<Document>();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Документът не е намерен." },
        { status: 404 }
      );
    }

    if (getSigningType(document) !== "self_sign") {
      return NextResponse.json(
        { error: "Този документ не е за самоподпис." },
        { status: 400 }
      );
    }

    if (document.status === "signed") {
      return NextResponse.json(
        { error: "Документът вече е подписан." },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const canvasData = formData.get("canvas_data") as string | null;

    if (!canvasData) {
      return NextResponse.json({ error: "Липсва подпис." }, { status: 400 });
    }

    const token = document.sign_url_token;
    const signedAt = new Date();
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    const result = await processDocumentSignature({
      document,
      orgId: userRow.org_id,
      token,
      signaturePng: base64ToUint8Array(canvasData),
      canvasDataBase64: canvasData,
      signedAt,
      ipAddress,
      userAgent,
      biometricType: parseBiometricType(
        formData.get("biometric_type") as string | null
      ),
      webauthnCredentialId: null,
    });

    return NextResponse.json({
      success: true,
      signed_pdf_url: result.signedPdfUrl,
      signed_at: result.signedAtIso,
      document_id: document.id,
    });
  } catch (error) {
    console.error("Self-sign error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
