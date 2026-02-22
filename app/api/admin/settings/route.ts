import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const SPOON_KEY = "spoonacular_api_key";
const PEXELS_KEY = "pexels_api_key";

type KeyStatus = { key_set: boolean; key_preview: string | null; source: "database" | "env" | "none" };

async function resolveKey(
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

// GET /api/admin/settings — returns status for both keys
export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const [spoonacular, pexels] = await Promise.all([
    resolveKey(supabase, SPOON_KEY, process.env.SPOONACULAR_API_KEY),
    resolveKey(supabase, PEXELS_KEY, process.env.PEXELS_API_KEY),
  ]);

  return NextResponse.json({ spoonacular, pexels });
}

// POST /api/admin/settings — body: { spoonacular_api_key? } or { pexels_api_key? }
export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServiceClient();

  if (body.spoonacular_api_key !== undefined) {
    const apiKey = (body.spoonacular_api_key as string).trim();
    if (!apiKey) return NextResponse.json({ error: "API key cannot be empty." }, { status: 400 });
    const { error } = await supabase.from("site_settings").upsert(
      { key: SPOON_KEY, value: apiKey, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ error: "Failed to save key." }, { status: 500 });
  }

  if (body.pexels_api_key !== undefined) {
    const apiKey = (body.pexels_api_key as string).trim();
    if (!apiKey) return NextResponse.json({ error: "API key cannot be empty." }, { status: 400 });
    const { error } = await supabase.from("site_settings").upsert(
      { key: PEXELS_KEY, value: apiKey, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ error: "Failed to save key." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/settings?key=spoonacular|pexels
export async function DELETE(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyParam = searchParams.get("key");
  const dbKey = keyParam === "pexels" ? PEXELS_KEY : SPOON_KEY;

  const supabase = createServiceClient();
  await supabase.from("site_settings").delete().eq("key", dbKey);

  return NextResponse.json({ success: true });
}
