// BiometricButton — Face ID / Touch ID via WebAuthn when available
"use client";

import { useEffect, useState } from "react";
import { IconFaceId, IconFingerprint } from "@tabler/icons-react";
import { startAuthentication } from "@simplewebauthn/browser";
import type { BiometricType } from "@/types";

const PRIMARY = "#0F6E56";
const ACTIVE_BG = "#E1F5EE";
const ACTIVE_TEXT = "#085041";

export default function BiometricButton({
  token,
  value,
  onChange,
}: {
  token: string;
  value: BiometricType;
  onChange: (type: BiometricType, credentialJson?: string) => void;
}) {
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false);
  const [loading, setLoading] = useState<BiometricType | null>(null);

  useEffect(() => {
    setWebAuthnAvailable(
      typeof window !== "undefined" &&
        !!window.PublicKeyCredential &&
        typeof window.PublicKeyCredential === "function"
    );
  }, []);

  if (!webAuthnAvailable) return null;

  async function handleSelect(type: BiometricType) {
    setLoading(type);
    try {
      const res = await fetch(`/api/sign/${token}/webauthn`);
      if (res.ok) {
        const options = await res.json();
        const credential = await startAuthentication({ optionsJSON: options });
        onChange(type, JSON.stringify(credential));
      } else {
        onChange(type);
      }
    } catch {
      onChange(type);
    } finally {
      setLoading(null);
    }
  }

  const btnClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
      active ? "" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
    }`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={loading !== null}
        className={btnClass(value === "face_id")}
        style={
          value === "face_id"
            ? {
                borderColor: PRIMARY,
                backgroundColor: ACTIVE_BG,
                color: ACTIVE_TEXT,
              }
            : undefined
        }
        onClick={() => void handleSelect("face_id")}
      >
        <IconFaceId size={22} stroke={1.75} />
        {loading === "face_id" ? "..." : "Face ID"}
      </button>
      <button
        type="button"
        disabled={loading !== null}
        className={btnClass(value === "touch_id")}
        style={
          value === "touch_id"
            ? {
                borderColor: PRIMARY,
                backgroundColor: ACTIVE_BG,
                color: ACTIVE_TEXT,
              }
            : undefined
        }
        onClick={() => void handleSelect("touch_id")}
      >
        <IconFingerprint size={22} stroke={1.75} />
        {loading === "touch_id" ? "..." : "Touch ID"}
      </button>
    </div>
  );
}
