// DashboardProviders — toast and other client providers for dashboard routes
"use client";

import { ToastProvider } from "@/components/ui/Toast";

export default function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
