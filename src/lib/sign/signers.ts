// signers — multi-signer helpers for documents.signers jsonb
import type {
  Document,
  DocumentSigner,
  SigningOrder,
  SigningType,
} from "@/types";

export function parseSigners(document: Document): DocumentSigner[] {
  if (!document.signers || !Array.isArray(document.signers)) return [];
  return document.signers as DocumentSigner[];
}

export function getSigningType(document: Document): SigningType {
  return document.signing_type ?? "one_sided";
}

export function getSigningOrder(document: Document): SigningOrder | null {
  return document.signing_order ?? null;
}

/** Resolve signer by public token (signers jsonb or legacy sign_url_token column). */
export function findSignerByToken(
  document: Document,
  token: string
): { signer: DocumentSigner; index: number } | null {
  const signers = parseSigners(document);

  if (signers.length > 0) {
    const index = signers.findIndex((s) => s.sign_url_token === token);
    if (index !== -1) {
      return { signer: signers[index], index };
    }
  }

  if (document.sign_url_token === token) {
    return {
      index: 0,
      signer: {
        name: document.recipient_name,
        email: document.recipient_email,
        phone: document.recipient_phone,
        order: 1,
        sign_url_token: token,
        signed_at: document.signed_at,
        status: document.status === "signed" ? "signed" : "pending",
      },
    };
  }

  return null;
}

export function getActiveSigners(document: Document): DocumentSigner[] {
  const signers = parseSigners(document);
  if (signers.length > 0) {
    return signers.sort((a, b) => a.order - b.order);
  }

  const found = findSignerByToken(document, document.sign_url_token);
  return found ? [found.signer] : [];
}

export function countSignedSigners(document: Document): number {
  return getActiveSigners(document).filter((s) => s.status === "signed").length;
}

export function getSigningProgress(document: Document): {
  signed: number;
  total: number;
} {
  const signers = getActiveSigners(document);
  return {
    signed: signers.filter((s) => s.status === "signed").length,
    total: signers.length || 1,
  };
}

export function allSignersSigned(document: Document): boolean {
  const signers = getActiveSigners(document);
  if (signers.length === 0) return document.status === "signed";
  return signers.every((s) => s.status === "signed");
}

/** Whether this signer may submit now (sequential turn or parallel). */
export function canSignerSignNow(document: Document, signerIndex: number): boolean {
  const signers = parseSigners(document);

  if (signers.length === 0) {
    return document.status === "pending";
  }

  const signer = signers[signerIndex];
  if (!signer || signer.status === "signed") return false;

  if (document.signing_order === "parallel") {
    return signer.status === "pending";
  }

  if (getSigningType(document) === "two_sided" && document.signing_order === "sequential") {
    return signerIndex === (document.current_signer_index ?? 0) && signer.status === "pending";
  }

  return signer.status === "pending";
}

export function formatSignersSummary(document: Document): string {
  const signers = getActiveSigners(document);
  return signers
    .map((s) => {
      const icon = s.status === "signed" ? "✓" : "⏳";
      return `${s.name} ${icon}`;
    })
    .join(" · ");
}

export function getSignerContextLabel(
  document: Document,
  signerIndex: number
): string | null {
  const signingType = getSigningType(document);
  const total = getActiveSigners(document).length;

  if (signingType === "two_sided" && total > 1) {
    return `Подписвате като Страна ${signerIndex + 1} от ${total}`;
  }
  if (signingType === "self_sign") {
    return "Подписвате собствен документ";
  }
  return null;
}

/** Active sign URL for pending documents (current signer in sequential flow). */
export function getPendingSignUrl(
  document: Document,
  appUrl: string
): string {
  const signingType = getSigningType(document);

  if (signingType === "self_sign") {
    return `${appUrl}/documents/${document.id}/sign`;
  }

  const signers = parseSigners(document);
  if (signingType === "two_sided" && signers.length > 0) {
    const idx = document.current_signer_index ?? 0;
    const current = signers[idx] ?? signers.find((s) => s.status === "pending");
    const token = current?.sign_url_token ?? document.sign_url_token;
    return `${appUrl}/sign/${token}`;
  }

  return `${appUrl}/sign/${document.sign_url_token}`;
}

export function getProgressLabel(document: Document): string | null {
  const { signed, total } = getSigningProgress(document);
  if (getSigningType(document) !== "two_sided" || total <= 1) return null;
  if (signed === 0) return null;
  return `${signed} от ${total} подписи завършени`;
}
