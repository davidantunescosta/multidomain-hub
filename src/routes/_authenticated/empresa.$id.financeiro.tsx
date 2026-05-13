import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Drawer } from "@/components/nexus/Drawer";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { Plus, Wallet, Check } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/empresa/$id/financeiro")({ component: Financeiro });

const TIPO_OPTS = ["receita", "despesa", "investimento"] as const;
const STATUS_OPTS = ["pendente", "pago", "atrasado", "cancelado"] as const;
const TIPO_CLS: Record<string, string> = {
  receita: "bg-success/15 text-success",
  despesa: "bg-destructive/15 text-destructive",
  investimento: "bg-blue-500/15 text-blue-300",
};
const STATUS_CLS: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-300",
  pago: "bg-success/15 text-success",
  atrasado: "bg-destructive/15 text-destructive",
  cancelado: "bg-zinc-500/15 text-zinc-300",
};
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function Financeiro() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/financeiro" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [fTipo, setFTipo] = useState("");
  const [fStatus, setFStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["financeiro", empresa_id],
    queryFn: async () => (await supabase.from("financeiro").select("*").eq("empresa_id", empresa_id)).data ?? [],
  });

  const now = new Date();
  const mesAtual = now.getMonth(), anoAtual = now.getFullYear();

  const kpis = useMemo(() => {
    const arr = data ?? [];
    const inMonth = (d?: string | null) => {
      if (!d) return false;
      const x = new Date(d);
      return x.getMonth() === mesAtual && x.getFullYear() === anoAtual;
    };
    const sum = (rows: any[]) => rows.reduce((s, r) => s + Number(r.valor || 0), 0);
    const receitas = sum(arr.filter(r => r.tipo === "receita" && inMonth(r.data_vencimento)));
    const despesas = sum(arr.filter(r => r.tipo === "despesa" && inMonth(r.data_vencimento)));
    const inadimp = sum(arr.filter(r => r.status_pagamento === "atrasado"));
    return { receitas, despesas, saldo: receitas - despesas, inadimp };
  }, [data, mesAtual, anoAtual]);

  const chartData = useMemo(() => {
    const arr = data ?? [];
    const months: { key: string; label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MESES[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
    }
    return months.map(m => {
      const rows = arr.filter(r => {
        if (!r.data_vencimento) return false;
        const x = new Date(r.data_vencimento);
        return x.getMonth() === m.month && x.getFullYear() === m.year;
      });
      return {
        mes: m.label,
        Receitas: rows.filter(r => r.tipo === "receita").reduce((s, r) => s + Number(r.valor || 0), 0),
        Despesas: rows.filter(r => r.tipo === "despesa").reduce((s, r) => s + Number(r.valor || 0), 0),
      };
    });
  }, [data, mesAtual, anoAtual]);

  const lista = useMemo(() => {
    let arr = [...(data ?? [])];
    if (fTipo) arr = arr.filter(r => r.tipo === fTipo);
    if (fStatus) arr = arr.filter(r => r.status_pagamento === fStatus);
    arr.sort((a, b) => {
      const da = a.data_vencimento ? new Date(a.data_vencimento).getTime() : Infinity;
      const db = b.data_vencimento ? new Date(b.data_vencimento).getTime() : Infinity;
      return da - db;
    });
    return arr;
  }, [data, fTipo, fStatus]);

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financeiro").update({ status_pagamento: "pago", data_pagamento: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financeiro", empresa_id] }); toast.success("Marcado como pago."); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Financeiro</h2>
        <button onClick={() => setCreating(true)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5">
          <Plus className="size-3.5" />Novo lançamento
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Receitas do mês" value={fmtBRL(kpis.receitas)} tone="success" />
        <Kpi label="Despesas do mês" value={fmtBRL(kpis.despesas)} tone="destructive" />
        <Kpi label="Saldo" value={fmtBRL(kpis.saldo)} tone={kpis.saldo >= 0 ? "success" : "destructive"} />
        <Kpi label="Inadimplência" value={fmtBRL(kpis.inadimp)} tone={kpis.inadimp > 0 ? "destructive" : "muted"} />
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Receitas vs Despesas (6 meses)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => fmtBRL(v).replace("R$", "")} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                formatter={(v: any) => fmtBRL(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg">
        <div className="flex gap-2 p-3 border-b border-border">
          <select value={fTipo} onChange={e => setFTipo(e.target.value)} className={inp + " max-w-[180px]"}>
            <option value="">Tipo: todos</option>
            {TIPO_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={inp + " max-w-[180px]"}>
            <option value="">Status: todos</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {isLoading ? <div className="p-4"><ListSkeleton /></div> : lista.length === 0 ? (
          <div className="p-6"><EmptyState icon={<Wallet className="size-5" />} title="Sem lançamentos" description="Crie o primeiro lançamento financeiro." /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] text-muted-foreground uppercase tracking-wider">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-3 py-2">Tipo</th>
                <th className="text-left font-medium px-3 py-2">Categoria</th>
                <th className="text-left font-medium px-3 py-2">Descrição</th>
                <th className="text-right font-medium px-3 py-2">Valor</th>
                <th className="text-left font-medium px-3 py-2">Vencimento</th>
                <th className="text-left font-medium px-3 py-2">Pagamento</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map(r => (
                <tr key={r.id} onClick={() => setEditing(r)} className={`border-b border-border hover:bg-background cursor-pointer ${r.status_pagamento === "atrasado" ? "bg-destructive/5" : ""}`}>
                  <td className="px-3 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${TIPO_CLS[r.tipo]}`}>{r.tipo}</span></td>
                  <td className="px-3 py-2 text-muted-foreground">{r.categoria || "—"}</td>
                  <td className="px-3 py-2 font-medium">{r.descricao}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtBRL(Number(r.valor))}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{fmtDate(r.data_vencimento)}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{fmtDate(r.data_pagamento)}</td>
                  <td className="px-3 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${STATUS_CLS[r.status_pagamento]}`}>{r.status_pagamento}</span></td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    {r.status_pagamento !== "pago" && r.status_pagamento !== "cancelado" && (
                      <button onClick={() => markPaid.mutate(r.id)} title="Marcar como pago"
                        className="size-6 grid place-items-center rounded hover:bg-success/15 text-muted-foreground hover:text-success">
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(creating || editing) && (
        <LancamentoDrawer empresa_id={empresa_id} lanc={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}
    </main>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "success" | "destructive" | "muted" }) {
  const cls = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono font-semibold text-xl ${cls}`}>{value}</div>
    </div>
  );
}

function LancamentoDrawer({ empresa_id, lanc, onClose }: { empresa_id: string; lanc?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    tipo: lanc?.tipo ?? "receita",
    categoria: lanc?.categoria ?? "",
    descricao: lanc?.descricao ?? "",
    valor: lanc?.valor ?? 0,
    data_vencimento: lanc?.data_vencimento ? String(lanc.data_vencimento).slice(0, 10) : "",
    data_pagamento: lanc?.data_pagamento ? String(lanc.data_pagamento).slice(0, 10) : "",
    status_pagamento: lanc?.status_pagamento ?? "pendente",
    contrato_id: lanc?.contrato_id ?? "",
  });

  const { data: contratos } = useQuery({
    queryKey: ["contratos-opts", empresa_id],
    queryFn: async () => (await supabase.from("contratos").select("id,nome_cliente").eq("empresa_id", empresa_id)).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        empresa_id,
        tipo: f.tipo,
        categoria: f.categoria || null,
        descricao: f.descricao,
        valor: Number(f.valor),
        data_vencimento: f.data_vencimento ? new Date(f.data_vencimento).toISOString() : null,
        data_pagamento: f.data_pagamento ? new Date(f.data_pagamento).toISOString() : null,
        status_pagamento: f.status_pagamento,
        contrato_id: f.contrato_id || null,
      };
      if (lanc) {
        const { error } = await supabase.from("financeiro").update(payload).eq("id", lanc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("financeiro").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financeiro", empresa_id] });
      toast.success(lanc ? "Lançamento atualizado." : "Lançamento criado.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financeiro").delete().eq("id", lanc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financeiro", empresa_id] });
      toast.success("Lançamento excluído.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Drawer open onOpenChange={(v) => !v && onClose()} title={lanc ? "Lançamento" : "Novo lançamento"}>
      <div className="space-y-3 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} className={inp}>
            {TIPO_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select></Field>
          <Field label="Status"><select value={f.status_pagamento} onChange={e => setF({ ...f, status_pagamento: e.target.value })} className={inp}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select></Field>
        </div>
        <Field label="Categoria"><input value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })} placeholder="ex: mensalidade, ferramentas" className={inp} /></Field>
        <Field label="Descrição *"><input value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} className={inp} /></Field>
        <Field label="Valor *"><input type="number" step="0.01" value={f.valor} onChange={e => setF({ ...f, valor: Number(e.target.value) })} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vencimento"><input type="date" value={f.data_vencimento} onChange={e => setF({ ...f, data_vencimento: e.target.value })} className={inp} /></Field>
          <Field label="Pagamento"><input type="date" value={f.data_pagamento} onChange={e => setF({ ...f, data_pagamento: e.target.value })} className={inp} /></Field>
        </div>
        <Field label="Contrato"><select value={f.contrato_id} onChange={e => setF({ ...f, contrato_id: e.target.value })} className={inp}>
          <option value="">—</option>
          {contratos?.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
        </select></Field>
      </div>
      <div className="border-t border-border pt-3 flex gap-2">
        {lanc && (
          <button onClick={() => { if (confirm("Excluir este lançamento?")) remove.mutate(); }} className="h-9 px-3 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
            Excluir
          </button>
        )}
        <button onClick={() => save.mutate()} disabled={!f.descricao || save.isPending}
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