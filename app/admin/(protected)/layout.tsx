import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
