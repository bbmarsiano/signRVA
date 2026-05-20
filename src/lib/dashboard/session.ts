// Dashboard session — fetch authenticated user and organization for server layouts
import { createClient } from "@/lib/supabase/server";
import type { Organization, User } from "@/types";

export async function getDashboardSession(): Promise<{
  user: User;
  organization: Organization;
} | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single<User>();

  if (!profile) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single<Organization>();

  if (!organization) return null;

  return { user: profile, organization };
}
