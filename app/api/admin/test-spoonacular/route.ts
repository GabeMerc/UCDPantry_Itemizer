import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/admin/test-spoonacular
// Body: { api_key: string }  — tests the provided key against Spoonacular
export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const apiKey = (body.api_key ?? "").trim();

  if (!apiKey) {
    return NextResponse.json({ error: "No API key provided." }, { status: 400 });
  }

  // Make a minimal Spoonacular call to verify the key
  try {
    const params = new URLSearchParams({
      apiKey,
      number: "1",
      query: "pasta",
    });

    const res = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`
    );

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ valid: false, error: "Invalid API key. Check and try again." });
    }

    if (res.status === 402) {
      return NextResponse.json({ valid: false, error: "API key quota exceeded for today." });
    }

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ valid: false, error: `Spoonacular error: ${text}` });
    }

    const json = await res.json();

    // Spoonacular returns quota headers
    const requestsLeft = res.headers.get("X-RateLimit-Requests-Remaining");
    const pointsLeft = res.headers.get("X-RateLimit-Points-Remaining");

    return NextResponse.json({
      valid: true,
      results: json.totalResults ?? 0,
      requests_remaining: requestsLeft ? parseInt(requestsLeft) : null,
      points_remaining: pointsLeft ? parseInt(pointsLeft) : null,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Could not reach Spoonacular API." });
  }
}
