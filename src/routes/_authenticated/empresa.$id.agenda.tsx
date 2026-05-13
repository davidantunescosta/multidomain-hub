import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { fmtTime } from "@/lib/format";
import { Drawer } from "@/components/nexus/Drawer";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa/$id/agenda")({ component: Agenda });

const TIPO_OPTS = ["reuniao", "ligacao", "entrega", "pagamento", "vencimento", "lembrete", "outro"] as const;
const TIPO_ICON: Record<string, string> = {
  reuniao: "📹", ligacao: "📞", entrega: "📦", pagamento: "💰", vencimento: "🔔", lembrete: "🚩", outro: "•",
};
const TIPO_LABEL: Record<string, string> = {
  reuniao: "Reunião", ligacao: "Ligação", entrega: "Entrega", pagamento: "Pagamento",
  vencimento: "Vencimento", lembrete: "Lembrete", outro: "Outro",
};
const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#a855f7", "#ec4899", "#64748b"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Agenda() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/agenda" });
  const [view, setView] = useState<"mes" | "semana" | "lista">("mes");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState<{ date?: Date } | null>(null);
  const [fTipo, setFTipo] = useState("");

  const { data: empresa } = useQuery({
    queryKey: ["empresa", empresa_id],
    queryFn: async () => (await supabase.from("empresas").select("cor_identidade").eq("id", empresa_id).single()).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["agenda", empresa_id],
    queryFn: async () => (await supabase.from("agenda").select("*").eq("empresa_id", empresa_id).order("data_inicio")).data ?? [],
  });

  const eventColor = (e: any) => e.cor || empresa?.cor_identidade || "#6366f1";

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 bg-surface border border-border rounded-md p-1">
          {(["mes", "semana", "lista"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`h-7 px-3 text-xs rounded capitalize ${view === v ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Lista"}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating({ date: new Date() })} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5">
          <Plus className="size-3.5" />Novo evento
        </button>
      </div>

      {isLoading ? <ListSkeleton /> : view === "mes" ? (
        <MonthView cursor={cursor} setCursor={setCursor} events={data ?? []} eventColor={eventColor}
          onDayClick={(d, hasEvents) => hasEvents ? setSelected(d) : setCreating({ date: d })}
          selected={selected} onEditEvent={setEditing} />
      ) : view === "semana" ? (
        <WeekView cursor={cursor} setCursor={setCursor} events={data ?? []} eventColor={eventColor} onEditEvent={setEditing} />
      ) : (
        <ListView events={data ?? []} fTipo={fTipo} setFTipo={setFTipo} onEditEvent={setEditing} />
      )}

      {(creating || editing) && (
        <EventoDrawer empresa_id={empresa_id} evento={editing} initialDate={creating?.date}
          onClose={() => { setCreating(null); setEditing(null); }} />
      )}
    </main>
  );
}

function MonthView({ cursor, setCursor, events, eventColor, onDayClick, selected, onEditEvent }: any) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }

  const eventsForDay = (d: Date) => (events as any[]).filter(e => sameDay(new Date(e.data_inicio), d));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground"><ChevronLeft className="size-4" /></button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground"><ChevronRight className="size-4" /></button>
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
              <button key={i} onClick={() => onDayClick(d, evs.length > 0)}
                className={`min-h-[88px] border-r border-b border-border p-1.5 text-left transition-colors ${inMonth ? "bg-background" : "bg-surface text-muted-foreground/50"} ${isSel ? "ring-1 ring-primary ring-inset" : ""} hover:bg-accent/30`}>
                <div className={`text-[11px] font-mono ${isToday ? "size-5 rounded-full bg-primary text-primary-foreground grid place-items-center" : ""}`}>{d.getDate()}</div>
                <div className="space-y-0.5 mt-1">
                  {evs.slice(0, 3).map(e => (
                    <div key={e.id} className="text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1" style={{ background: eventColor(e) + "22", color: eventColor(e) }}>
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
              {eventsForDay(selected).map((e: any) => (
                <button key={e.id} onClick={() => onEditEvent(e)} className="w-full text-left bg-background border border-border rounded-md p-2.5 hover:border-primary/40">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full shrink-0" style={{ background: eventColor(e) }} />
                    <span className="text-xs font-mono text-muted-foreground">{e.dia_todo ? "Dia todo" : fmtTime(e.data_inicio)}</span>
                    <span className="text-sm font-semibold truncate">{e.titulo}</span>
                  </div>
                  {e.descricao && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{e.descricao}</div>}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="text-xs text-muted-foreground">Clique em um dia para ver eventos ou criar um novo.</div>
        )}
      </div>
    </div>
  );
}

function WeekView({ cursor, setCursor, events, eventColor, onEditEvent }: any) {
  const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay()); start.setHours(0, 0, 0, 0);
  const days: Date[] = []; for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  const eventsForDay = (d: Date) => (events as any[]).filter(e => sameDay(new Date(e.data_inicio), d))
    .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={() => { const n = new Date(cursor); n.setDate(n.getDate() - 7); setCursor(n); }} className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground"><ChevronLeft className="size-4" /></button>
          <button onClick={() => { const n = new Date(cursor); n.setDate(n.getDate() + 7); setCursor(n); }} className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground"><ChevronRight className="size-4" /></button>
          <span className="text-sm font-semibold ml-2">{start.toLocaleDateString("pt-BR")} – {days[6].toLocaleDateString("pt-BR")}</span>
        </div>
        <button onClick={() => setCursor(new Date())} className="text-[11px] text-muted-foreground hover:text-foreground">Hoje</button>
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const isToday = sameDay(d, new Date());
          const evs = eventsForDay(d);
          return (
            <div key={i} className="border-r border-border min-h-[300px]">
              <div className={`px-2 py-2 border-b border-border text-center ${isToday ? "bg-primary/10" : ""}`}>
                <div className="text-[10px] uppercase text-muted-foreground">{DIAS[d.getDay()]}</div>
                <div className={`text-sm font-mono ${isToday ? "text-primary font-bold" : ""}`}>{d.getDate()}</div>
              </div>
              <div className="p-1.5 space-y-1">
                {evs.map((e: any) => (
                  <button key={e.id} onClick={() => onEditEvent(e)} className="w-full text-left text-[11px] px-1.5 py-1 rounded truncate"
                    style={{ background: eventColor(e) + "22", color: eventColor(e) }}>
                    <div className="font-mono text-[10px] opacity-70">{e.dia_todo ? "Dia todo" : fmtTime(e.data_inicio)}</div>
                    <div className="truncate font-medium">{TIPO_ICON[e.tipo]} {e.titulo}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ events, fTipo, setFTipo, onEditEvent }: any) {
  const filtered = (events as any[])
    .filter(e => !fTipo || e.tipo === fTipo)
    .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach(e => {
      const d = new Date(e.data_inicio);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).map(([key, evs]) => ({
      key,
      label: new Date(evs[0].data_inicio).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
      evs,
    }));
  }, [filtered]);

  return (
    <div className="bg-surface border border-border rounded-lg">
      <div className="p-3 border-b border-border">
        <select value={fTipo} onChange={e => setFTipo(e.target.value)} className={inp + " max-w-[200px]"}>
          <option value="">Tipo: todos</option>
          {TIPO_OPTS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </select>
      </div>
      {groups.length === 0 ? (
        <div className="p-6"><EmptyState icon={<CalIcon className="size-5" />} title="Sem eventos" description="Crie um evento na agenda." /></div>
      ) : (
        <div className="divide-y divide-border">
          {groups.map(g => (
            <div key={g.key} className="p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 capitalize">{g.label}</div>
              <div className="space-y-1.5">
                {g.evs.map((e: any) => (
                  <button key={e.id} onClick={() => onEditEvent(e)} className="w-full text-left flex items-center gap-3 hover:bg-background rounded-md p-2 -mx-2">
                    <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">{e.dia_todo ? "Dia todo" : fmtTime(e.data_inicio)}</span>
                    <span className="text-base">{TIPO_ICON[e.tipo]}</span>
                    <span className="text-sm font-medium">{e.titulo}</span>
                    {e.descricao && <span className="text-[11px] text-muted-foreground truncate">— {e.descricao}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventoDrawer({ empresa_id, evento, initialDate, onClose }: { empresa_id: string; evento?: any; initialDate?: Date; onClose: () => void }) {
  const qc = useQueryClient();
  const startInit = evento?.data_inicio ? toLocalInput(evento.data_inicio) :
    initialDate ? toLocalInput(new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), 9, 0).toISOString()) : toLocalInput(new Date().toISOString());
  const [f, setF] = useState({
    titulo: evento?.titulo ?? "",
    tipo: evento?.tipo ?? "reuniao",
    data_inicio: startInit,
    data_fim: toLocalInput(evento?.data_fim),
    dia_todo: evento?.dia_todo ?? false,
    recorrente: evento?.recorrente ?? false,
    descricao: evento?.descricao ?? "",
    cor: evento?.cor ?? COLORS[0],
    reuniao_id: evento?.reuniao_id ?? "",
    tarefa_id: evento?.tarefa_id ?? "",
    contrato_id: evento?.contrato_id ?? "",
  });

  const { data: reunioes } = useQuery({
    queryKey: ["reunioes-opts", empresa_id],
    queryFn: async () => (await supabase.from("reunioes").select("id,titulo").eq("empresa_id", empresa_id)).data ?? [],
  });
  const { data: tarefas } = useQuery({
    queryKey: ["tarefas-opts", empresa_id],
    queryFn: async () => (await supabase.from("tarefas").select("id,titulo").eq("empresa_id", empresa_id)).data ?? [],
  });
  const { data: contratos } = useQuery({
    queryKey: ["contratos-opts", empresa_id],
    queryFn: async () => (await supabase.from("contratos").select("id,nome_cliente").eq("empresa_id", empresa_id)).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        empresa_id,
        user_id: user!.id,
        titulo: f.titulo,
        tipo: f.tipo,
        data_inicio: new Date(f.data_inicio).toISOString(),
        data_fim: f.data_fim ? new Date(f.data_fim).toISOString() : null,
        dia_todo: f.dia_todo,
        recorrente: f.recorrente,
        descricao: f.descricao || null,
        cor: f.cor,
        reuniao_id: f.reuniao_id || null,
        tarefa_id: f.tarefa_id || null,
        contrato_id: f.contrato_id || null,
      };
      if (evento) {
        const { error } = await supabase.from("agenda").update(payload).eq("id", evento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agenda").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", empresa_id] });
      toast.success(evento ? "Evento atualizado." : "Evento criado.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("agenda").delete().eq("id", evento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda", empresa_id] });
      toast.success("Evento excluído.");
      onClose();
    },
  });

  return (
    <Drawer open onOpenChange={(v) => !v && onClose()} title={evento ? "Evento" : "Novo evento"}>
      <div className="space-y-3 py-4">
        <Field label="Título *"><input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} className={inp}>
            {TIPO_OPTS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select></Field>
          <Field label="Cor">
            <div className="flex gap-1.5 h-9 items-center">
              {COLORS.map(c => (
                <button key={c} onClick={() => setF({ ...f, cor: c })} className={`size-6 rounded-full border-2 ${f.cor === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início *"><input type="datetime-local" value={f.data_inicio} onChange={e => setF({ ...f, data_inicio: e.target.value })} className={inp} /></Field>
          <Field label="Fim"><input type="datetime-local" value={f.data_fim} onChange={e => setF({ ...f, data_fim: e.target.value })} className={inp} /></Field>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={f.dia_todo} onChange={e => setF({ ...f, dia_todo: e.target.checked })} />Dia todo</label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={f.recorrente} onChange={e => setF({ ...f, recorrente: e.target.checked })} />Recorrente</label>
        </div>
        <Field label="Descrição"><textarea value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} className={inp + " min-h-[80px]"} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Reunião"><select value={f.reuniao_id} onChange={e => setF({ ...f, reuniao_id: e.target.value })} className={inp}>
            <option value="">—</option>
            {reunioes?.map(r => <option key={r.id} value={r.id}>{r.titulo}</option>)}
          </select></Field>
          <Field label="Tarefa"><select value={f.tarefa_id} onChange={e => setF({ ...f, tarefa_id: e.target.value })} className={inp}>
            <option value="">—</option>
            {tarefas?.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select></Field>
          <Field label="Contrato"><select value={f.contrato_id} onChange={e => setF({ ...f, contrato_id: e.target.value })} className={inp}>
            <option value="">—</option>
            {contratos?.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
          </select></Field>
        </div>
      </div>
      <div className="border-t border-border pt-3 flex gap-2">
        {evento && (
          <button onClick={() => { if (confirm("Excluir este evento?")) remove.mutate(); }} className="h-9 px-3 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
            Excluir
          </button>
        )}
        <button onClick={() => save.mutate()} disabled={!f.titulo || !f.data_inicio || save.isPending}
          className="ml-auto h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
          {save.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}