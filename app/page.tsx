import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-pantry-sand flex flex-col items-center justify-center px-4 py-12">

      {/* Logo + wordmark */}
      <div className="text-center mb-12 space-y-4">
        <div className="flex justify-center">
          <Image
            src="/logos/pantry-logo-color_5.webp"
            alt="The Pantry at ASUCD"
            width={900}
            height={320}
            priority
            className="h-80 w-auto"
          />
        </div>
        <p className="text-pantry-neutral text-base">
          Free food &amp; essentials for every UC Davis student — no questions asked.
        </p>
      </div>

      {/* Role selection */}
      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Student card */}
        <div className="bg-white rounded-2xl p-7 flex flex-col items-center text-center gap-4
                        border border-[#e8ddd0] shadow-sm">
          <div className="w-14 h-14 rounded-full bg-pantry-sand flex items-center justify-center">
            <svg className="w-7 h-7 text-pantry-coral" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l6.16 3.422a12.083 12.083 0 01-12.32 0L12 14z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-pantry-dark">I&apos;m a Student</h2>
            <p className="mt-1.5 text-sm text-pantry-neutral leading-relaxed">
              Browse available items, discover recipes, and plan your week.
            </p>
          </div>
          <div className="mt-auto w-full flex flex-col gap-2">
            <Link
              href="/browse"
              className="w-full bg-pantry-coral text-white text-sm font-semibold
                         py-2.5 rounded-xl hover:bg-pantry-coral-dark transition-colors"
            >
              Browse the Pantry →
            </Link>
            <Link
              href="/onboarding"
              className="w-full bg-pantry-sand text-pantry-coral text-sm font-semibold
                         py-2.5 rounded-xl hover:bg-pantry-coral/10 transition-colors"
            >
              Set Up Preferences
            </Link>
          </div>
        </div>

        {/* Admin card */}
        <Link
          href="/admin/login"
          className="group bg-white rounded-2xl p-7 flex flex-col items-center text-center gap-4
                     border border-[#e8ddd0] shadow-sm hover:shadow-md hover:border-pantry-dark/30
                     hover:scale-[1.01] transition-all duration-200"
        >
          <div className="w-14 h-14 rounded-full bg-[#f0ede9] flex items-center justify-center
                          group-hover:bg-[#e4e0db] transition-colors">
            <svg className="w-7 h-7 text-pantry-neutral" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-pantry-dark">Staff Portal</h2>
            <p className="mt-1.5 text-sm text-pantry-neutral leading-relaxed">
              Manage inventory, shipments, and the recipe library.
            </p>
          </div>
          <span className="mt-auto w-full bg-pantry-dark text-white text-sm font-semibold
                           py-2.5 rounded-xl group-hover:bg-[#1e1c1a] transition-colors">
            Sign in →
          </span>
        </Link>
      </div>

      <p className="mt-10 text-xs text-pantry-neutral/70">
        The Pantry at ASUCD · Est. 2010 · Free for all enrolled students
      </p>
    </div>
  );
}
