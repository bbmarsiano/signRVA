// Verify by document ID — public authenticity check
import VerifyDetail from "@/components/verify/VerifyDetail";
import {
  formatVerifyDateTime,
  parseP7sFromParam,
  verifyP7sArray,
} from "@/lib/verify/signature-verify";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Document, Signature } from "@/types";

const DOC_SELECT =
  "id, title, status, signed_at, created_at, expires_at, org_id, organizations(name)";

type DocQueryRow = Pick<
  Document,
  "id" | "title" | "status" | "signed_at" | "created_at" | "expires_at" | "org_id"
> & {
  organizations: { name: string } | { name: string }[] | null;
};

function mapDocRow(row: DocQueryRow) {
  const org = row.organizations;
  const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
  return { ...row, orgName: orgName ?? undefined };
}

async function fetchDocument(id: string) {
  let { data: doc } = await supabaseAdmin
    .from("documents")
    .select(DOC_SELECT)
    .eq("id", id)
    .maybeSingle<DocQueryRow>();

  if (!doc && id.length <= 8) {
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select(DOC_SELECT)
      .ilike("id", `${id}%`)
      .limit(1);

    doc = (docs?.[0] as DocQueryRow | undefined) ?? null;

    if (!doc) {
      const { data: rpcRows } = await supabaseAdmin.rpc(
        "find_document_for_verify",
        { p_id: id }
      );
      const rpcRow = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as {
        id: string;
        title: string;
        status: Document["status"];
        signed_at: string | null;
        created_at: string;
        expires_at: string;
        org_id: string;
        org_name: string | null;
      } | null;

      if (rpcRow) {
        return {
          id: rpcRow.id,
          title: rpcRow.title,
          status: rpcRow.status,
          signed_at: rpcRow.signed_at,
          created_at: rpcRow.created_at,
          expires_at: rpcRow.expires_at,
          org_id: rpcRow.org_id,
          orgName: rpcRow.org_name ?? undefined,
        };
      }
    }
  }

  return doc ? mapDocRow(doc) : null;
}

export default async function VerifyDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p7s?: string }>;
}) {
  const { id: idParam } = await params;
  const { p7s: p7sParam } = await searchParams;
  const id = decodeURIComponent(idParam).trim();

  const doc = await fetchDocument(id);

  let signatures: Signature[] = [];
  if (doc) {
    const { data } = await supabaseAdmin
      .from("signatures")
      .select("*")
      .eq("document_id", doc.id)
      .order("timestamp", { ascending: true });

    signatures = data ?? [];
  }

  const { p7sArray, formatVersion, parseFailed } = parseP7sFromParam(p7sParam);
  const verification = verifyP7sArray(doc, signatures, p7sArray, {
    parseFailed,
  });

  const verifiedAt = formatVerifyDateTime(new Date().toISOString());

  return (
    <VerifyDetail
      docId={doc?.id ?? id}
      found={verification.documentExists}
      title={doc?.title}
      status={doc?.status}
      signedAt={doc?.signed_at}
      expiresAt={doc?.expires_at}
      orgName={doc?.orgName}
      signatures={signatures}
      verification={verification}
      hasP7s={p7sArray.length > 0}
      p7sArray={p7sArray}
      p7sFormatVersion={formatVersion}
      verifiedAt={verifiedAt}
    />
  );
}
