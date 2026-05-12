import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus, ChevronRight } from "lucide-react";
import { fmtBRL } from "@/lib/format";
import { toast } from "sonner";
import { Drawer } from "@/components/nexus/Drawer";

const ESTAGIOS = [
  { id: "lead", label: "Lead" },
  { id: "qualificado", label: "Qualificado" },
  { id: "proposta", label: "Proposta" },
  { id: "negociacao", label: "Negociação" },
  { id: "ganho", label: "Ganho" },
  { id: "perdido", label: "Perdido" },
] as const;

export const Route = createFileRoute("/_authenticated/empresa/pipeline")({
  component: Pipeline,
});

function Pipeline() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/pipeline" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [createIn, setCreateIn] = useState<string | null>(null);
  const [collapsedPerdido, setCollapsedPerdido] = useState(true);

  const { data: leads } = useQuery({
    queryKey: ["pipeline", empresa_id],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline").select("*,membros(nome)").eq("empresa_id", empresa_id).order("created_at",{ascending:false});
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`pipeline-${empresa_id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"pipeline",filter:`empresa_id=eq.${empresa_id}`},() => {
        qc.invalidateQueries({ queryKey: ["pipeline", empresa_id] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [empresa_id, qc]);

  const moveStage = useMutation({
    mutationFn: async ({ id, estagio }: { id: string; estagio: string }) => {
      const { error } = await supabase.from("pipeline").update({ estagio }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline", empresa_id] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const overId = e.over?.id as string | undefined;
    const activeId = e.active.id as string;
    if (!overId) return;
    moveStage.mutate({ id: activeId, estagio: overId });
  }

  return (
    <main className="flex-1 overflow-hidden">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="h-full overflow-x-auto p-4 flex gap-3">
          {ESTAGIOS.map(col => {
            const items = (leads ?? []).filter(l => l.estagio === col.id);
            const total = items.reduce((s,i) => s + Number(i.valor_estimado||0), 0);
            const collapsed = col.id === "perdido" && collapsedPerdido;
            return (
              <Column key={col.id} id={col.id} label={col.label} count={items.length} total={total}
                onAdd={() => setCreateIn(col.id)}
                bgClass={col.id==="ganho" ? "bg-success/5" : col.id==="perdido" ? "bg-destructive/5" : ""}
                collapsed={collapsed}
                onToggleCollapse={col.id === "perdido" ? () => setCollapsedPerdido(c => !c) : undefined}>
                {!collapsed && items.map(l => (
                  <LeadCard key={l.id} lead={l} onClick={() => setEditing(l)}/>
                ))}
              </Column>
            );
          })}
        </div>
      </DndContext>
      {createIn && <LeadDrawer empresa_id={empresa_id} estagio={createIn} onClose={() => setCreateIn(null)}/>}
      {editing && <LeadDrawer empresa_id={empresa_id} lead={editing} onClose={() => setEditing(null)}/>}
    </main>
  );
}

function Column({ id, label, count, total, children, onAdd, bgClass, collapsed, onToggleCollapse }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`shrink-0 w-72 flex flex-col rounded-lg border ${isOver?"border-primary":"border-border"} ${bgClass||"bg-surface"}`}>
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
        {onToggleCollapse && <button onClick={onToggleCollapse} className="text-muted-foreground"><ChevronRight className={`size-3 transition-transform ${collapsed?"":"rotate-90"}`}/></button>}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{fmtBRL(total)}</span>
        <button onClick={onAdd} className="size-5 grid place-items-center rounded hover:bg-accent text-muted-foreground"><Plus className="size-3"/></button>
      </div>
      <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[100px]">{children}</div>
    </div>
  );
}

function LeadCard({ lead, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const dias = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000);
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`bg-background border border-border rounded p-2.5 cursor-grab active:cursor-grabbing ${isDragging?"opacity-50":""}`}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onClick(); }}}>
      <div className="text-xs font-semibold truncate">{lead.nome_lead}</div>
      {lead.empresa_lead && <div className="text-[11px] text-muted-foreground truncate">{lead.empresa_lead}</div>}
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-[11px]">{fmtBRL(lead.valor_estimado)}</span>
        <span className="text-[10px] text-muted-foreground">há {dias}d</span>
      </div>
      {lead.probabilidade != null && (
        <div className="mt-2 h-1 bg-border rounded overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${lead.probabilidade}%` }}/>
        </div>
      )}
    </div>
  );
}

