import PreferencesClient from "@/components/student/PreferencesClient";

export default function PreferencesPage() {
  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Preferences</h1>
        <p className="text-gray-500 mt-1">
          Saved locally on this device. Used to filter inventory and suggest
          recipes.
        </p>
      </div>
      <PreferencesClient />
    </div>
  );
}
