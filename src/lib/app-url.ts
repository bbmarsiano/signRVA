// App URL — public base URL for sign links and QR codes
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL_LOCAL ??
    "http://localhost:3000"
  );
}
