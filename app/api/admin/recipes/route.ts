import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/admin/recipes — list all cached recipes (paginated)
export async function GET(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const pageSize = 20;
  const offset = page * pageSize;

  const supabase = createServiceClient();
  const { data, count, error } = await supabase
    .from("recipes_cache")
    .select("spoonacular_id, title, image_url, meal_type, dietary_tags, cuisines, ready_in_minutes, last_fetched_at", { count: "exact" })
    .order("last_fetched_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch recipes." }, { status: 500 });
  }

  return NextResponse.json({ recipes: data ?? [], total: count ?? 0, page, pageSize });
}

// DELETE /api/admin/recipes?id=X — remove a recipe from the cache
export async function DELETE(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const numericId = parseInt(id ?? "", 10);
  if (!id || isNaN(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Missing or invalid id parameter." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("recipes_cache")
    .delete()
    .eq("spoonacular_id", numericId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete recipe." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
