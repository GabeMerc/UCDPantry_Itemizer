import OnboardingWizard from "@/components/student/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002855] to-[#003d7a] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">UC Davis Pantry</h1>
          <p className="text-blue-200 mt-2">
            Let&apos;s personalize your recipe experience
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  );
}
