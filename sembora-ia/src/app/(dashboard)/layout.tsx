import Link from "next/link";
import { requireBusinessContext } from "@/lib/supabase/business-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, membership } = await requireBusinessContext();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-stone-200 p-4">
        <p className="mb-6 font-bold text-petroleum">{business.name}</p>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/dashboard">Métricas</Link>
          <Link href="/leads">Leads y conversaciones</Link>
          {membership.role === "owner" && <Link href="/settings">Configurar Bora</Link>}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
