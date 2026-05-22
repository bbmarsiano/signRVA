// combined-p7s — multi-signer .p7s v2.0 bundle for verification and email
import type { Document, Signature } from "@/types";

export const COMBINED_P7S_PATH = (documentId: string) =>
  `signatures/${documentId}/combined-signatures.p7s`;

export type CombinedP7sSigner = {
  signer_index: number;
  signed_by: string;
  signed_at: string;
  ip_address: string;
  user_agent: string;
  canvas_hash: string | null;
  document_hash: string | null;
};

export type CombinedP7sPayload = {
  version: "2.0";
  type: "combined-signature";
  document_id: string;
  document_title: string;
  total_signers: number;
  all_signed_at: string;
  signers: CombinedP7sSigner[];
  document_hash_final: string | null;
};

export function buildCombinedP7s(
  document: Pick<Document, "id" | "title">,
  allSignatures: Signature[],
  documentHashFinal: string | null
): CombinedP7sPayload {
  const lastTs =
    allSignatures[allSignatures.length - 1]?.timestamp ??
    new Date().toISOString();

  return {
    version: "2.0",
    type: "combined-signature",
    document_id: document.id,
    document_title: document.title,
    total_signers: allSignatures.length,
    all_signed_at: lastTs,
    signers: allSignatures.map((sig, i) => ({
      signer_index: i,
      signed_by: sig.signer_name?.trim() || `Страна ${i + 1}`,
      signed_at: sig.timestamp,
      ip_address: sig.ip_address,
      user_agent: sig.user_agent,
      canvas_hash: sig.canvas_hash,
      document_hash: sig.document_hash,
    })),
    document_hash_final: documentHashFinal,
  };
}
