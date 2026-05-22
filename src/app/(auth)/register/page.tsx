// Register page — sign up; org/user created by handle_new_user() DB trigger
import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SearchParams = { invite?: string; email?: string };

async function RegisterContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const inviteOrgId = (searchParams.invite ?? "").trim();
  const inviteEmail = decodeURIComponent((searchParams.email ?? "").trim())
    .toLowerCase();

  let inviteOrgName = "";
  let inviteValid = false;

  if (inviteOrgId && inviteEmail) {
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", inviteOrgId)
      .maybeSingle();

    const { data: pending } = await supabaseAdmin
      .from("pending_invites")
      .select("id")
      .eq("org_id", inviteOrgId)
      .eq("email", inviteEmail)
      .is("accepted_at", null)
      .maybeSingle();

    inviteOrgName = org?.name ?? "";
    inviteValid = Boolean(org && pending);
  }

  return (
    <RegisterForm
      inviteOrgId={inviteOrgId}
      inviteEmail={inviteEmail}
      inviteOrgName={inviteOrgName}
      inviteValid={inviteValid}
    />
  );
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-500">Зареждане...</p>
        </div>
      }
    >
      <RegisterContent searchParams={params} />
    </Suspense>
  );
}
