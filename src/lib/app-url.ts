// App URL — sign links and QR codes (production vs local dev)
export function getAppUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return (
      process.env.NEXT_PUBLIC_APP_URL_LOCAL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"
    );
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://sign.runverifiedapp.com"
  );
}
