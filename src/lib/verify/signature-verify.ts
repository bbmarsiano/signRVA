// signature-verify — public document authenticity checks
import type { Document, Signature } from "@/types";

export type P7sPayload = {
  version?: string;
  type?: string;
  document_id?: string;
  signer_index?: number;
  signed_by?: string;
  signed_at?: string;
  ip_address?: string;
  user_agent?: string;
  canvas_hash?: string;
  document_hash?: string;
  total_signers?: number;
};

export type P7sParseResult = {
  p7sArray: P7sPayload[];
  formatVersion: "1.0" | "2.0" | null;
  parseFailed: boolean;
};

export type VerificationResults = {
  documentExists: boolean;
  isSigned: boolean;
  idMatch: boolean;
  p7sValid: boolean;
  canvasHashPresent: boolean;
  documentHashPresent: boolean;
  canvasHashMatchDb: boolean;
  documentHashMatchDb: boolean;
  tamperedWarning: boolean;
  invalidP7s: boolean;
  p7sSignerIndex: number;
};

function isSha256Hex(value: string | undefined): boolean {
  return !!value && /^[a-f0-9]{64}$/i.test(value);
}

function flattenCombinedP7s(
  combined: Record<string, unknown>
): P7sPayload[] {
  const signers = combined.signers;
  if (!Array.isArray(signers)) return [];
  const documentId = combined.document_id as string | undefined;
  return signers.map((s, i) => {
    const entry = s as Record<string, unknown>;
    return {
      version: "2.0",
      type: "combined-signature",
      document_id: documentId,
      total_signers: combined.total_signers as number | undefined,
      signer_index:
        typeof entry.signer_index === "number" ? entry.signer_index : i,
      signed_by: entry.signed_by as string | undefined,
      signed_at: entry.signed_at as string | undefined,
      ip_address: entry.ip_address as string | undefined,
      user_agent: entry.user_agent as string | undefined,
      canvas_hash: entry.canvas_hash as string | undefined,
      document_hash: entry.document_hash as string | undefined,
    };
  });
}

function normalizeUploadedItem(item: Record<string, unknown>): P7sPayload[] {
  if (item.version === "2.0" && Array.isArray(item.signers)) {
    return flattenCombinedP7s(item);
  }
  return [item as P7sPayload];
}

export function parseP7sFromParam(p7sParam: string | undefined): P7sParseResult {
  if (!p7sParam) {
    return { p7sArray: [], formatVersion: null, parseFailed: false };
  }
  try {
    const decoded = Buffer.from(
      decodeURIComponent(p7sParam),
      "base64"
    ).toString("utf-8");
    const parsed = JSON.parse(decoded) as
      | P7sPayload
      | P7sPayload[]
      | Record<string, unknown>;

    if (Array.isArray(parsed)) {
      const p7sArray = parsed.flatMap((d) =>
        normalizeUploadedItem(d as Record<string, unknown>)
      );
      const formatVersion =
        parsed.some((d) => (d as P7sPayload).version === "2.0") ||
        p7sArray.some((p) => p.version === "2.0")
          ? "2.0"
          : p7sArray.length > 0
            ? "1.0"
            : null;
      return { p7sArray, formatVersion, parseFailed: false };
    }

    const obj = parsed as Record<string, unknown>;
    if (obj.version === "2.0") {
      const p7sArray = flattenCombinedP7s(obj);
      return {
        p7sArray,
        formatVersion: "2.0",
        parseFailed: p7sArray.length === 0,
      };
    }

    return {
      p7sArray: [parsed as P7sPayload],
      formatVersion: "1.0",
      parseFailed: false,
    };
  } catch {
    return { p7sArray: [], formatVersion: null, parseFailed: true };
  }
}

export function parseP7sArray(p7sParam: string | undefined): P7sPayload[] {
  return parseP7sFromParam(p7sParam).p7sArray;
}

export function parseP7sParam(p7sParam: string | undefined): P7sPayload | null {
  return parseP7sArray(p7sParam)[0] ?? null;
}