const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function LeadDrawer({ empresa_id, lead, estagio, onClose }: { empresa_id: string; lead?: any; estagio?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nome_lead: lead?.nome_lead ?? "", empresa_lead: lead?.empresa_lead ?? "",
    contato_email: lead?.contato_email ?? "", contato_telefone: lead?.contato_telefone ?? "",
    origem: lead?.origem ?? "indicacao", estagio: lead?.estagio ?? estagio ?? "lead",
    valor_estimado: lead?.valor_estimado ?? "", probabilidade: lead?.probabilidade ?? 50,
    data_fechamento: lead?.data_fechamento?.slice(0,10) ?? "", observacoes: lead?.observacoes ?? "",
    responsavel_id: lead?.responsavel_id ?? "",
  });

  const { data: membros } = useQuery({
    queryKey: ["membros", empresa_id],
    queryFn: async () => (await supabase.from("membros").select("id,nome").eq("empresa_id",empresa_id)).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        empresa_id, user_id: user!.id,
        nome_lead: f.nome_lead, empresa_lead: f.empresa_lead || null,
        contato_email: f.contato_email || null, contato_telefone: f.contato_telefone || null,
        origem: f.origem, estagio: f.estagio,
        valor_estimado: f.valor_estimado ? Number(f.valor_estimado) : null,
        probabilidade: Number(f.probabilidade),
        data_fechamento: f.data_fechamento || null,
        observacoes: f.observacoes || null,
        responsavel_id: f.responsavel_id || null,
      };
      if (lead) {
        const { error } = await supabase.from("pipeline").update(payload).eq("id", lead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pipeline").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline", empresa_id] });
      toast.success(lead ? "Lead atualizado." : "Lead criado.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const convert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contratos").insert({
        empresa_id, pipeline_id: lead.id, nome_cliente: lead.nome_lead,
        valor_total: lead.valor_estimado, status: "em_negociacao",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contratos", empresa_id] }); toast.success("Convertido em contrato."); onClose(); },
  });

  return (
    <Drawer open onOpenChange={(v) => !v && onClose()} title={lead ? "Editar lead" : "Novo lead"}>
      <div className="space-y-3 py-4">
        <Field label="Nome do lead *"><input value={f.nome_lead} onChange={e=>setF({...f,nome_lead:e.target.value})} className={inp}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Empresa"><input value={f.empresa_lead} onChange={e=>setF({...f,empresa_lead:e.target.value})} className={inp}/></Field>
          <Field label="Origem"><select value={f.origem} onChange={e=>setF({...f,origem:e.target.value})} className={inp}>
            {["indicacao","linkedin","anuncio","evento","prospeccao","outro"].map(o=><option key={o}>{o}</option>)}
          </select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input value={f.contato_email} onChange={e=>setF({...f,contato_email:e.target.value})} className={inp}/></Field>
          <Field label="Telefone"><input value={f.contato_telefone} onChange={e=>setF({...f,contato_telefone:e.target.value})} className={inp}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estágio"><select value={f.estagio} onChange={e=>setF({...f,estagio:e.target.value})} className={inp}>
            {ESTAGIOS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select></Field>
          <Field label="Valor estimado (R$)"><input type="number" value={f.valor_estimado} onChange={e=>setF({...f,valor_estimado:e.target.value})} className={inp}/></Field>
        </div>
        <Field label={`Probabilidade: ${f.probabilidade}%`}>
          <input type="range" min={0} max={100} value={f.probabilidade} onChange={e=>setF({...f,probabilidade:Number(e.target.value)})} className="w-full"/>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Responsável"><select value={f.responsavel_id} onChange={e=>setF({...f,responsavel_id:e.target.value})} className={inp}>
            <option value="">—</option>
            {membros?.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
          </select></Field>
          <Field label="Fechamento previsto"><input type="date" value={f.data_fechamento} onChange={e=>setF({...f,data_fechamento:e.target.value})} className={inp}/></Field>
        </div>
        <Field label="Observações"><textarea value={f.observacoes} onChange={e=>setF({...f,observacoes:e.target.value})} className={inp+" min-h-[80px]"}/></Field>
      </div>
      <div className="border-t border-border pt-3 flex gap-2">
        {lead && <button onClick={() => convert.mutate()} className="h-9 px-3 rounded-md border border-border text-xs hover:bg-accent">Converter em contrato</button>}
        <button onClick={() => save.mutate()} disabled={!f.nome_lead || save.isPending} className="ml-auto h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
          {save.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: any) {
  return <div><label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{label}</label>{children}</div>;
}
