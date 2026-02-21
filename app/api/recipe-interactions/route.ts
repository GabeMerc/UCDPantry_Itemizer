import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InteractionType } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { recipe_id, recipe_title, recipe_image_url, interaction_type } = body;

  if (!recipe_id || !recipe_title || !interaction_type) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  if (!["view", "like"].includes(interaction_type)) {
    return NextResponse.json(
      { error: "interaction_type must be 'view' or 'like'." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("recipe_interactions").insert({
    recipe_id,
    recipe_title,
    recipe_image_url: recipe_image_url ?? null,
    interaction_type: interaction_type as InteractionType,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
