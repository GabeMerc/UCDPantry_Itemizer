"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/shipments", label: "Shipments" },
  { href: "/admin/import", label: "Import CSV" },
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
    <header className="bg-ucd-blue text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <span className="font-bold text-lg tracking-tight">
            UC Davis Pantry
            <span className="ml-2 text-xs bg-ucd-gold text-ucd-blue px-2 py-0.5 rounded font-semibold uppercase">
              Admin
            </span>
          </span>
          <nav className="flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-white/20 text-white"
                    : "text-blue-200 hover:text-white hover:bg-white/10"
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
            className="text-blue-200 hover:text-white text-sm transition-colors"
            target="_blank"
          >
            View Student Side ↗
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm text-blue-200 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