export function isP7sEntryValid(p: P7sPayload): boolean {
  if (!p.document_id) return false;
  if (p.version === "2.0") {
    return isSha256Hex(p.canvas_hash);
  }
  return !!(
    p.version &&
    p.signed_by &&
    p.signed_at &&
    isSha256Hex(p.canvas_hash)
  );
}

export function isRawP7sUploadValid(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Record<string, unknown>;
  if (o.version === "2.0") {
    return (
      !!o.document_id &&
      Array.isArray(o.signers) &&
      (o.signers as unknown[]).length > 0
    );
  }
  if (Array.isArray(parsed)) {
    return parsed.length > 0 && parsed.every((item) => isRawP7sUploadValid(item));
  }
  return !!(
    o.version &&
    o.document_id &&
    (o.canvas_hash || (o.signed_by && o.signed_at))
  );
}

export function findP7sForSignature(
  sig: Signature,
  signerIndex: number,
  p7sArray: P7sPayload[]
): P7sPayload | null {
  return (
    p7sArray.find(
      (p) =>
        (typeof p.signer_index === "number" &&
          p.signer_index === signerIndex) ||
        (p.canvas_hash &&
          sig.canvas_hash &&
          p.canvas_hash === sig.canvas_hash) ||
        (p.document_hash &&
          sig.document_hash &&
          p.document_hash === sig.document_hash)
    ) ?? null
  );
}

function findSignatureForP7s(
  signatures: Signature[] | null | undefined,
  p7sData: P7sPayload | null,
  fallback: Signature | null
): Signature | null {
  if (!p7sData || !signatures?.length) return fallback;
  if (typeof p7sData.signer_index === "number") {
    const byIndex = signatures[p7sData.signer_index];
    if (byIndex) return byIndex;
  }
  if (p7sData.canvas_hash) {
    const match = signatures.find(
      (s) => s.canvas_hash && s.canvas_hash === p7sData.canvas_hash
    );
    if (match) return match;
  }
  return fallback;
}

export function verifyP7sArray(
  doc: Pick<Document, "id" | "status"> | null,
  signatures: Signature[],
  p7sArray: P7sPayload[],
  options?: { parseFailed?: boolean }
): VerificationResults {
  if (!p7sArray.length) {
    const empty = verifySignature(doc, signatures[0] ?? null, null, signatures);
    if (options?.parseFailed) {
      empty.invalidP7s = true;
      empty.tamperedWarning = true;
    }
    return empty;
  }

  const primary = p7sArray[0];
  const base = verifySignature(
    doc,
    signatures[0] ?? null,
    primary,
    signatures
  );

  base.invalidP7s = p7sArray.some(
    (p) => !!doc && !!p.document_id && p.document_id !== doc.id
  );

  base.p7sValid = p7sArray.every((p) => isP7sEntryValid(p));

  base.idMatch =
    !!doc && p7sArray.every((p) => !p.document_id || p.document_id === doc.id);

  const hashMatches = p7sArray.map((p) => {
    const sig = findSignatureForP7s(signatures, p, null);
    return {
      canvas:
        !!sig?.canvas_hash &&
        !!p.canvas_hash &&
        sig.canvas_hash === p.canvas_hash,
      document:
        !!sig?.document_hash &&
        !!p.document_hash &&
        sig.document_hash === p.document_hash,
    };
  });

  base.canvasHashPresent = p7sArray.every((p) => isSha256Hex(p.canvas_hash));
  base.documentHashPresent = p7sArray.every((p) =>
    isSha256Hex(p.document_hash)
  );
  base.canvasHashMatchDb = hashMatches.some((m) => m.canvas);
  base.documentHashMatchDb = hashMatches.some((m) => m.document);

  const matchedSigners = signatures.filter((s, i) =>
    findP7sForSignature(s, i, p7sArray)
  ).length;

  base.p7sSignerIndex =
    typeof primary.signer_index === "number"
      ? primary.signer_index
      : primary.canvas_hash && signatures.length > 0
        ? signatures.findIndex(
            (s) => s.canvas_hash && s.canvas_hash === primary.canvas_hash
          )
        : -1;

  const allSignersCovered =
    signatures.length === 0 || matchedSigners >= signatures.length;

  base.tamperedWarning =
    !base.invalidP7s &&
    (options?.parseFailed ||
      (p7sArray.length > 0 &&
        (!base.p7sValid ||
          (signatures.length > 0 && !allSignersCovered))));

  return base;
}

