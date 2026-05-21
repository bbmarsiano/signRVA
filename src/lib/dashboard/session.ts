// Dashboard session — fetch authenticated user and organization for server layouts
import { createClient } from "@/lib/supabase/server";
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

    let profile: User | null = null;
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single<User>();
      profile = data;
    } catch {
      profile = null;
    }

    const user = profile ?? fallbackUser(authUser);

    let organization: Organization | null = null;
    if (profile?.org_id) {
      try {
        const { data } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.org_id)
          .single<Organization>();
        organization = data;
      } catch {
        organization = null;
      }
    }

    const org = organization ?? {
      ...FALLBACK_ORGANIZATION,
      id: profile?.org_id ?? "",
    };

    if (!user.org_id && org.id) {
      user.org_id = org.id;
    }

    return { user, organization: org };
  } catch {
    return null;
  }
}
