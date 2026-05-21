// Templates — system and custom document templates
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconFileOff, IconPlus } from "@tabler/icons-react";
import TemplateCard from "@/components/templates/TemplateCard";
import { fetchTemplatesForOrg } from "@/lib/templates/db";
import { getOrgIdForUser } from "@/lib/dashboard/documents-data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRIMARY = "#0F6E56";

function CustomEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
      <IconFileOff size={48} stroke={1.25} className="text-zinc-300" />
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
        Нямате собствени шаблони
      </h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Създайте шаблон с полета за попълване от вас и от получателя.
      </p>
      <Link
        href="/templates/new"
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: PRIMARY }}
      >
        <IconPlus size={18} />
        Създай шаблон
      </Link>
    </div>
  );
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await getOrgIdForUser(user.id);
  const { system, custom } = await fetchTemplatesForOrg(orgId);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Шаблони</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Системни и собствени шаблони за документи
          </p>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: PRIMARY }}
        >
          <IconPlus size={18} />
          Нов шаблон
        </Link>
      </div>

      {created === "1" && (
        <div className="rounded-lg border border-[#0F6E56]/30 bg-[#E1F5EE] px-4 py-3 text-sm text-[#085041]">
          Шаблонът беше запазен успешно.
        </div>
      )}

      <section>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Системни шаблони
        </h3>
        {system.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Няма активни системни шаблони. Пуснете миграцията и seed данните в
            Supabase.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {system.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Мои шаблони
        </h3>
        {custom.length === 0 ? (
          <CustomEmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {custom.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                showActions
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