export function verifySignature(
  doc: Pick<Document, "id" | "status"> | null,
  sig: Signature | null,
  p7sData: P7sPayload | null,
  allSignatures?: Signature[] | null
): VerificationResults {
  const signatures = allSignatures ?? (sig ? [sig] : []);
  const sigForHash = findSignatureForP7s(signatures, p7sData, sig);

  const p7sSignerIndex =
    typeof p7sData?.signer_index === "number"
      ? p7sData.signer_index
      : p7sData?.canvas_hash && signatures.length > 0
        ? signatures.findIndex(
            (s) => s.canvas_hash && s.canvas_hash === p7sData.canvas_hash
          )
        : -1;

  if (!p7sData) {
    return {
      documentExists: !!doc,
      isSigned: doc?.status === "signed",
      idMatch: false,
      p7sValid: false,
      canvasHashPresent: false,
      documentHashPresent: false,
      canvasHashMatchDb: false,
      documentHashMatchDb: false,
      tamperedWarning: false,
      invalidP7s: false,
      p7sSignerIndex: -1,
    };
  }

  const idMatch = !!doc && p7sData.document_id === doc.id;
  const p7sValid = isP7sEntryValid(p7sData);
  const canvasHashPresent = isSha256Hex(p7sData.canvas_hash);
  const documentHashPresent = isSha256Hex(p7sData.document_hash);

  const canvasHashMatchDb =
    !!sigForHash?.canvas_hash &&
    !!p7sData.canvas_hash &&
    sigForHash.canvas_hash === p7sData.canvas_hash;
  const documentHashMatchDb =
    !!sigForHash?.document_hash &&
    !!p7sData.document_hash &&
    sigForHash.document_hash === p7sData.document_hash;

  const results: VerificationResults = {
    documentExists: !!doc,
    isSigned: doc?.status === "signed",
    idMatch,
    p7sValid,
    canvasHashPresent,
    documentHashPresent,
    canvasHashMatchDb,
    documentHashMatchDb,
    tamperedWarning: false,
    invalidP7s: !!doc && !idMatch,
    p7sSignerIndex,
  };

  results.tamperedWarning =
    idMatch && (!p7sValid || !canvasHashPresent);

  return results;
}

export function signerDisplayName(
  sig: Signature | null,
  p7sData: P7sPayload | null
): string {
  if (p7sData?.signed_by) return p7sData.signed_by;
  if (sig?.signer_name) return sig.signer_name;
  if (!sig) return "Верифицирано лице";
  const device = sig.device_info as { biometric_type?: string } | null;
  if (device?.biometric_type && device.biometric_type !== "none") {
    const labels: Record<string, string> = {
      face_id: "Face ID",
      touch_id: "Touch ID",
    };
    return labels[device.biometric_type] ?? "Верифицирано лице";
  }
  if (sig.user_agent) {
    const ua = sig.user_agent;
    if (ua.length > 48) return `${ua.slice(0, 45)}…`;
    return ua;
  }
  return "Верифицирано лице";
}

export function formatVerifyDateTime(iso: string): string {
  return new Date(iso).toLocaleString("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** @deprecated Use formatVerifyDateTime */
export function formatSignatureTimestamp(iso: string): string {
  return formatVerifyDateTime(iso);
}

export function signingSummary(
  signatures: Signature[],
  signedAt: string | null | undefined
): string {
  const lastTs =
    signatures[signatures.length - 1]?.timestamp ?? signedAt ?? null;
  if (!lastTs) return "—";
  const dateStr = formatSignatureTimestamp(lastTs);

  if (signatures.length === 1) {
    return `Подписан от 1 страна на ${dateStr}`;
  }
  if (signatures.length > 1) {
    return `Подписан от ${signatures.length} страни — последен подпис на ${dateStr}`;
  }
  return signedAt ? formatSignatureTimestamp(signedAt) : "—";
}
