// Profile — account, organization, and notification settings
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";
import type { BillingProfile } from "@/components/billing/BillingClient";
import { getDashboardSession } from "@/lib/dashboard/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function ProfilePage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const { user, organization } = session;

  const { data: orgBilling } = await supabaseAdmin
    .from("organizations")
    .select("billing_name, billing_eik, billing_address, billing_vat, name")
    .eq("id", organization.id)
    .single();

  const billingProfile: BillingProfile = {
    billing_name: orgBilling?.billing_name ?? null,
    billing_eik: orgBilling?.billing_eik ?? null,
    billing_address: orgBilling?.billing_address ?? null,
    billing_vat: orgBilling?.billing_vat ?? null,
  };

  const orgWithName = {
    ...organization,
    name: orgBilling?.name ?? organization.name,
  };

  return (
    <ProfileClient
      user={user}
      organization={orgWithName}
      billingProfile={billingProfile}
    />
  );
}
