// auth — resolve dashboard user + org via supabaseAdmin (bypass RLS)
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanId } from "@/types";

export type TeamAuthContext = {
  userId: string;
  userEmail: string;
  userRole: string;
  orgId: string;
  orgName: string;
  orgPlan: PlanId;
};

export async function getTeamAuthContext(): Promise<TeamAuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("org_id, role, email, organizations(name, plan)")
    .eq("id", user.id)
    .single();

  if (userError || !userRow?.org_id) return null;

  const orgRaw = userRow.organizations;
  const org = (
    Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  ) as { name: string; plan: PlanId } | null | undefined;

  return {
    userId: user.id,
    userEmail: userRow.email ?? user.email ?? "",
    userRole: userRow.role as string,
    orgId: userRow.org_id,
    orgName: org?.name ?? "Организация",
    orgPlan: (org?.plan ?? "free") as PlanId,
  };
}
