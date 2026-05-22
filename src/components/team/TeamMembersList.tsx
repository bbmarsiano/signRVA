// TeamMembersList — organization members and pending invites
"use client";

import { useState } from "react";
import { IconLoader2, IconTrash, IconX } from "@tabler/icons-react";

const PRIMARY = "#0F6E56";

export type TeamMember = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  invited_at: string;
};

function emailInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function roleLabel(role: string) {
  if (role === "owner") return "Собственик";
  if (role === "admin") return "Администратор";
  return "Член";
}

function roleBadgeClass(role: string) {
  if (role === "owner") return "bg-[#E1F5EE] text-[#085041]";
  return "bg-zinc-100 text-zinc-600";
}

function inviteRoleLabel(role: string) {
  if (role === "admin") return "Администратор";
  return "Член";
}

export default function TeamMembersList({
  members,
  invites,
  currentUserId,
  isOwner,
}: {
  members: TeamMember[];
  invites: PendingInvite[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(userId: string) {
    if (!confirm("Сигурни ли сте, че искате да премахнете този член?")) return;
    setRemovingId(userId);
    setError(null);

    try {
      const res = await fetch("/api/team/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Грешка при премахване.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setCancelingId(inviteId);
    setError(null);
    try {
      const res = await fetch("/api/team/cancel-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Грешка при отмяна.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">
            Членове на екипа
          </h3>
        </div>

        {error && (
          <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {members.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">
            Няма регистрирани членове в организацията.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {members.map((member) => {
              const canRemove =
                isOwner &&
                member.role !== "owner" &&
                member.id !== currentUserId;

              return (
                <li
                  key={member.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {emailInitials(member.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {member.email}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {new Intl.DateTimeFormat("bg-BG", {
                        dateStyle: "long",
                      }).format(new Date(member.created_at))}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(member.role)}`}
                  >
                    {roleLabel(member.role)}
                  </span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => void handleRemove(member.id)}
                      disabled={removingId === member.id}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="Премахни"
                    >
                      {removingId === member.id ? (
                        <IconLoader2 size={18} className="animate-spin" />
                      ) : (
                        <IconTrash size={18} />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {invites.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-zinc-900">
              Чакащи покани
            </h3>
          </div>
          <ul className="divide-y divide-zinc-100">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center gap-3 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">{invite.email}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {inviteRoleLabel(invite.role)} · Изпратена на{" "}
                    {new Intl.DateTimeFormat("bg-BG", {
                      dateStyle: "long",
                    }).format(new Date(invite.invited_at))}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => void handleCancelInvite(invite.id)}
                    disabled={cancelingId === invite.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {cancelingId === invite.id ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : (
                      <IconX size={16} />
                    )}
                    Отмени
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
