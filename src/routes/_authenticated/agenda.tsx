import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { fmtTime } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agenda")({ component: AgendaGlobal });

const TIPO_ICON: Record<string, string> = {
  reuniao: "📹", ligacao: "📞", entrega: "📦", pagamento: "💰",
  vencimento: "🔔", lembrete: "🚩", outro: "•",
};
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function AgendaGlobal() {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const { data: empresas } = useQuery({
    queryKey: ["empresas-all-min"],
    queryFn: async () => (await supabase.from("empresas").select("id,nome,cor_identidade")).data ?? [],
  });

  const empresaMap = useMemo(
    () => Object.fromEntries((empresas ?? []).map(e => [e.id, e])),
    [empresas]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["agenda-global"],
    queryFn: async () => (await supabase.from("agenda").select("*").order("data_inicio")).data ?? [],
  });

  const eventColor = (e: any) => e.cor || empresaMap[e.empresa_id]?.cor_identidade || "#6366f1";

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  const eventsForDay = (d: Date) => (data ?? []).filter((e: any) => sameDay(new Date(e.data_inicio), d));

  return (
    <>
      <Header title="Agenda Global" />
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? <ListSkeleton /> : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))} className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground"><ChevronLeft className="size-4"/></button>
                  <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))} className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground"><ChevronRight className="size-4"/></button>
                  <span className="text-sm font-semibold ml-2">{MESES[cursor.getMonth()]} {cursor.getFullYear()}</span>
                </div>
                <button onClick={() => setCursor(new Date())} className="text-[11px] text-muted-foreground hover:text-foreground">Hoje</button>
              </div>
              <div className="grid grid-cols-7 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                {DIAS.map(d => <div key={d} className="px-2 py-1.5 text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const isToday = sameDay(d, new Date());
                  const isSel = selected && sameDay(d, selected);
                  const evs = eventsForDay(d);
                  return (
                    <button key={i} onClick={() => setSelected(d)}
                      className={`min-h-[88px] border-r border-b border-border p-1.5 text-left transition-colors ${inMonth ? "bg-background" : "bg-surface text-muted-foreground/50"} ${isSel ? "ring-1 ring-primary ring-inset" : ""} hover:bg-accent/30`}>
                      <div className={`text-[11px] font-mono ${isToday ? "size-5 rounded-full bg-primary text-primary-foreground grid place-items-center" : ""}`}>{d.getDate()}</div>
                      <div className="space-y-0.5 mt-1">
                        {evs.slice(0, 3).map((e: any) => (
                          <div key={e.id} className="text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1" style={{ background: eventColor(e)+"22", color: eventColor(e) }}>
                            <span>{TIPO_ICON[e.tipo] || "•"}</span>
                            <span className="truncate">{e.titulo}</span>
                          </div>
                        ))}
                        {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
                {selected ? `Eventos · ${selected.toLocaleDateString("pt-BR")}` : "Selecione um dia"}
              </div>
              {selected ? (
                eventsForDay(selected).length === 0 ? (
                  <div className="text-xs text-muted-foreground">Sem eventos.</div>
                ) : (
                  <div className="space-y-2">
                    {eventsForDay(selected).map((e: any) => {
                      const emp = empresaMap[e.empresa_id];
                      return (
                        <Link key={e.id} to="/empresa/$id/agenda" params={{ id: e.empresa_id }}
                          className="block bg-background border border-border rounded-md p-2.5 hover:border-primary/40">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full shrink-0" style={{ background: eventColor(e) }} />
                            <span className="text-xs font-mono text-muted-foreground">{e.dia_todo ? "Dia todo" : fmtTime(e.data_inicio)}</span>
                            <span className="text-sm font-semibold truncate flex-1">{e.titulo}</span>
                          </div>
                          {emp && (
                            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <span className="size-1.5 rounded-full" style={{ background: emp.cor_identidade }} />
                              {emp.nome}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-xs text-muted-foreground">Clique em um dia para ver os eventos.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
