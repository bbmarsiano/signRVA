// ProfileClient — profile, organization, and notification settings
"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { BillingProfile } from "@/components/billing/BillingClient";
import type { Organization, User, UserRole } from "@/types";

const PRIMARY = "#0F6E56";

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Собственик",
  member: "Член",
};

type TabId = "profile" | "organization" | "notifications";

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

type NotificationPrefs = {
  notify_document_signed: boolean;
  notify_document_expired: boolean;
  notify_weekly_report: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  notify_document_signed: true,
  notify_document_expired: true,
  notify_weekly_report: false,
};

export default function ProfileClient({
  user,
  organization,
  billingProfile,
}: {
  user: User;
  organization: Organization;
  billingProfile: BillingProfile;
}) {
  const { addToast } = useToast();
  const [tab, setTab] = useState<TabId>("profile");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [orgName, setOrgName] = useState(organization.name);
  const [billing, setBilling] = useState(billingProfile);
  const [orgSaving, setOrgSaving] = useState(false);

  const [notifications, setNotifications] =
    useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Partial<NotificationPrefs> | undefined;
      if (meta) {
        setNotifications({
          notify_document_signed:
            meta.notify_document_signed ?? DEFAULT_NOTIFICATIONS.notify_document_signed,
          notify_document_expired:
            meta.notify_document_expired ?? DEFAULT_NOTIFICATIONS.notify_document_expired,
          notify_weekly_report:
            meta.notify_weekly_report ?? DEFAULT_NOTIFICATIONS.notify_weekly_report,
        });
      }
      setNotificationsLoaded(true);
    });
  }, []);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "Паролата трябва да е поне 8 символа.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Паролите не съвпадат.",
      });
      return;
    }

    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordMessage({
        type: "error",
        text: error.message || "Грешка при смяна на паролата.",
      });
      return;
    }

    setPasswordMessage({
      type: "success",
      text: "Паролата е променена успешно.",
    });
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleOrgSubmit(e: FormEvent) {
    e.preventDefault();
    setOrgSaving(true);
    try {
      const res = await fetch("/api/billing/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: orgName.trim(),
          ...billing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Грешка при запазване", "error");
        return;
      }
      addToast("Настройките са запазени", "success");
    } catch {
      addToast("Грешка при връзка със сървъра", "error");
    } finally {
      setOrgSaving(false);
    }
  }

  async function handleNotificationsSubmit(e: FormEvent) {
    e.preventDefault();
    setNotificationsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: notifications,
    });
    setNotificationsSaving(false);

    if (error) {
      addToast("Грешка при запазване на известията", "error");
      return;
    }
    addToast("Настройките за известия са запазени", "success");
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "profile", label: "Профил" },
    { id: "organization", label: "Организация" },
    { id: "notifications", label: "Известия" },
  ];

  const displayName = organization.name || user.email;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Профил & настройки</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Управление на акаунта, организацията и известията
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-[#085041] shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                {getInitials(user.email)}
              </div>
              <div>
                <p className="font-medium text-zinc-900">{displayName}</p>
                <p className="text-sm text-zinc-500">{user.email}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Смени снимка — скоро
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Показвано име
                </label>
                <input
                  readOnly
                  value={displayName}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Редактирайте името на организацията в таб „Организация“
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Имейл
                </label>
                <input
                  readOnly
                  value={user.email}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Роля в организацията
                </label>
                <div className="mt-2">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => void handlePasswordSubmit(e)}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h3 className="font-semibold text-zinc-900">Промени парола</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Нова парола
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Потвърди паролата
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {passwordMessage && (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {passwordMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={passwordSaving}
              className="mt-4 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {passwordSaving ? "Запазване..." : "Запази паролата"}
            </button>
          </form>
        </div>
      )}

      {tab === "organization" && (
        <form
          onSubmit={(e) => void handleOrgSubmit(e)}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h3 className="font-semibold text-zinc-900">Организация</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700">
                Име на организацията
              </label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <hr className="border-zinc-100" />
            <p className="text-sm font-medium text-zinc-700">
              Данни за фактуриране
            </p>
            <div>
              <label className="text-sm font-medium text-zinc-700">
                Фирма / Имена на физическото лице
              </label>
              <input
                value={billing.billing_name ?? ""}
                onChange={(e) =>
                  setBilling((b) => ({ ...b, billing_name: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  ЕИК / ЕГН
                </label>
                <input
                  value={billing.billing_eik ?? ""}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, billing_eik: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  ДДС номер (незадължително)
                </label>
                <input
                  value={billing.billing_vat ?? ""}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, billing_vat: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">
                Адрес за фактуриране
              </label>
              <input
                value={billing.billing_address ?? ""}
                onChange={(e) =>
                  setBilling((b) => ({
                    ...b,
                    billing_address: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={orgSaving}
            className="mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {orgSaving ? "Запазване..." : "Запази"}
          </button>
        </form>
      )}

      {tab === "notifications" && (
        <form
          onSubmit={(e) => void handleNotificationsSubmit(e)}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h3 className="font-semibold text-zinc-900">Имейл известия</h3>
          {!notificationsLoaded ? (
            <p className="mt-4 text-sm text-zinc-500">Зареждане...</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              <NotificationToggle
                label="Имейл при подписан документ"
                checked={notifications.notify_document_signed}
                onChange={(v) =>
                  setNotifications((n) => ({
                    ...n,
                    notify_document_signed: v,
                  }))
                }
              />
              <NotificationToggle
                label="Имейл при изтекъл документ"
                checked={notifications.notify_document_expired}
                onChange={(v) =>
                  setNotifications((n) => ({
                    ...n,
                    notify_document_expired: v,
                  }))
                }
              />
              <NotificationToggle
                label="Седмичен отчет"
                checked={notifications.notify_weekly_report}
                onChange={(v) =>
                  setNotifications((n) => ({
                    ...n,
                    notify_weekly_report: v,
                  }))
                }
              />
            </ul>
          )}
          <button
            type="submit"
            disabled={notificationsSaving || !notificationsLoaded}
            className="mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {notificationsSaving ? "Запазване..." : "Запази"}
          </button>
        </form>
      )}
    </div>
  );
}

function NotificationToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between py-4">
      <span className="text-sm text-zinc-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#0F6E56]" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </li>
  );
}
