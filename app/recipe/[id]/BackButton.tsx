"use client";

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
    >
      ← Back
    </button>
  );
}
