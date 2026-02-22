"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/browse",      label: "Browse" },
  { href: "/recipes",     label: "Recipes" },
  { href: "/swipe",       label: "Swipe" },
  { href: "/meal-plan",   label: "Meal Plan" },
  { href: "/preferences", label: "Preferences" },
];

export default function StudentNav() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-[#e8ddd0] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link href="/browse" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logos/pantry-icon-color.webp"
              alt="The Pantry at ASUCD"
              width={36}
              height={36}
              className="rounded-full"
            />
            <span className="hidden sm:block leading-tight">
              <span className="font-semibold text-pantry-dark text-sm">The Pantry</span>
              <span className="block text-[10px] text-pantry-neutral font-normal">at ASUCD</span>
            </span>
          </Link>

          <nav className="flex gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-pantry-sand text-pantry-coral"
                    : "text-pantry-neutral hover:text-pantry-dark hover:bg-pantry-sand/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link
          href="/"
          className="text-xs text-pantry-neutral hover:text-pantry-dark transition-colors"
        >
          ← Home
        </Link>
      </div>
    </header>
  );
}
