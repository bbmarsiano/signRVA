// Auth flash banners — map login/register URL search params to user-facing messages

export type AuthFlashVariant = "success" | "info" | "error";

export interface AuthFlash {
  variant: AuthFlashVariant;
  message: string;
}

function param(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = params[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export function getAuthFlashFromParams(
  params: Record<string, string | string[] | undefined>
): AuthFlash | null {
  if (param(params, "confirmed") === "true") {
    return {
      variant: "success",
      message: "Имейлът е потвърден! Влезте в акаунта си.",
    };
  }

  if (param(params, "registered") === "true") {
    return {
      variant: "info",
      message: "Регистрацията е успешна! Потвърдете имейла си.",
    };
  }

  if (param(params, "invited") === "true") {
    return {
      variant: "success",
      message: "Поканата е приета! Влезте в акаунта си.",
    };
  }

  const error = param(params, "error");
  if (error === "session_expired") {
    return {
      variant: "error",
      message: "Сесията е изтекла. Влезте отново.",
    };
  }

  if (error === "confirmation_failed") {
    return {
      variant: "error",
      message: "Грешка при потвърждаване на имейла. Опитайте отново.",
    };
  }

  if (error) {
    try {
      return { variant: "error", message: decodeURIComponent(error) };
    } catch {
      return { variant: "error", message: error };
    }
  }

  return null;
}
