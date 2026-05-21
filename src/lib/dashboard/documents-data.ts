// documents-data — shared Supabase queries for dashboard and documents pages
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Document, DocumentStatus } from "@/types";

export async function getOrgIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("org_id")
    .eq("id", userId)
    .single();
  return data?.org_id ?? null;
}

export async function fetchDocumentsByOrg(orgId: string): Promise<Document[]> {
  if (!orgId) return [];

  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Documents fetch error:", error);
    return [];
  }

  return (data as Document[]) ?? [];
}

export function countDocumentsByStatus(documents: Pick<Document, "status">[]) {
  const counts: Record<DocumentStatus, number> = {
    pending: 0,
    signed: 0,
    expired: 0,
  };
  for (const doc of documents) {
    counts[doc.status] += 1;
  }
  return {
    total: documents.length,
    ...counts,
  };
}
