import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, type KeyboardEvent } from "react";
import { fmtDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/nexus/StatusBadge";
import { Drawer } from "@/components/nexus/Drawer";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { CalendarDays, Plus, ExternalLink, X, FileCheck, ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa/$id/reunioes")({ component: Reunioes });

type Tab = "proximas" | "realizadas" | "canceladas";
const TAB_LABEL: Record<Tab, string> = { proximas: "Próximas", realizadas: "Realizadas", canceladas: "Canceladas" };
const TIPO_OPTS = ["interna", "cliente", "parceiro", "investidor", "outro"] as const;
const STATUS_OPTS = ["agendada", "realizada", "cancelada", "remarcada"] as const;

function Reunioes() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/reunioes" });
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("proximas");
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["reunioes", empresa_id],
    queryFn: async () => (await supabase.from("reunioes").select("*").eq("empresa_id", empresa_id).order("data_hora", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    const ch = supabase.channel(`reunioes-${empresa_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reunioes", filter: `empresa_id=eq.${empresa_id}` }, () => {
        qc.invalidateQueries({ queryKey: ["reunioes", empresa_id] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [empresa_id, qc]);

  const filtered = (data ?? []).filter(r => {
    if (tab === "proximas") return r.status === "agendada" || r.status === "remarcada";
    if (tab === "realizadas") return r.status === "realizada";
    return r.status === "cancelada";
  }).sort((a, b) => {
    const da = new Date(a.data_hora).getTime(), db = new Date(b.data_hora).getTime();
    return tab === "proximas" ? da - db : db - da;
  });

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface border border-border rounded-md p-1">
          {(Object.keys(TAB_LABEL) as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-7 px-3 text-xs rounded ${tab === t ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5">
          <Plus className="size-3.5" />Nova reunião
        </button>
      </div>

      {isLoading ? <ListSkeleton /> : !filtered.length ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="Nada por aqui" description="Nenhuma reunião nesta aba." />
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const isLink = (r.local_ou_link || "").startsWith("http");
            return (
              <button key={r.id} onClick={() => setEditing(r)}
                className="w-full text-left bg-surface border border-border rounded-lg p-3 hover:border-primary/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="font-mono text-[11px] text-muted-foreground shrink-0 w-32">{fmtDateTime(r.data_hora)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{r.titulo}</span>
                      {r.tipo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground capitalize">{r.tipo}</span>}
                      <StatusBadge value={r.status} />
                      {tab === "realizadas" && r.resumo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success flex items-center gap-1"><FileCheck className="size-3" />Documentada</span>
                      )}
                      {isLink && <ExternalLink className="size-3 text-muted-foreground" />}
                    </div>
                    {(r.participantes?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(r.participantes ?? []).map((p: string, i: number) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <ReuniaoDrawer empresa_id={empresa_id} reuniao={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}
    </main>
  );
}

const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ReuniaoDrawer({ empresa_id, reuniao, onClose }: { empresa_id: string; reuniao?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(!reuniao);
  const [f, setF] = useState({
    titulo: reuniao?.titulo ?? "",
    tipo: reuniao?.tipo ?? "interna",
    data_hora: toLocalInput(reuniao?.data_hora) || toLocalInput(new Date().toISOString()),
    duracao_min: reuniao?.duracao_min ?? 60,
    local_ou_link: reuniao?.local_ou_link ?? "",
    participantes: (reuniao?.participantes ?? []) as string[],
    pauta: reuniao?.pauta ?? "",
    status: reuniao?.status ?? "agendada",
    pipeline_id: reuniao?.pipeline_id ?? "",
    contrato_id: reuniao?.contrato_id ?? "",
  });
  const [partInput, setPartInput] = useState("");
  const [docs, setDocs] = useState({
    resumo: reuniao?.resumo ?? "",
    decisoes: reuniao?.decisoes ?? "",
    proximos_passos: reuniao?.proximos_passos ?? "",
  });

  const { data: pipelines } = useQuery({
    queryKey: ["pipeline-opts", empresa_id],
    queryFn: async () => (await supabase.from("pipeline").select("id,nome_lead").eq("empresa_id", empresa_id)).data ?? [],
  });
  const { data: contratos } = useQuery({
    queryKey: ["contratos-opts", empresa_id],
    queryFn: async () => (await supabase.from("contratos").select("id,nome_cliente").eq("empresa_id", empresa_id)).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const data_hora = new Date(f.data_hora).toISOString();
      const payload: any = {
        empresa_id,
        user_id: user!.id,
        titulo: f.titulo,
        tipo: f.tipo,
        data_hora,
        duracao_min: Number(f.duracao_min) || 60,
        local_ou_link: f.local_ou_link || null,
        participantes: f.participantes,
        pauta: f.pauta || null,
        status: f.status,
        pipeline_id: f.pipeline_id || null,
        contrato_id: f.contrato_id || null,
      };
      let reuniaoId = reuniao?.id;
      if (reuniao) {
        const { error } = await supabase.from("reunioes").update(payload).eq("id", reuniao.id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("reunioes").insert(payload).select("id").single();
        if (error) throw error;
        reuniaoId = ins.id;
      }
      if (f.status === "agendada" && reuniaoId) {
        const start = new Date(data_hora);
        const end = new Date(start.getTime() + (Number(f.duracao_min) || 60) * 60000);
        const { data: existing } = await supabase.from("agenda").select("id").eq("reuniao_id", reuniaoId).maybeSingle();
        const agendaPayload: any = {
          empresa_id, user_id: user!.id, reuniao_id: reuniaoId, titulo: f.titulo,
          tipo: "reuniao", data_inicio: start.toISOString(), data_fim: end.toISOString(),
        };
        if (existing) await supabase.from("agenda").update(agendaPayload).eq("id", existing.id);
        else await supabase.from("agenda").insert(agendaPayload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reunioes", empresa_id] });
      qc.invalidateQueries({ queryKey: ["agenda", empresa_id] });
      toast.success(reuniao ? "Reunião atualizada." : "Reunião criada.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveDocs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reunioes").update(docs).eq("id", reuniao.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reunioes", empresa_id] });
      toast.success("Documentação salva.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reunioes").update({ status: "cancelada" }).eq("id", reuniao.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reunioes", empresa_id] });
      toast.success("Reunião cancelada.");
      onClose();
    },
  });

  const createTasks = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const linhas = (docs.proximos_passos || "").split("\n").map((s: string) => s.trim()).filter(Boolean);
      if (!linhas.length) throw new Error("Sem próximos passos definidos.");
      const rows = linhas.map((t: string) => ({
        empresa_id, user_id: user!.id, titulo: t, prioridade: "media", status: "aberta", reuniao_id: reuniao.id,
      }));
      const { error } = await supabase.from("tarefas").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["tarefas", empresa_id] });
      toast.success(`${n} tarefa(s) criada(s).`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function addParticipante() {
    const v = partInput.trim();
    if (!v) return;
    setF({ ...f, participantes: [...f.participantes, v] });
    setPartInput("");
  }
  function onPartKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addParticipante(); }
  }

  const readOnly = !!reuniao && !editMode;

  return (
    <Drawer open onOpenChange={(v) => !v && onClose()} title={reuniao ? "Reunião" : "Nova reunião"}>
      <div className="space-y-3 py-4">
        {readOnly ? (
          <ReadView reuniao={reuniao} />
        ) : (
          <>
            <Field label="Título *"><input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} className={inp} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} className={inp}>
                {TIPO_OPTS.map(o => <option key={o}>{o}</option>)}
              </select></Field>
              <Field label="Status"><select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className={inp}>
                {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
              </select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data e hora *"><input type="datetime-local" value={f.data_hora} onChange={e => setF({ ...f, data_hora: e.target.value })} className={inp} /></Field>
              <Field label="Duração (min)"><input type="number" value={f.duracao_min} onChange={e => setF({ ...f, duracao_min: Number(e.target.value) })} className={inp} /></Field>
            </div>
            <Field label="Local ou link"><input value={f.local_ou_link} onChange={e => setF({ ...f, local_ou_link: e.target.value })} placeholder="https://meet… ou endereço" className={inp} /></Field>
            <Field label="Participantes">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {f.participantes.map((p, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-background border border-border flex items-center gap-1">
                    {p}
                    <button onClick={() => setF({ ...f, participantes: f.participantes.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
                  </span>
                ))}
              </div>
              <input value={partInput} onChange={e => setPartInput(e.target.value)} onKeyDown={onPartKey} placeholder="Digite e Enter" className={inp} />
            </Field>
            <Field label="Pauta"><textarea value={f.pauta} onChange={e => setF({ ...f, pauta: e.target.value })} className={inp + " min-h-[80px]"} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pipeline"><select value={f.pipeline_id} onChange={e => setF({ ...f, pipeline_id: e.target.value })} className={inp}>
                <option value="">—</option>
                {pipelines?.map(p => <option key={p.id} value={p.id}>{p.nome_lead}</option>)}
              </select></Field>
              <Field label="Contrato"><select value={f.contrato_id} onChange={e => setF({ ...f, contrato_id: e.target.value })} className={inp}>
                <option value="">—</option>
                {contratos?.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
              </select></Field>
            </div>
          </>
        )}

        {reuniao && reuniao.status === "realizada" && (
          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentação</h4>
            <Field label="Resumo"><textarea value={docs.resumo} onChange={e => setDocs({ ...docs, resumo: e.target.value })} className={inp + " min-h-[70px]"} /></Field>
            <Field label="Decisões"><textarea value={docs.decisoes} onChange={e => setDocs({ ...docs, decisoes: e.target.value })} className={inp + " min-h-[70px]"} /></Field>
            <Field label="Próximos passos (uma linha por tarefa)"><textarea value={docs.proximos_passos} onChange={e => setDocs({ ...docs, proximos_passos: e.target.value })} className={inp + " min-h-[70px]"} /></Field>
            <div className="flex gap-2">
              <button onClick={() => saveDocs.mutate()} disabled={saveDocs.isPending} className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-50">Salvar documentação</button>
              <button onClick={() => createTasks.mutate()} disabled={createTasks.isPending || !docs.proximos_passos.trim()} className="h-8 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1.5">
                <ListChecks className="size-3.5" />Criar tarefas dos próximos passos
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3 flex gap-2">
        {reuniao && reuniao.status !== "cancelada" && (
          <button onClick={() => { if (confirm("Cancelar esta reunião?")) cancel.mutate(); }} className="h-9 px-3 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
            Cancelar reunião
          </button>
        )}
        {reuniao && !editMode && (
          <button onClick={() => setEditMode(true)} className="h-9 px-3 rounded-md border border-border text-xs hover:bg-accent">Editar</button>
        )}
        {(editMode || !reuniao) && (
          <button onClick={() => save.mutate()} disabled={!f.titulo || !f.data_hora || save.isPending}
            className="ml-auto h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
            {save.isPending ? "Salvando…" : "Salvar"}
          </button>
        )}
      </div>
    </Drawer>
  );
}

function ReadView({ reuniao }: { reuniao: any }) {
  const isLink = (reuniao.local_ou_link || "").startsWith("http");
  return (
    <div className="space-y-3 text-sm">
      <Row label="Título" value={<span className="font-semibold">{reuniao.titulo}</span>} />
      <div className="grid grid-cols-2 gap-3">
        <Row label="Tipo" value={<span className="capitalize">{reuniao.tipo}</span>} />
        <Row label="Status" value={<StatusBadge value={reuniao.status} />} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Data e hora" value={<span className="font-mono text-xs">{fmtDateTime(reuniao.data_hora)}</span>} />
        <Row label="Duração" value={<span>{reuniao.duracao_min} min</span>} />
      </div>
      {reuniao.local_ou_link && (
        <Row label="Local / link" value={isLink
          ? <a href={reuniao.local_ou_link} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">{reuniao.local_ou_link}<ExternalLink className="size-3" /></a>
          : <span>{reuniao.local_ou_link}</span>} />
      )}
      {reuniao.participantes?.length > 0 && (
        <Row label="Participantes" value={
          <div className="flex flex-wrap gap-1">
            {reuniao.participantes.map((p: string, i: number) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-background border border-border">{p}</span>
            ))}
          </div>
        } />
      )}
      {reuniao.pauta && <Row label="Pauta" value={<p className="whitespace-pre-wrap text-xs text-muted-foreground">{reuniao.pauta}</p>} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground mb-1">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{label}</label>{children}</div>;
}