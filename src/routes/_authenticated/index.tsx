import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import { fmtBRL, fmtTime, isToday, relativeTime, startOfDay, endOfDay, addDays } from "@/lib/format";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { Building2, AlertTriangle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useCommandPalette } from "@/components/layout/palette-store";
import { generateNotifications } from "@/lib/notifications";
import { EmpresaWizard } from "@/components/empresa/EmpresaWizard";

export const Route = createFileRoute("/_authenticated/")({
  component: CommandCenter,
});

function CommandCenter() {
  const { user } = useAuth();
  const { setOpen } = useCommandPalette();
  const [wizard, setWizard] = useState(false);

  useEffect(() => { if (user) generateNotifications(user.id); }, [user]);

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Bom dia" : today.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(today);

  const { data: empresas, isLoading } = useQuery({
    queryKey: ["command-center"],
    queryFn: async () => {
      const { data: emps } = await supabase.from("empresas").select("*").eq("status", "ativa").order("nome");
      if (!emps?.length) return [];
      const ids = emps.map(e => e.id);
      const today0 = startOfDay().toISOString();
      const today1 = endOfDay().toISOString();
      const in7 = addDays(new Date(), 7).toISOString();

      const [leads, reun, tarefas, contratos, finAtras] = await Promise.all([
        supabase.from("pipeline").select("empresa_id").in("empresa_id", ids).not("estagio","in","(ganho,perdido)"),
        supabase.from("reunioes").select("empresa_id").in("empresa_id", ids).gte("data_hora", today0).lte("data_hora", today1),
        supabase.from("tarefas").select("empresa_id,data_limite").in("empresa_id", ids).eq("prioridade","critica").not("status","in","(concluida,cancelada)"),
        supabase.from("contratos").select("empresa_id,valor_recorrente,periodicidade,status,data_fim").in("empresa_id", ids),
        supabase.from("financeiro").select("empresa_id").in("empresa_id", ids).eq("status_pagamento","atrasado"),
      ]);

      return emps.map(e => {
        const leadsAtivos = leads.data?.filter(x => x.empresa_id === e.id).length ?? 0;
        const reuniaoHoje = reun.data?.filter(x => x.empresa_id === e.id).length ?? 0;
        const criticas = tarefas.data?.filter(x => x.empresa_id === e.id).length ?? 0;
        const mrr = contratos.data?.filter(x => x.empresa_id===e.id && x.periodicidade==="mensal" && x.status==="ativo")
          .reduce((s,c) => s + Number(c.valor_recorrente||0), 0) ?? 0;
        const tarefasVencidas = tarefas.data?.some(x => x.empresa_id===e.id && x.data_limite && new Date(x.data_limite) < new Date());
        const contratoVencendo = contratos.data?.some(x => x.empresa_id===e.id && x.status==="ativo" && x.data_fim && x.data_fim <= in7);
        const finAtrasado = (finAtras.data?.filter(x => x.empresa_id===e.id).length ?? 0) > 0;
        const alertas = !!(tarefasVencidas || contratoVencendo || finAtrasado);
        return { ...e, leadsAtivos, reuniaoHoje, criticas, mrr, alertas };
      });
    },
    enabled: !!user,
  });

  return (
    <>
      <Header title="Command Center" />
      <div className="flex-1 overflow-hidden flex">
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">{greeting}, {user?.email?.split("@")[0]}.</h2>
              <p className="text-sm text-muted-foreground capitalize mt-1">{dateLabel}</p>
            </div>
            <button onClick={() => setOpen(true)} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-2">
              <Plus className="size-3.5"/> Nova ação rápida
            </button>
          </div>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Empresas Ativas</h3>
              <button onClick={() => setWizard(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Plus className="size-3"/>Nova empresa
              </button>
            </div>
            {isLoading ? <ListSkeleton rows={3}/> : !empresas?.length ? (
              <EmptyState icon={<Building2 className="size-5"/>} title="Nenhuma empresa ainda"
                description="Crie sua primeira empresa para começar a operar."
                action={<button onClick={()=>setWizard(true)} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium">Criar empresa</button>}/>
            ) : (
              <div className="space-y-2">
                {empresas.map(e => (
                  <Link key={e.id} to="/empresa/$id" params={{id:e.id}}
                    className="block bg-surface border border-border rounded-lg pl-0 pr-4 py-3 hover:border-muted-foreground/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-1 self-stretch rounded-l" style={{background:e.cor_identidade}}/>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{e.nome}</div>
                        {e.segmento && <div className="text-[11px] text-muted-foreground">{e.segmento}</div>}
                      </div>
                      <Stat label="Leads" value={e.leadsAtivos}/>
                      <Stat label="Reuniões hoje" value={e.reuniaoHoje}/>
                      <Stat label="Críticas" value={e.criticas} accent={e.criticas>0?"text-destructive":""}/>
                      <Stat label="MRR" value={fmtBRL(e.mrr)} mono/>
                      <div className="w-8 grid place-items-center">
                        {e.alertas && <AlertTriangle className="size-4 text-destructive"/>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <ActivityFeed/>
        </main>

        <RightPanel/>
      </div>
      <EmpresaWizard open={wizard} onOpenChange={setWizard}/>
    </>
  );
}

function Stat({ label, value, mono, accent }: { label: string; value: string|number; mono?: boolean; accent?: string }) {
  return (
    <div className="text-right min-w-[80px]">
      <div className={`text-sm font-semibold ${mono?"font-mono":""} ${accent??""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ActivityFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7*24*3600*1000).toISOString();
      const [reun, pipe, tar, ctr] = await Promise.all([
        supabase.from("reunioes").select("id,titulo,empresa_id,status,updated_at,empresas(nome,cor_identidade)").gte("updated_at",since).order("updated_at",{ascending:false}).limit(10),
        supabase.from("pipeline").select("id,nome_lead,estagio,empresa_id,updated_at,empresas(nome,cor_identidade)").gte("updated_at",since).order("updated_at",{ascending:false}).limit(10),
        supabase.from("tarefas").select("id,titulo,status,empresa_id,updated_at,empresas(nome,cor_identidade)").gte("updated_at",since).order("updated_at",{ascending:false}).limit(10),
        supabase.from("contratos").select("id,nome_cliente,status,empresa_id,updated_at,empresas(nome,cor_identidade)").gte("updated_at",since).order("updated_at",{ascending:false}).limit(10),
      ]);
      const merged = [
        ...(reun.data??[]).map(x => ({ kind:"reuniao", id:x.id, label:`Reunião ${x.status}: ${x.titulo}`, ts:x.updated_at, emp:x.empresas })),
        ...(pipe.data??[]).map(x => ({ kind:"lead", id:x.id, label:`Lead em "${x.estagio}": ${x.nome_lead}`, ts:x.updated_at, emp:x.empresas })),
        ...(tar.data??[]).map(x => ({ kind:"tarefa", id:x.id, label:`Tarefa ${x.status}: ${x.titulo}`, ts:x.updated_at, emp:x.empresas })),
        ...(ctr.data??[]).map(x => ({ kind:"contrato", id:x.id, label:`Contrato ${x.status}: ${x.nome_cliente}`, ts:x.updated_at, emp:x.empresas })),
      ].sort((a,b) => new Date(b.ts!).getTime() - new Date(a.ts!).getTime()).slice(0,20);
      return merged;
    },
  });

  return (
    <section>
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Feed de atividade</h3>
      {isLoading ? <ListSkeleton rows={5}/> : !data?.length ? (
        <div className="text-xs text-muted-foreground py-4">Sem atividade recente.</div>
      ) : (
        <div className="bg-surface border border-border rounded-lg divide-y divide-border">
          {data.map(item => (
            <div key={`${item.kind}-${item.id}`} className="px-4 py-2.5 flex items-center gap-3 text-xs">
              {(item.emp as any) && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span className="size-1.5 rounded-full" style={{background:(item.emp as any).cor_identidade}}/>
                  {(item.emp as any).nome}
                </span>
              )}
              <span className="flex-1 truncate">{item.label}</span>
              <span className="text-muted-foreground font-mono text-[10px]">{relativeTime(item.ts!)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RightPanel() {
  const { data } = useQuery({
    queryKey: ["right-panel"],
    queryFn: async () => {
      const t0 = startOfDay().toISOString(), t1 = endOfDay().toISOString();
      const in3 = addDays(new Date(), 3).toISOString();
      const [reun, ag, tarefas] = await Promise.all([
        supabase.from("reunioes").select("id,titulo,data_hora,empresa_id,empresas(nome,cor_identidade)").gte("data_hora",t0).lte("data_hora",t1).order("data_hora"),
        supabase.from("agenda").select("id,titulo,data_inicio,empresa_id,empresas(nome,cor_identidade)").gte("data_inicio",t0).lte("data_inicio",t1).order("data_inicio"),
        supabase.from("tarefas").select("id,titulo,data_limite,empresa_id,empresas(nome,cor_identidade)").not("status","in","(concluida,cancelada)").lte("data_limite", in3).order("data_limite"),
      ]);
      return { reun: reun.data??[], ag: ag.data??[], tarefas: tarefas.data??[] };
    },
  });

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-sidebar overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Hoje</h3>
        {(!data?.reun.length && !data?.ag.length) && <p className="text-xs text-muted-foreground">Nada agendado.</p>}
        <div className="space-y-1.5">
          {data?.reun.map(r => (
            <Link key={r.id} to="/empresa/$id/reunioes" params={{id:r.empresa_id!}} className="block p-2 rounded hover:bg-accent">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">{fmtTime(r.data_hora)}</span>
                <span className="size-1.5 rounded-full" style={{background:(r.empresas as any)?.cor_identidade}}/>
              </div>
              <div className="text-xs mt-0.5 truncate">{r.titulo}</div>
            </Link>
          ))}
          {data?.ag.map(a => (
            <Link key={a.id} to="/empresa/$id/agenda" params={{id:a.empresa_id!}} className="block p-2 rounded hover:bg-accent">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">{fmtTime(a.data_inicio)}</span>
                <span className="size-1.5 rounded-full" style={{background:(a.empresas as any)?.cor_identidade}}/>
              </div>
              <div className="text-xs mt-0.5 truncate">{a.titulo}</div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Pendente de você (3 dias)</h3>
        {!data?.tarefas.length && <p className="text-xs text-muted-foreground">Nenhuma tarefa próxima.</p>}
        <div className="space-y-1.5">
          {data?.tarefas.map(t => (
            <Link key={t.id} to="/empresa/$id/tarefas" params={{id:t.empresa_id}} className="block p-2 rounded hover:bg-accent">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full" style={{background:(t.empresas as any)?.cor_identidade}}/>
                <span className="text-xs flex-1 truncate">{t.titulo}</span>
              </div>
              {t.data_limite && <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{isToday(t.data_limite)?"hoje":fmtTime(t.data_limite)}</div>}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
