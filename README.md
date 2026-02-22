# UCDPantry Itemizer

A full-stack web app connecting UC Davis students with free pantry food and personalized recipes.

**Live site:** [ucd-pantry-itemizer-5s8g.vercel.app](https://ucd-pantry-itemizer-5s8g.vercel.app)

---

## What it does

**For students** (no account needed):
- Browse items currently in stock at the pantry
- Discover recipes matched to available inventory
- Swipe through personalized recipe recommendations (Tinder-style, by meal type)
- Build a weekly meal plan and generate a grocery list
- Set dietary restrictions, macro goals, and a budget

**For pantry staff** (admin login required):
- Manage inventory and incoming shipments
- Bulk import inventory via CSV
- Fetch recipes from Spoonacular by ingredient and cache them
- Browse and manage the recipe library
- Configure the Spoonacular API key

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (admin only) |
| Recipe API | Spoonacular |
| Hosting | Vercel |

---

## Project Structure

```
app/
  page.tsx                  # Landing page (student vs staff selector)
  browse/                   # Browse pantry inventory
  recipes/                  # Recipe discovery (For You + Popular tabs)
  swipe/                    # Tinder-style swipe mode
  meal-plan/                # Weekly meal planner + grocery list
  preferences/              # Student dietary & budget settings
  onboarding/               # First-time setup wizard
  recipe/[id]/              # Recipe detail page
  admin/
    login/                  # Admin login
    dashboard/              # Stats overview
    inventory/              # CRUD inventory items
    shipments/              # Manage incoming deliveries
    import/                 # CSV bulk import
    recipes/                # Recipe library (fetch/import/delete)
    settings/               # Spoonacular API key config
  api/
    recipes/                # Student recipe search (reads from cache)
    recipe-interactions/    # Log views & likes
    admin/fetch-recipes/    # Fetch from Spoonacular (admin only)
    admin/import-recipes/   # Import from JSON (admin only)
    admin/recipes/          # List & delete cached recipes (admin only)
    admin/settings/         # Read/write site settings (admin only)

components/
  student/                  # All student-facing UI components
  admin/                    # All admin UI components

lib/
  types.ts                  # All shared TypeScript types
  supabase/
    client.ts               # Browser Supabase client (anon key)
    server.ts               # Server Supabase client (auth cookies)
    service.ts              # Service role client (admin API routes only)

supabase/
  schema.sql                # Core DB schema
data/
  recipes.json              # Seed recipes for initial import
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `inventory` | Items currently in stock or arriving soon |
| `shipments` | Upcoming deliveries |
| `recipes_cache` | Recipes fetched from Spoonacular (7-day TTL) |
| `recipe_interactions` | Student views and likes (no auth required) |
| `site_settings` | Admin-configurable key/value pairs (API keys etc.) |

**View:** `popular_recipes` — aggregates interaction counts, ordered by total interactions.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Spoonacular](https://spoonacular.com/food-api) API key (free tier: 150 req/day)

### 1. Clone and install

```bash
git clone https://github.com/GabeMerc/UCDPantry_Itemizer.git
cd UCDPantry_Itemizer
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
SPOONACULAR_API_KEY=your-spoonacular-api-key
```

> The Spoonacular key can also be set through the admin Settings page after login — the database value takes priority over the env var.

### 3. Set up the database

Run the SQL files in your Supabase SQL editor in order:

1. `supabase/schema.sql`

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Deployment

The app is deployed on Vercel. Every push to `main` triggers an automatic deployment.

Environment variables are configured in the Vercel project dashboard (not in any committed file).

---

## Key Design Decisions

**Students have no accounts.** All preferences (dietary restrictions, macro goals, budget, liked recipes) are stored in `localStorage`. This removes signup friction for pantry users.

**Students never hit Spoonacular.** The student recipe API only reads from `recipes_cache`. Admins control when Spoonacular is queried, protecting the 150 req/day free tier limit.

**Budget is enforced server-side.** The `maxBuyItems` constraint is applied in the API route (`applyBudgetFilter`), not just in the UI, so it can't be bypassed.

**Admin auth is Supabase Auth.** The middleware guards all `/admin/*` routes and redirects unauthenticated users to `/admin/login`.

---

## Branding

| Token | Value | Usage |
|-------|-------|-------|
| `ucd-blue` | `#E37861` | Primary buttons, links, active states |
| `ucd-gold` | `#EEB467` | Accents, highlights |
| `ucd-light-blue` | `#F4E8D0` | Background surfaces |
| Font | Rubik (Google Fonts) | All text |
