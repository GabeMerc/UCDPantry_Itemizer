// Top-level admin layout: passthrough only.
// AdminNav is applied in (protected)/layout.tsx so the login page stays clean.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
