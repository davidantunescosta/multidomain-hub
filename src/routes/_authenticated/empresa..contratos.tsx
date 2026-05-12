import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { fmtBRL, fmtDate } from "@/lib/format";
import { StatusBadge } from "@/components/nexus/StatusBadge";
import { Drawer } from "@/components/nexus/Drawer";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa/contratos")({ component: Contratos });

function Contratos() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/contratos" });
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["contratos", empresa_id],
    queryFn: async () => (await supabase.from("contratos").select("*,membros(nome)").eq("empresa_id",empresa_id).order("created_at",{ascending:false})).data ?? [],
  });

  const ativos = (data ?? []).filter(c => c.status === "ativo");
  const mrr = ativos.filter(c => c.periodicidade === "mensal").reduce((s,c) => s + Number(c.valor_recorrente||0), 0);
  const arr = mrr * 12;
  const tcv = ativos.reduce((s,c) => s + Number(c.valor_total||0), 0);

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="MRR" value={fmtBRL(mrr)}/>
        <Kpi label="ARR" value={fmtBRL(arr)}/>
        <Kpi label="TCV ativo" value={fmtBRL(tcv)}/>
        <Kpi label="Contratos ativos" value={ativos.length}/>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold">Contratos</h2>
        <button onClick={()=>setCreating(true)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5">
          <Plus className="size-3.5"/>Novo contrato
        </button>
      </div>

      {isLoading ? <ListSkeleton/> : !data?.length ? (
        <EmptyState icon={<FileText className="size-5"/>} title="Sem contratos" action={
          <button onClick={()=>setCreating(true)} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium">Criar contrato</button>
        }/>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-background border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left px-3 py-2">Cliente</th><th className="text-left px-3 py-2">Descrição</th>
                <th className="text-right px-3 py-2">Total</th><th className="text-right px-3 py-2">Recorrente</th>
                <th className="text-left px-3 py-2">Início</th><th className="text-left px-3 py-2">Fim</th>
                <th className="text-left px-3 py-2">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map(c => {
                const venceEm7 = c.data_fim && new Date(c.data_fim) < new Date(Date.now()+7*86400000) && new Date(c.data_fim) >= new Date();
                const vencido = c.data_fim && new Date(c.data_fim) < new Date();
                return (
                  <tr key={c.id} onClick={()=>setEditing(c)} className="hover:bg-accent/40 cursor-pointer">
                    <td className="px-3 py-2 font-medium">{c.nome_cliente}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.descricao}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtBRL(c.valor_total)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{c.valor_recorrente ? fmtBRL(c.valor_recorrente) : "—"}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{fmtDate(c.data_inicio)}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{fmtDate(c.data_fim)} {vencido && <span className="ml-1 text-destructive">vencido</span>} {venceEm7 && !vencido && <span className="ml-1 text-warning">vence</span>}</td>
                    <td className="px-3 py-2"><StatusBadge value={c.status}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && <ContratoDrawer empresa_id={empresa_id} contrato={editing} onClose={() => { setCreating(false); setEditing(null); }}/>}
    </main>
  );
}

function Kpi({ label, value }: any) {
  return <div className="bg-surface border border-border rounded-lg p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold font-mono mt-1">{value}</div>
  </div>;
}

const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function ContratoDrawer({ empresa_id, contrato, onClose }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nome_cliente: contrato?.nome_cliente ?? "", descricao: contrato?.descricao ?? "",
    valor_total: contrato?.valor_total ?? "", valor_recorrente: contrato?.valor_recorrente ?? "",
    periodicidade: contrato?.periodicidade ?? "mensal", status: contrato?.status ?? "em_negociacao",
    data_inicio: contrato?.data_inicio?.slice(0,10) ?? "", data_fim: contrato?.data_fim?.slice(0,10) ?? "",
    observacoes: contrato?.observacoes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { empresa_id, ...f,
        valor_total: f.valor_total ? Number(f.valor_total) : null,
        valor_recorrente: f.valor_recorrente ? Number(f.valor_recorrente) : null,
        data_inicio: f.data_inicio || null, data_fim: f.data_fim || null,
        descricao: f.descricao || null, observacoes: f.observacoes || null,
      };
      if (contrato) {
        const { error } = await supabase.from("contratos").update(payload).eq("id", contrato.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contratos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["contratos",empresa_id]}); toast.success("Salvo."); onClose(); },
    onError: (e:any) => toast.error(e.message),
  });

  const { data: fin } = useQuery({
    queryKey: ["contrato-fin", contrato?.id],
    queryFn: async () => (await supabase.from("financeiro").select("*").eq("contrato_id", contrato.id)).data ?? [],
    enabled: !!contrato?.id,
  });

  return (
    <Drawer open onOpenChange={(v)=>!v&&onClose()} title={contrato ? "Editar contrato" : "Novo contrato"}>
      <div className="space-y-3 py-4">
        <Field label="Cliente *"><input value={f.nome_cliente} onChange={e=>setF({...f,nome_cliente:e.target.value})} className={inp}/></Field>
        <Field label="Descrição"><textarea value={f.descricao} onChange={e=>setF({...f,descricao:e.target.value})} className={inp+" min-h-[60px]"}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor total (R$)"><input type="number" value={f.valor_total} onChange={e=>setF({...f,valor_total:e.target.value})} className={inp}/></Field>
          <Field label="Valor recorrente (R$)"><input type="number" value={f.valor_recorrente} onChange={e=>setF({...f,valor_recorrente:e.target.value})} className={inp}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Periodicidade"><select value={f.periodicidade} onChange={e=>setF({...f,periodicidade:e.target.value})} className={inp}>
            {["mensal","trimestral","semestral","anual","avulso"].map(p=><option key={p}>{p}</option>)}
          </select></Field>
          <Field label="Status"><select value={f.status} onChange={e=>setF({...f,status:e.target.value})} className={inp}>
            {["em_negociacao","ativo","pausado","encerrado","cancelado"].map(s=><option key={s}>{s}</option>)}
          </select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início"><input type="date" value={f.data_inicio} onChange={e=>setF({...f,data_inicio:e.target.value})} className={inp}/></Field>
          <Field label="Fim"><input type="date" value={f.data_fim} onChange={e=>setF({...f,data_fim:e.target.value})} className={inp}/></Field>
        </div>
        <Field label="Observações"><textarea value={f.observacoes} onChange={e=>setF({...f,observacoes:e.target.value})} className={inp+" min-h-[60px]"}/></Field>

        {contrato && fin && fin.length > 0 && (
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-semibold mb-2">Financeiro vinculado</h4>
            <div className="space-y-1.5">
              {fin.map(x => (
                <div key={x.id} className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border">
                  <span>{x.descricao}</span>
                  <span className="font-mono">{fmtBRL(x.valor)}</span>
                  <StatusBadge value={x.status_pagamento}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border pt-3 flex">
        <button onClick={()=>save.mutate()} disabled={!f.nome_cliente || save.isPending} className="ml-auto h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
          {save.isPending?"Salvando…":"Salvar"}
        </button>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: any) {
  return <div><label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{label}</label>{children}</div>;
}
