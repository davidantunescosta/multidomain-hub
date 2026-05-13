import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { fmtDate } from "@/lib/format";
import { StatusBadge } from "@/components/nexus/StatusBadge";
import { Drawer } from "@/components/nexus/Drawer";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { ListChecks, Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent,
} from "@dnd-kit/core";

export const Route = createFileRoute("/_authenticated/empresa/$id/tarefas")({ component: Tarefas });

const STATUS_COLS = ["aberta", "em_andamento", "bloqueada", "concluida"] as const;
const STATUS_ALL = ["aberta", "em_andamento", "bloqueada", "concluida", "cancelada"] as const;
const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta", em_andamento: "Em andamento", bloqueada: "Bloqueada",
  concluida: "Concluída", cancelada: "Cancelada",
};
const PRIO_OPTS = ["critica", "alta", "media", "baixa"] as const;
const PRIO_LABEL: Record<string, string> = { critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa" };
const PRIO_CLS: Record<string, string> = {
  critica: "bg-destructive text-destructive-foreground animate-pulse",
  alta: "bg-orange-500/20 text-orange-400",
  media: "bg-primary/20 text-primary",
  baixa: "bg-muted text-muted-foreground",
};

const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

type Tarefa = any;

function Tarefas() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/tarefas" });
  const qc = useQueryClient();
  const [view, setView] = useState<"board" | "lista">("board");
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [creating, setCreating] = useState<{ status?: string } | null>(null);
  const [fPrio, setFPrio] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("");

  const { data: tarefas, isLoading } = useQuery({
    queryKey: ["tarefas", empresa_id],
    queryFn: async () => (await supabase.from("tarefas").select("*").eq("empresa_id", empresa_id)).data ?? [],
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-opts", empresa_id],
    queryFn: async () => (await supabase.from("membros").select("id,nome").eq("empresa_id", empresa_id)).data ?? [],
  });

  const membroMap = useMemo(() => Object.fromEntries((membros ?? []).map(m => [m.id, m.nome])), [membros]);

  useEffect(() => {
    const ch = supabase.channel(`tarefas-${empresa_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefas", filter: `empresa_id=eq.${empresa_id}` },
        () => qc.invalidateQueries({ queryKey: ["tarefas", empresa_id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [empresa_id, qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "concluida") patch.concluida_em = new Date().toISOString();
      else patch.concluida_em = null;
      const { error } = await supabase.from("tarefas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas", empresa_id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const newStatus = e.over?.id ? String(e.over.id) : null;
    if (!newStatus) return;
    const t = (tarefas ?? []).find((x: any) => x.id === id);
    if (!t || t.status === newStatus) return;
    updateStatus.mutate({ id, status: newStatus });
  }

  const filteredList = useMemo(() => {
    let arr = [...(tarefas ?? [])];
    if (fPrio) arr = arr.filter(t => t.prioridade === fPrio);
    if (fStatus) arr = arr.filter(t => t.status === fStatus);
    arr.sort((a, b) => {
      const da = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
      const db = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
      return da - db;
    });
    return arr;
  }, [tarefas, fPrio, fStatus]);

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface border border-border rounded-md p-1">
          <button onClick={() => setView("board")} className={`h-7 px-3 text-xs rounded inline-flex items-center gap-1.5 ${view === "board" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="size-3.5" />Board
          </button>
          <button onClick={() => setView("lista")} className={`h-7 px-3 text-xs rounded inline-flex items-center gap-1.5 ${view === "lista" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <ListIcon className="size-3.5" />Lista
          </button>
        </div>
        <button onClick={() => setCreating({})} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5">
          <Plus className="size-3.5" />Nova tarefa
        </button>
      </div>

      {isLoading ? <ListSkeleton /> : (tarefas?.length ?? 0) === 0 ? (
        <EmptyState icon={<ListChecks className="size-5" />} title="Sem tarefas" description="Crie sua primeira tarefa." />
      ) : view === "board" ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {STATUS_COLS.map(col => (
              <Column key={col} status={col} tarefas={(tarefas ?? []).filter((t: any) => t.status === col)}
                onAdd={() => setCreating({ status: col })} onClick={(t) => setEditing(t)}
                membroMap={membroMap} onQuickStatus={(id, s) => updateStatus.mutate({ id, status: s })} />
            ))}
          </div>
        </DndContext>
      ) : (
        <ListView tarefas={filteredList} membroMap={membroMap}
          fPrio={fPrio} setFPrio={setFPrio} fStatus={fStatus} setFStatus={setFStatus}
          onClick={(t) => setEditing(t)} onQuickStatus={(id, s) => updateStatus.mutate({ id, status: s })} />
      )}

      {(creating || editing) && (
        <TarefaDrawer empresa_id={empresa_id} tarefa={editing} initialStatus={creating?.status}
          onClose={() => { setCreating(null); setEditing(null); }} />
      )}
    </main>
  );
}

function Column({ status, tarefas, onAdd, onClick, membroMap, onQuickStatus }: {
  status: string; tarefas: any[]; onAdd: () => void; onClick: (t: any) => void;
  membroMap: Record<string, string>; onQuickStatus: (id: string, s: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const concluded = status === "concluida";
  const [showAll, setShowAll] = useState(false);
  const visible = concluded && !showAll ? [] : tarefas;

  return (
    <div ref={setNodeRef} className={`bg-surface border rounded-lg flex flex-col min-h-[200px] ${isOver ? "border-primary" : "border-border"}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <StatusBadge value={status} />
          <span className="text-[11px] text-muted-foreground">{tarefas.length}</span>
        </div>
        <button onClick={onAdd} className="size-6 grid place-items-center rounded hover:bg-accent text-muted-foreground" title="Nova tarefa">
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="p-2 space-y-2 flex-1">
        {visible.map(t => (
          <Card key={t.id} t={t} onClick={() => onClick(t)} membroMap={membroMap} onQuickStatus={onQuickStatus} />
        ))}
        {concluded && tarefas.length > 0 && !showAll && (
          <button onClick={() => setShowAll(true)} className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-2">
            Ver {tarefas.length} concluída{tarefas.length > 1 ? "s" : ""}
          </button>
        )}
        {concluded && showAll && (
          <button onClick={() => setShowAll(false)} className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-2">Ocultar concluídas</button>
        )}
      </div>
    </div>
  );
}

function Card({ t, onClick, membroMap, onQuickStatus }: { t: any; onClick: () => void; membroMap: Record<string, string>; onQuickStatus: (id: string, s: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id });
  const overdue = t.data_limite && new Date(t.data_limite).getTime() < Date.now() && t.status !== "concluida";
  const ctx = t.pipeline_id ? "pipeline" : t.reuniao_id ? "reunião" : t.contrato_id ? "contrato" : null;

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, opacity: isDragging ? 0.5 : 1 }}
      className="bg-background border border-border rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors">
      <div onClick={onClick} className="space-y-1.5">
        <div className="text-sm font-semibold leading-tight">{t.titulo}</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIO_CLS[t.prioridade] ?? PRIO_CLS.media}`}>{PRIO_LABEL[t.prioridade] ?? t.prioridade}</span>
          {t.data_limite && (
            <span className={`text-[10px] font-mono ${overdue ? "text-destructive" : "text-muted-foreground"}`}>{fmtDate(t.data_limite)}</span>
          )}
          {t.responsavel_id && membroMap[t.responsavel_id] && (
            <span className="text-[10px] text-muted-foreground">· {membroMap[t.responsavel_id]}</span>
          )}
          {ctx && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">{ctx}</span>}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border" onPointerDown={(e) => e.stopPropagation()}>
        <select value={t.status} onChange={(e) => onQuickStatus(t.id, e.target.value)}
          className="w-full h-6 text-[10px] px-1.5 rounded bg-surface border border-border text-muted-foreground hover:text-foreground focus:outline-none">
          {STATUS_ALL.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
    </div>
  );
}

function ListView({ tarefas, membroMap, fPrio, setFPrio, fStatus, setFStatus, onClick, onQuickStatus }: {
  tarefas: any[]; membroMap: Record<string, string>;
  fPrio: string; setFPrio: (v: string) => void; fStatus: string; setFStatus: (v: string) => void;
  onClick: (t: any) => void; onQuickStatus: (id: string, s: string) => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg">
      <div className="flex gap-2 p-3 border-b border-border">
        <select value={fPrio} onChange={(e) => setFPrio(e.target.value)} className={inp + " max-w-[180px]"}>
          <option value="">Prioridade: todas</option>
          {PRIO_OPTS.map(p => <option key={p} value={p}>{PRIO_LABEL[p]}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={inp + " max-w-[180px]"}>
          <option value="">Status: todos</option>
          {STATUS_ALL.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] text-muted-foreground uppercase tracking-wider">
          <tr className="border-b border-border">
            <th className="text-left font-medium px-3 py-2">Título</th>
            <th className="text-left font-medium px-3 py-2">Responsável</th>
            <th className="text-left font-medium px-3 py-2">Prioridade</th>
            <th className="text-left font-medium px-3 py-2">Status</th>
            <th className="text-left font-medium px-3 py-2">Data limite</th>
            <th className="text-left font-medium px-3 py-2">Contexto</th>
          </tr>
        </thead>
        <tbody>
          {tarefas.map(t => {
            const overdue = t.data_limite && new Date(t.data_limite).getTime() < Date.now() && t.status !== "concluida";
            const ctx = t.pipeline_id ? "pipeline" : t.reuniao_id ? "reunião" : t.contrato_id ? "contrato" : "—";
            return (
              <tr key={t.id} onClick={() => onClick(t)} className="border-b border-border hover:bg-background cursor-pointer">
                <td className="px-3 py-2 font-medium">{t.titulo}</td>
                <td className="px-3 py-2 text-muted-foreground">{(t.responsavel_id && membroMap[t.responsavel_id]) || "—"}</td>
                <td className="px-3 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIO_CLS[t.prioridade] ?? PRIO_CLS.media}`}>{PRIO_LABEL[t.prioridade] ?? t.prioridade}</span></td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <select value={t.status} onChange={(e) => onQuickStatus(t.id, e.target.value)} className="h-6 text-[10px] px-1.5 rounded bg-background border border-border focus:outline-none">
                    {STATUS_ALL.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className={`px-3 py-2 font-mono text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>{t.data_limite ? fmtDate(t.data_limite) : "—"}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{ctx}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TarefaDrawer({ empresa_id, tarefa, initialStatus, onClose }: {
  empresa_id: string; tarefa?: Tarefa | null; initialStatus?: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    titulo: tarefa?.titulo ?? "",
    descricao: tarefa?.descricao ?? "",
    responsavel_id: tarefa?.responsavel_id ?? "",
    prioridade: tarefa?.prioridade ?? "media",
    status: tarefa?.status ?? initialStatus ?? "aberta",
    data_limite: tarefa?.data_limite ? String(tarefa.data_limite).slice(0, 10) : "",
    pipeline_id: tarefa?.pipeline_id ?? "",
    reuniao_id: tarefa?.reuniao_id ?? "",
    contrato_id: tarefa?.contrato_id ?? "",
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-opts", empresa_id],
    queryFn: async () => (await supabase.from("membros").select("id,nome").eq("empresa_id", empresa_id)).data ?? [],
  });
  const { data: pipelines } = useQuery({
    queryKey: ["pipeline-opts", empresa_id],
    queryFn: async () => (await supabase.from("pipeline").select("id,nome_lead").eq("empresa_id", empresa_id)).data ?? [],
  });
  const { data: reunioes } = useQuery({
    queryKey: ["reunioes-opts", empresa_id],
    queryFn: async () => (await supabase.from("reunioes").select("id,titulo").eq("empresa_id", empresa_id)).data ?? [],
  });
  const { data: contratos } = useQuery({
    queryKey: ["contratos-opts", empresa_id],
    queryFn: async () => (await supabase.from("contratos").select("id,nome_cliente").eq("empresa_id", empresa_id)).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const wasConcluded = tarefa?.status === "concluida";
      const isConcluded = f.status === "concluida";
      const payload: any = {
        empresa_id,
        user_id: user!.id,
        titulo: f.titulo,
        descricao: f.descricao || null,
        responsavel_id: f.responsavel_id || null,
        prioridade: f.prioridade,
        status: f.status,
        data_limite: f.data_limite ? new Date(f.data_limite).toISOString() : null,
        pipeline_id: f.pipeline_id || null,
        reuniao_id: f.reuniao_id || null,
        contrato_id: f.contrato_id || null,
        concluida_em: isConcluded ? (wasConcluded ? tarefa?.concluida_em : new Date().toISOString()) : null,
      };
      if (tarefa) {
        const { error } = await supabase.from("tarefas").update(payload).eq("id", tarefa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tarefas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas", empresa_id] });
      toast.success(tarefa ? "Tarefa atualizada." : "Tarefa criada.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tarefas").delete().eq("id", tarefa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas", empresa_id] });
      toast.success("Tarefa excluída.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Drawer open onOpenChange={(v) => !v && onClose()} title={tarefa ? "Tarefa" : "Nova tarefa"}>
      <div className="space-y-3 py-4">
        <Field label="Título *"><input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} className={inp} /></Field>
        <Field label="Descrição"><textarea value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} className={inp + " min-h-[80px]"} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Responsável"><select value={f.responsavel_id} onChange={e => setF({ ...f, responsavel_id: e.target.value })} className={inp}>
            <option value="">—</option>
            {membros?.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select></Field>
          <Field label="Data limite"><input type="date" value={f.data_limite} onChange={e => setF({ ...f, data_limite: e.target.value })} className={inp} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prioridade"><select value={f.prioridade} onChange={e => setF({ ...f, prioridade: e.target.value })} className={inp}>
            {PRIO_OPTS.map(p => <option key={p} value={p}>{PRIO_LABEL[p]}</option>)}
          </select></Field>
          <Field label="Status"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className={inp}>
            {STATUS_ALL.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Pipeline"><select value={f.pipeline_id} onChange={e => setF({ ...f, pipeline_id: e.target.value })} className={inp}>
            <option value="">—</option>
            {pipelines?.map(p => <option key={p.id} value={p.id}>{p.nome_lead}</option>)}
          </select></Field>
          <Field label="Reunião"><select value={f.reuniao_id} onChange={e => setF({ ...f, reuniao_id: e.target.value })} className={inp}>
            <option value="">—</option>
            {reunioes?.map(r => <option key={r.id} value={r.id}>{r.titulo}</option>)}
          </select></Field>
          <Field label="Contrato"><select value={f.contrato_id} onChange={e => setF({ ...f, contrato_id: e.target.value })} className={inp}>
            <option value="">—</option>
            {contratos?.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
          </select></Field>
        </div>
      </div>
      <div className="border-t border-border pt-3 flex gap-2">
        {tarefa && (
          <button onClick={() => { if (confirm("Excluir esta tarefa?")) remove.mutate(); }} className="h-9 px-3 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
            Excluir
          </button>
        )}
        <button onClick={() => save.mutate()} disabled={!f.titulo || save.isPending}
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