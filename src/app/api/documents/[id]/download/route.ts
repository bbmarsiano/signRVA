// GET /api/documents/[id]/download — authenticated signed PDF download URL (7 days)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL = 604800; // 7 days

export async function GET(
  _request: Request,
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
      .select("id, org_id, status, title")
      .eq("id", id)
      .eq("org_id", userRow.org_id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Документът не е намерен." },
        { status: 404 }
      );
    }

    if (document.status !== "signed") {
      return NextResponse.json(
        { error: "Документът все още не е подписан." },
        { status: 400 }
      );
    }

    const signedPath = `${userRow.org_id}/${document.id}/signed.pdf`;
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(signedPath, SIGNED_URL_TTL);

    if (urlError || !urlData?.signedUrl) {
      return NextResponse.json(
        { error: "Подписаният PDF не е наличен." },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: urlData.signedUrl });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
