import Link from "next/link";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { logoutAction } from "@/app/(auth)/actions";
import { BarChart3, MessagesSquare, Settings, CreditCard, LogOut } from "lucide-react";

const NAV_ITEM_CLASS =
  "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-ink";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, membership } = await requireBusinessContext();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-stone-200 bg-white p-4 md:w-64 md:justify-between md:border-b-0 md:border-r">
        <div>
          <div className="mb-3 flex items-center justify-between md:mb-6 md:block">
            <div>
              <Link href="/" className="block font-bold text-lg text-petroleum">
                SEMBORA IA
              </Link>
              <p className="truncate text-sm text-stone-500 md:mt-1">{business.name}</p>
            </div>
            <form action={logoutAction} className="md:hidden">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-stone-500 text-xs hover:bg-stone-100 hover:text-ink"
              >
                <LogOut size={16} strokeWidth={1.75} />
                Salir
              </button>
            </form>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
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
        <form action={logoutAction} className="hidden md:block">
          <button
            type="submit"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-ink"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
