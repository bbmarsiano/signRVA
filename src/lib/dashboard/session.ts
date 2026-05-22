// Dashboard session — fetch authenticated user and organization for server layouts
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Organization, User } from "@/types";

export const FALLBACK_ORGANIZATION: Organization = {
  id: "",
  name: "My Organization",
  plan: "free",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  documents_used: 0,
  documents_limit: 3,
  created_at: new Date().toISOString(),
};

function fallbackUser(authUser: { id: string; email?: string }): User {
  return {
    id: authUser.id,
    org_id: "",
    email: authUser.email ?? "",
    role: "owner",
    created_at: new Date().toISOString(),
  };
}

export async function getDashboardSession(): Promise<{
  user: User;
  organization: Organization;
} | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) return null;

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle<User>();

    const user = profile ?? fallbackUser(authUser);

    let organization: Organization | null = null;
    const orgId = profile?.org_id;

    if (orgId) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single<Organization>();
      organization = org;
    }

    const org = organization ?? {
      ...FALLBACK_ORGANIZATION,
      id: orgId ?? "",
    };

    if (!user.org_id && org.id) {
      user.org_id = org.id;
    }

    return { user, organization: org };
  } catch {
    return null;
  }
}
