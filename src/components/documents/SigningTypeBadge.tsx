// SigningTypeBadge — signing flow label and progress for document lists
import {
  getSigningProgress,
  getSigningType,
} from "@/lib/sign/signers";
import type { Document } from "@/types";

export default function SigningTypeBadge({ document }: { document: Document }) {
  const signingType = getSigningType(document);
  const { signed, total } = getSigningProgress(document);

  if (signingType === "self_sign") {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
        Самоподпис
      </span>
    );
  }

  if (signingType === "two_sided") {
    const done = document.status === "signed";
    return (
      <span
        className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
          done
            ? "bg-[#E1F5EE] text-[#085041]"
            : "bg-blue-50 text-blue-800"
        }`}
      >
        {signed}/{total}
      </span>
    );
  }

  const done = document.status === "signed";
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
        done ? "bg-[#E1F5EE] text-[#085041]" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      1/1
    </span>
  );
}
