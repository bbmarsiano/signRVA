// Team — workspace members, roles, and invitations
import { redirect } from "next/navigation";
import InviteForm from "@/components/team/InviteForm";
import TeamMembersList from "@/components/team/TeamMembersList";
import { getPlanById } from "@/lib/stripe/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!userRow?.org_id) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Организацията не е намерена. Свържете профила си с организация.
      </div>
    );
  }

  const orgId = userRow.org_id;
  const isOwner = userRow.role === "owner";

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = getPlanById((org?.plan ?? "free") as "free" | "small" | "business");

  const { data: members } = await supabaseAdmin
    .from("users")
    .select("id, email, role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const { data: invites } = await supabaseAdmin
    .from("pending_invites")
    .select("id, email, role, invited_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("invited_at", { ascending: false });

  const memberCount = members?.length ?? 0;
  const pendingCount = invites?.length ?? 0;
  const totalSlots = memberCount + pendingCount;
  const usersLimit = plan.users_limit;
  const usagePercent =
    usersLimit > 0 ? Math.min(100, (totalSlots / usersLimit) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Екип</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Управление на членове и покани
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600">Потребители</span>
          <span className="font-medium text-zinc-900">
            {totalSlots} / {usersLimit}
            {pendingCount > 0 && (
              <span className="ml-1 text-zinc-500">
                ({pendingCount} покани)
              </span>
            )}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${usagePercent}%`, backgroundColor: "#0F6E56" }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          План: {plan.name} · лимит {usersLimit} потребител
          {usersLimit === 1 ? "" : "а"}
        </p>
      </div>

      <TeamMembersList
        members={members ?? []}
        invites={invites ?? []}
        currentUserId={user.id}
        isOwner={isOwner}
      />

      <InviteForm disabled={!isOwner} />
    </div>
  );
}
