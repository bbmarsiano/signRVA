// verify-api-key — Bearer token auth for public REST API v1
import { hashApiKey } from "@/lib/api/hash-key";
import { ApiHttpError } from "@/lib/api/errors";
import { limitV1Api } from "@/lib/redis/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiKey, Organization } from "@/types";

export type VerifiedApiContext = {
  org_id: string;
  org: Organization;
  apiKey: ApiKey;
};

export async function verifyApiKey(
  request: Request
): Promise<VerifiedApiContext> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new ApiHttpError(401, "Липсва или е невалиден Authorization header.");
  }

  const token = auth.slice(7).trim();
  if (!token) {
    throw new ApiHttpError(401, "API ключът е празен.");
  }

  const keyHash = hashApiKey(token);
  const supabase = createAdminClient();

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .single<ApiKey>();

  if (error || !apiKey) {
    throw new ApiHttpError(401, "Невалиден API ключ.");
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", apiKey.org_id)
    .single<Organization>();

  if (orgError || !org) {
    throw new ApiHttpError(401, "Организацията не е намерена.");
  }

  if (org.plan !== "business") {
    throw new ApiHttpError(403, "API достъпът изисква Business план.");
  }

  const allowed = await limitV1Api(org.id);
  if (!allowed) {
    throw new ApiHttpError(429, "Прекалено много заявки. Опитайте отново след минута.");
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  return { org_id: org.id, org, apiKey };
}
