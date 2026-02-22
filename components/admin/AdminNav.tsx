"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/shipments", label: "Shipments" },
  { href: "/admin/recipes",   label: "Recipes" },
  { href: "/admin/settings",  label: "Settings" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <header className="bg-pantry-dark text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logos/pantry-icon-white.webp"
              alt="The Pantry"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="hidden sm:block">
              <span className="font-semibold text-white text-sm">The Pantry</span>
              <span className="ml-1.5 text-[10px] bg-pantry-gold text-pantry-dark px-1.5 py-0.5 rounded font-bold uppercase">
                Admin
              </span>
            </span>
          </Link>

          <nav className="flex gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/browse"
            className="text-white/60 hover:text-white text-sm transition-colors"
            target="_blank"
          >
            Student view ↗
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
