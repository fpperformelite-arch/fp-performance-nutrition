"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, MessagesSquare, Settings, CreditCard, LogOut, Menu, X } from "lucide-react";

const NAV_ITEM_CLASS =
  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-ink";

export function MobileNav({
  businessName,
  isOwner,
  logoutAction,
}: {
  businessName: string;
  isOwner: boolean;
  logoutAction: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-stone-200 bg-white md:hidden">
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <Link href="/" className="block font-bold text-lg text-petroleum">
            SEMBORA IA
          </Link>
          <p className="truncate text-sm text-stone-500">{businessName}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-stone-100"
        >
          {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-stone-200 p-3">
          <Link href="/dashboard" className={NAV_ITEM_CLASS} onClick={() => setOpen(false)}>
            <BarChart3 size={18} strokeWidth={1.75} />
            Métricas
          </Link>
          <Link href="/leads" className={NAV_ITEM_CLASS} onClick={() => setOpen(false)}>
            <MessagesSquare size={18} strokeWidth={1.75} />
            Leads y conversaciones
          </Link>
          {isOwner && (
            <Link href="/settings" className={NAV_ITEM_CLASS} onClick={() => setOpen(false)}>
              <Settings size={18} strokeWidth={1.75} />
              Configurar Bora
            </Link>
          )}
          {isOwner && (
            <Link href="/billing" className={NAV_ITEM_CLASS} onClick={() => setOpen(false)}>
              <CreditCard size={18} strokeWidth={1.75} />
              Plan y facturación
            </Link>
          )}
          <form action={logoutAction}>
            <button type="submit" className={`${NAV_ITEM_CLASS} w-full text-left text-stone-500`}>
              <LogOut size={18} strokeWidth={1.75} />
              Cerrar sesión
            </button>
          </form>
        </nav>
      )}
    </div>
  );
}
