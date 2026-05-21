// useWizardSteps — dynamic step sequence for UploadWizard
"use client";

import { useMemo } from "react";

export type WizardStepKey =
  | "document"
  | "recipient"
  | "sender_fields"
  | "options"
  | "qr";

export function useWizardSteps(
  isSelfSign: boolean,
  hasSenderFieldsStep: boolean
): { key: WizardStepKey; label: string }[] {
  return useMemo(() => {
    const steps: { key: WizardStepKey; label: string }[] = [
      { key: "document", label: "Документ" },
    ];
    if (!isSelfSign) {
      steps.push({ key: "recipient", label: "Получател" });
    }
    if (hasSenderFieldsStep) {
      steps.push({ key: "sender_fields", label: "Попълни данни" });
    }
    steps.push({ key: "options", label: "Опции" });
    if (!isSelfSign) {
      steps.push({ key: "qr", label: "QR & изпращане" });
    }
    return steps;
  }, [isSelfSign, hasSenderFieldsStep]);
}
