"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/browse", label: "Browse Items" },
  { href: "/recipes", label: "Recipes" },
  { href: "/swipe", label: "Swipe" },
  { href: "/meal-plan", label: "Meal Plan" },
  { href: "/preferences", label: "Preferences" },
];

export default function StudentNav() {
  const pathname = usePathname();

  return (
    <header className="bg-ucd-blue text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link href="/browse" className="font-bold text-lg tracking-tight">
            UC Davis Pantry
          </Link>
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
      </div>
    </header>
  );
}
