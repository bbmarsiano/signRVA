// LoginFlashMessages — server-rendered login status banners from URL params
import type { CSSProperties } from "react";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconMail,
  IconUsers,
} from "@tabler/icons-react";

const successBannerStyle: CSSProperties = {
  background: "var(--color-background-success, #ecfdf5)",
  color: "var(--color-text-success, #059669)",
  border: "0.5px solid var(--color-border-success, #a7f3d0)",
  borderRadius: "var(--border-radius-md, 8px)",
  padding: "12px 16px",
  fontSize: "13px",
  marginBottom: "16px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const infoBannerStyle: CSSProperties = {
  background: "var(--color-background-info, #eff6ff)",
  color: "var(--color-text-info, #0284c7)",
  border: "0.5px solid var(--color-border-info, #bae6fd)",
  borderRadius: "var(--border-radius-md, 8px)",
  padding: "12px 16px",
  fontSize: "13px",
  marginBottom: "16px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const errorBannerStyle: CSSProperties = {
  background: "var(--color-background-danger, #fef2f2)",
  color: "var(--color-text-danger, #dc2626)",
  border: "0.5px solid var(--color-border-danger, #fecaca)",
  borderRadius: "var(--border-radius-md, 8px)",
  padding: "12px 16px",
  fontSize: "13px",
  marginBottom: "16px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

function param(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export default function LoginFlashMessages({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const confirmed = param(searchParams, "confirmed") === "true";
  const registered = param(searchParams, "registered") === "true";
  const invited = param(searchParams, "invited") === "true";
  const error = param(searchParams, "error");

  if (!confirmed && !registered && !invited && !error) {
    return null;
  }

  return (
    <>
      {confirmed && (
        <div style={successBannerStyle} role="status">
          <IconCircleCheck size={16} stroke={2} aria-hidden />
          Имейлът е потвърден успешно! Влезте в акаунта си.
        </div>
      )}
      {registered && (
        <div style={infoBannerStyle} role="status">
          <IconMail size={16} stroke={2} aria-hidden />
          Регистрацията е успешна! Проверете имейла си за потвърждение.
        </div>
      )}
      {invited && (
        <div style={successBannerStyle} role="status">
          <IconUsers size={16} stroke={2} aria-hidden />
          Добре дошли в екипа! Потвърдете имейла си и влезте.
        </div>
      )}
      {error && (
        <div style={errorBannerStyle} role="alert">
          <IconAlertCircle size={16} stroke={2} aria-hidden />
          {error === "confirmation_failed"
            ? "Грешка при потвърждение. Опитайте отново."
            : error === "session_expired"
              ? "Сесията е изтекла. Влезте отново."
              : "Възникна грешка. Опитайте отново."}
        </div>
      )}
    </>
  );
}
