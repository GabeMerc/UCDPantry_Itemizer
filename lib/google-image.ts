/**
 * Fetches a food photo URL from Pexels for the given recipe name.
 *
 * Required env var (or pass apiKey directly):
 *   PEXELS_API_KEY – get a free key at https://www.pexels.com/api/
 *
 * Free tier: 200 requests/hour, 20,000/month. Returns null on any failure.
 */
export async function fetchRecipeImage(recipeName: string, apiKey?: string): Promise<string | null> {
  const key = apiKey ?? process.env.PEXELS_API_KEY;
  if (!key) return null;

  try {
    const params = new URLSearchParams({
      query: `${recipeName} food`,
      per_page: "1",
      size: "large",
      orientation: "landscape",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let res: Response;
    try {
      res = await fetch(
        `https://api.pexels.com/v1/search?${params.toString()}`,
        { headers: { Authorization: key }, signal: controller.signal }
      );
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return null;

    const data = await res.json() as {
      photos?: Array<{ src: { large: string } }>;
    };

    return data.photos?.[0]?.src.large ?? null;
  } catch {
    return null;
  }
}
