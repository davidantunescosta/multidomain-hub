import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { initials } from "@/lib/format";
import { Drawer } from "@/components/nexus/Drawer";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { Users, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa/$id/equipe")({ component: Equipe });

const PAPEL_OPTS = ["dono", "socio", "gerente", "membro", "externo"] as const;
const PAPEL_LABEL: Record<string, string> = { dono: "Dono", socio: "Sócio", gerente: "Gerente", membro: "Membro", externo: "Externo" };
const PAPEL_CLS: Record<string, string> = {
  dono: "bg-primary/20 text-primary",
  socio: "bg-violet-500/20 text-violet-400",
  gerente: "bg-orange-500/20 text-orange-400",
  membro: "bg-muted text-muted-foreground",
  externo: "bg-border text-muted-foreground",
};
const AVATAR_CLS: Record<string, string> = {
  dono: "bg-primary/20 text-primary",
  socio: "bg-violet-500/20 text-violet-300",
  gerente: "bg-orange-500/20 text-orange-300",
  membro: "bg-muted text-muted-foreground",
  externo: "bg-border text-muted-foreground",
};
const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function Equipe() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/equipe" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["membros", empresa_id],
    queryFn: async () => (await supabase.from("membros").select("*").eq("empresa_id", empresa_id).order("created_at")).data ?? [],
  });

  const ativos = (data ?? []).filter(m => m.ativo);
  const inativos = (data ?? []).filter(m => !m.ativo);

  const toggle = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("membros").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membros", empresa_id] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Equipe</h2>
        <button onClick={() => setCreating(true)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5">
          <Plus className="size-3.5" />Adicionar membro
        </button>
      </div>

      {isLoading ? <ListSkeleton /> : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title="Sem membros" description="Adicione o primeiro membro da equipe." />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {ativos.map(m => <MemberCard key={m.id} m={m} onClick={() => setEditing(m)} onToggle={(ativo) => toggle.mutate({ id: m.id, ativo })} />)}
          </div>

          {inativos.length > 0 && (
            <div className="border-t border-border pt-3">
              <button onClick={() => setShowInactive(s => !s)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                {showInactive ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                {inativos.length} inativo{inativos.length > 1 ? "s" : ""}
              </button>
              {showInactive && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                  {inativos.map(m => <MemberCard key={m.id} m={m} onClick={() => setEditing(m)} onToggle={(ativo) => toggle.mutate({ id: m.id, ativo })} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {(creating || editing) && (
        <MembroDrawer empresa_id={empresa_id} membro={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}
    </main>
  );
}

function MemberCard({ m, onClick, onToggle }: { m: any; onClick: () => void; onToggle: (ativo: boolean) => void }) {
  return (
    <div className={`bg-surface border border-border rounded-lg p-3 flex items-center gap-3 hover:border-primary/40 transition-colors ${!m.ativo ? "opacity-50" : ""}`}>
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className={`size-10 rounded-full grid place-items-center font-semibold text-sm shrink-0 ${AVATAR_CLS[m.papel] ?? AVATAR_CLS.membro}`}>
          {initials(m.nome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{m.nome}</div>
          {m.email && <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PAPEL_CLS[m.papel] ?? PAPEL_CLS.membro}`}>{PAPEL_LABEL[m.papel] ?? m.papel}</span>
      </button>
      <button onClick={() => onToggle(!m.ativo)} title={m.ativo ? "Desativar" : "Ativar"}
        className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${m.ativo ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-background transition-transform ${m.ativo ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function MembroDrawer({ empresa_id, membro, onClose }: { empresa_id: string; membro?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nome: membro?.nome ?? "",
    email: membro?.email ?? "",
    papel: membro?.papel ?? "membro",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { empresa_id, nome: f.nome, email: f.email || null, papel: f.papel };
      if (membro) {
        const { error } = await supabase.from("membros").update(payload).eq("id", membro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("membros").insert({ ...payload, ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membros", empresa_id] });
      toast.success(membro ? "Membro atualizado." : "Membro adicionado.");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("membros").delete().eq("id", membro.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["membros", empresa_id] });
      toast.success("Membro excluído.");
      onClose();
    },
  });

  return (
    <Drawer open onOpenChange={(v) => !v && onClose()} title={membro ? "Membro" : "Novo membro"}>
      <div className="space-y-3 py-4">
        <Field label="Nome *"><input value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} className={inp} /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className={inp} /></Field>
        <Field label="Papel"><select value={f.papel} onChange={e => setF({ ...f, papel: e.target.value })} className={inp}>
          {PAPEL_OPTS.map(p => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
        </select></Field>
      </div>
      <div className="border-t border-border pt-3 flex gap-2">
        {membro && (
          <button onClick={() => { if (confirm("Excluir este membro?")) remove.mutate(); }} className="h-9 px-3 rounded-md border border-destructive/40 text-destructive text-xs hover:bg-destructive/10">
            Excluir
          </button>
        )}
        <button onClick={() => save.mutate()} disabled={!f.nome || save.isPending}
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