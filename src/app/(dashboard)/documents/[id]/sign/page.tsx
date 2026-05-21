// Self-sign page — authenticated immediate signing for self_sign documents
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import SelfSignForm from "@/components/documents/SelfSignForm";
import { getSigningType } from "@/lib/sign/signers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types";

export const dynamic = "force-dynamic";

export default async function DocumentSelfSignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userRow?.org_id) {
    redirect("/documents");
  }

  const { data: document } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("org_id", userRow.org_id)
    .single<Document>();

  if (!document) {
    notFound();
  }

  if (getSigningType(document) !== "self_sign") {
    redirect(`/documents`);
  }

  if (document.status === "signed") {
    redirect("/documents");
  }

  const { data: preview } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(document.file_path, 3600);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Самоподпис</h2>
          <p className="mt-1 text-sm text-zinc-500">{document.title}</p>
        </div>
        <Link
          href="/documents"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← Назад
        </Link>
      </div>

      <SelfSignForm
        documentId={document.id}
        title={document.title}
        previewUrl={preview?.signedUrl ?? null}
      />
    </div>
  );
}
