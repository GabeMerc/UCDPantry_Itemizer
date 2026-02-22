import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import SettingsManager from "@/components/admin/SettingsManager";

export const revalidate = 0;

type KeyStatus = { key_set: boolean; key_preview: string | null; source: "database" | "env" | "none" };

async function resolveStatus(
  supabase: ReturnType<typeof createServiceClient>,
  dbKey: string,
  envValue: string | undefined
): Promise<KeyStatus> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", dbKey).single();
  if (data?.value) {
    const key = data.value as string;
    return { key_set: true, key_preview: "..." + key.slice(-8), source: "database" };
  }
  if (envValue) {
    return { key_set: true, key_preview: "..." + envValue.slice(-8), source: "env" };
  }
  return { key_set: false, key_preview: null, source: "none" };
}

export default async function AdminSettingsPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  const empty: KeyStatus = { key_set: false, key_preview: null, source: "none" };
  let spoonacularStatus = empty;
  let pexelsStatus = empty;

  if (user) {
    const supabase = createServiceClient();
    [spoonacularStatus, pexelsStatus] = await Promise.all([
      resolveStatus(supabase, "spoonacular_api_key", process.env.SPOONACULAR_API_KEY),
      resolveStatus(supabase, "pexels_api_key", process.env.PEXELS_API_KEY),
    ]);
  }

  return <SettingsManager spoonacularStatus={spoonacularStatus} pexelsStatus={pexelsStatus} />;
}
