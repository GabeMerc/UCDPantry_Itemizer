import Image from "next/image";
import OnboardingWizard from "@/components/student/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-pantry-sand flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logos/pantry-icon-color.webp"
              alt="The Pantry at ASUCD"
              width={56}
              height={56}
              className="rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-pantry-dark">Welcome to The Pantry</h1>
          <p className="text-pantry-neutral mt-2 text-sm">
            Let&apos;s personalize your recipe experience
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
