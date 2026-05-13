import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { fmtDate } from "@/lib/format";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tarefas")({ component: TarefasGlobal });

const STATUS_ALL = ["aberta","em_andamento","bloqueada","concluida","cancelada"] as const;
const STATUS_LABEL: Record<string,string> = {
  aberta:"Aberta", em_andamento:"Em andamento", bloqueada:"Bloqueada",
  concluida:"Concluída", cancelada:"Cancelada",
};
const PRIO_OPTS = ["critica","alta","media","baixa"] as const;
const PRIO_RANK: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const PRIO_LABEL: Record<string,string> = { critica:"Crítica", alta:"Alta", media:"Média", baixa:"Baixa" };
const PRIO_CLS: Record<string,string> = {
  critica: "bg-destructive text-destructive-foreground animate-pulse",
  alta: "bg-orange-500/20 text-orange-400",
  media: "bg-primary/20 text-primary",
  baixa: "bg-muted text-muted-foreground",
};
const inp = "h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function TarefasGlobal() {
  const qc = useQueryClient();
  const [fEmp, setFEmp] = useState("");
  const [fPrio, setFPrio] = useState("");
  const [fStatus, setFStatus] = useState("");

  const { data: empresas } = useQuery({
    queryKey: ["empresas-all-min"],
    queryFn: async () => (await supabase.from("empresas").select("id,nome,cor_identidade")).data ?? [],
  });
  const empresaMap = useMemo(
    () => Object.fromEntries((empresas ?? []).map(e => [e.id, e])),
    [empresas]
  );

  const { data: membros } = useQuery({
    queryKey: ["membros-all-min"],
    queryFn: async () => (await supabase.from("membros").select("id,nome")).data ?? [],
  });
  const membroMap = useMemo(
    () => Object.fromEntries((membros ?? []).map((m: any) => [m.id, m.nome])),
    [membros]
  );

  const { data: tarefas, isLoading } = useQuery({
    queryKey: ["tarefas-global"],
    queryFn: async () => (
      await supabase.from("tarefas").select("*").not("status", "in", "(concluida,cancelada)")
    ).data ?? [],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      patch.concluida_em = status === "concluida" ? new Date().toISOString() : null;
      const { error } = await supabase.from("tarefas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas-global"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let arr = [...(tarefas ?? [])];
    if (fEmp) arr = arr.filter((t: any) => t.empresa_id === fEmp);
    if (fPrio) arr = arr.filter((t: any) => t.prioridade === fPrio);
    if (fStatus) arr = arr.filter((t: any) => t.status === fStatus);
    arr.sort((a: any, b: any) => {
      const da = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
      const db = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
      if (da !== db) return da - db;
      return (PRIO_RANK[a.prioridade] ?? 9) - (PRIO_RANK[b.prioridade] ?? 9);
    });
    return arr;
  }, [tarefas, fEmp, fPrio, fStatus]);

  return (
    <>
      <Header title="Minhas Tarefas — todas as empresas" />
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-surface border border-border rounded-lg">
          <div className="flex flex-wrap gap-2 p-3 border-b border-border">
            <select value={fEmp} onChange={e => setFEmp(e.target.value)} className={inp + " max-w-[220px]"}>
              <option value="">Empresa: todas</option>
              {(empresas ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select value={fPrio} onChange={e => setFPrio(e.target.value)} className={inp + " max-w-[180px]"}>
              <option value="">Prioridade: todas</option>
              {PRIO_OPTS.map(p => <option key={p} value={p}>{PRIO_LABEL[p]}</option>)}
            </select>
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={inp + " max-w-[180px]"}>
              <option value="">Status: todos</option>
              {STATUS_ALL.filter(s => s !== "concluida" && s !== "cancelada").map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {isLoading ? <div className="p-4"><ListSkeleton /></div> : filtered.length === 0 ? (
            <div className="p-6"><EmptyState icon={<ListChecks className="size-5" />} title="Sem tarefas pendentes" description="Tudo em dia." /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[11px] text-muted-foreground uppercase tracking-wider">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-3 py-2">Empresa</th>
                  <th className="text-left font-medium px-3 py-2">Título</th>
                  <th className="text-left font-medium px-3 py-2">Responsável</th>
                  <th className="text-left font-medium px-3 py-2">Prioridade</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Data limite</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t: any) => {
                  const emp = empresaMap[t.empresa_id];
                  const overdue = t.data_limite && new Date(t.data_limite).getTime() < Date.now();
                  return (
                    <tr key={t.id} className="border-b border-border hover:bg-background">
                      <td className="px-3 py-2">
                        {emp && (
                          <Link to="/empresa/$id/tarefas" params={{ id: t.empresa_id }}
                            className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium hover:opacity-80"
                            style={{ background: emp.cor_identidade + "22", color: emp.cor_identidade }}>
                            <span className="size-1.5 rounded-full" style={{ background: emp.cor_identidade }} />
                            {emp.nome}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">{t.titulo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{(t.responsavel_id && membroMap[t.responsavel_id]) || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIO_CLS[t.prioridade] ?? PRIO_CLS.media}`}>
                          {PRIO_LABEL[t.prioridade] ?? t.prioridade}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <select value={t.status} onChange={e => updateStatus.mutate({ id: t.id, status: e.target.value })}
                          className="h-6 text-[10px] px-1.5 rounded bg-background border border-border focus:outline-none">
                          {STATUS_ALL.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td className={`px-3 py-2 font-mono text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {t.data_limite ? fmtDate(t.data_limite) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
