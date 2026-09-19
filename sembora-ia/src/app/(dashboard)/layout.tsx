import Link from "next/link";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { logoutAction } from "@/app/(auth)/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, membership } = await requireBusinessContext();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-stone-200 p-4">
        <div>
          <p className="mb-6 font-bold text-petroleum">{business.name}</p>
          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/dashboard">Métricas</Link>
            <Link href="/leads">Leads y conversaciones</Link>
            {membership.role === "owner" && <Link href="/settings">Configurar Bora</Link>}
            {membership.role === "owner" && <Link href="/billing">Plan y facturación</Link>}
          </nav>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-stone-500">
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
