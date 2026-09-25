"use client";

import { useState, useTransition } from "react";
import { MessagesSquare } from "lucide-react";
import type { Lead, LeadStatus } from "@/types/database";
import { updateLeadStatus } from "./actions";

const COLUMNS: { status: LeadStatus; label: string; dot: string }[] = [
  { status: "new", label: "Nuevo", dot: "bg-blue-600" },
  { status: "contacted", label: "Contactado", dot: "bg-amber-600" },
  { status: "scheduled", label: "Agendado", dot: "bg-purple-600" },
  { status: "customer", label: "Cliente", dot: "bg-green-600" },
  { status: "lost", label: "Perdido", dot: "bg-stone-400" },
];

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "justo ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
}

export function LeadsKanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(status: LeadStatus) {
    setDragOverStatus(null);
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    if (!lead || lead.status === status) {
      setDraggingId(null);
      return;
    }

    setLeads((prev) => prev.map((l) => (l.id === draggingId ? { ...l, status } : l)));
    startTransition(() => {
      updateLeadStatus(draggingId, status);
    });
    setDraggingId(null);
  }

  if (leads.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 py-16 text-center text-stone-400">
        <MessagesSquare size={28} strokeWidth={1.5} className="text-stone-300" />
        Aún no hay leads. En cuanto alguien escriba a tu WhatsApp, aparecerá aquí.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.status);
        const isOver = dragOverStatus === col.status;
        return (
          <div key={col.status} className="w-64 shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${col.dot}`} />
              <span className="text-sm font-semibold text-stone-700">{col.label}</span>
              <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-400">
                {columnLeads.length}
              </span>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={() => handleDrop(col.status)}
              className={`flex min-h-[80px] flex-col gap-2.5 rounded-2xl p-1.5 transition-colors ${
                isOver ? "bg-petroleum/5" : ""
              }`}
            >
              {columnLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggingId(lead.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`card cursor-grab p-3.5 active:cursor-grabbing ${
                    draggingId === lead.id ? "opacity-40" : ""
                  }`}
                >
                  <p className="mb-0.5 text-sm font-semibold text-ink">
                    {lead.full_name ?? "Sin nombre"}
                  </p>
                  <p className="mb-2 text-sm text-stone-600">{lead.interest ?? lead.phone}</p>
                  <p className="text-xs text-stone-400">
                    {lead.phone} · {timeAgo(lead.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
