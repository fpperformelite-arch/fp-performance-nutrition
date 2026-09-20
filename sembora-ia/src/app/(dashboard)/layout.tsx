import Link from "next/link";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { logoutAction } from "@/app/(auth)/actions";
import { BarChart3, MessagesSquare, Settings, CreditCard, LogOut } from "lucide-react";

const NAV_ITEM_CLASS =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-ink";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, membership } = await requireBusinessContext();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-stone-200 bg-white p-4">
        <div>
          <Link href="/" className="mb-1 block font-bold text-lg text-petroleum">
            SEMBORA IA
          </Link>
          <p className="mb-6 truncate text-sm text-stone-500">{business.name}</p>
          <nav className="flex flex-col gap-1">
            <Link href="/dashboard" className={NAV_ITEM_CLASS}>
              <BarChart3 size={18} strokeWidth={1.75} />
              Métricas
            </Link>
            <Link href="/leads" className={NAV_ITEM_CLASS}>
              <MessagesSquare size={18} strokeWidth={1.75} />
              Leads y conversaciones
            </Link>
            {membership.role === "owner" && (
              <Link href="/settings" className={NAV_ITEM_CLASS}>
                <Settings size={18} strokeWidth={1.75} />
                Configurar Bora
              </Link>
            )}
            {membership.role === "owner" && (
              <Link href="/billing" className={NAV_ITEM_CLASS}>
                <CreditCard size={18} strokeWidth={1.75} />
                Plan y facturación
              </Link>
            )}
          </nav>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-ink"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
