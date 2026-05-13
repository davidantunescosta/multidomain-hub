import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/empresa/$id/configuracoes")({
  component: Configuracoes,
});

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f59e0b","#eab308","#22c55e","#10b981","#06b6d4","#3b82f6","#a855f7","#f97316"];
const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function Configuracoes() {
  const { id: empresa_id } = useParams({ from: "/_authenticated/empresa/$id/configuracoes" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: empresa, isLoading } = useQuery({
    queryKey: ["empresa", empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").eq("id", empresa_id).single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  if (empresa && form === null) {
    setForm({
      nome: empresa.nome ?? "",
      descricao: empresa.descricao ?? "",
      segmento: empresa.segmento ?? "",
      cor_identidade: empresa.cor_identidade ?? "#6366f1",
      logo_url: empresa.logo_url ?? "",
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("empresas").update({
        nome: form.nome,
        descricao: form.descricao || null,
        segmento: form.segmento || null,
        cor_identidade: form.cor_identidade,
        logo_url: form.logo_url || null,
      }).eq("id", empresa_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresa", empresa_id] });
      qc.invalidateQueries({ queryKey: ["empresas-sidebar"] });
      toast.success("Configurações salvas.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: "pausada" | "encerrada") => {
      const { error } = await supabase.from("empresas").update({ status }).eq("id", empresa_id);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ["empresas-sidebar"] });
      qc.invalidateQueries({ queryKey: ["empresa", empresa_id] });
      toast.success(status === "pausada" ? "Empresa pausada." : "Empresa encerrada.");
      navigate({ to: "/" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [pauseOpen, setPauseOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeStep, setCloseStep] = useState<1 | 2>(1);
  const [closeName, setCloseName] = useState("");

  if (isLoading || !form) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Edite os dados da empresa.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <Field label="Nome *">
          <input className={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
        </Field>
        <Field label="Descrição">
          <textarea className={inp + " h-24 py-2"} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
        </Field>
        <Field label="Segmento">
          <input className={inp} value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })} />
        </Field>
        <Field label="Cor de identidade">
          <div className="flex items-center gap-2 flex-wrap">
            {PALETTE.map(c => (
              <button key={c} type="button" onClick={() => setForm({ ...form, cor_identidade: c })}
                className={`size-7 rounded-md border-2 ${form.cor_identidade === c ? "border-foreground" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
            <input type="color" value={form.cor_identidade}
              onChange={e => setForm({ ...form, cor_identidade: e.target.value })}
              className="size-8 rounded-md bg-background border border-border cursor-pointer" />
            <span className="text-xs text-muted-foreground font-mono">{form.cor_identidade}</span>
          </div>
        </Field>
        <Field label="URL da logo">
          <input className={inp} value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
        </Field>

        <div className="flex justify-end pt-2">
          <button onClick={() => save.mutate()} disabled={!form.nome.trim() || save.isPending}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
            <Save className="size-4" />
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" />
          <h2 className="text-lg font-semibold text-destructive">Zona de risco</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-sm">Pausar empresa</div>
            <div className="text-xs text-muted-foreground">Ela some do Command Center, mas os dados são preservados.</div>
          </div>
          <button onClick={() => setPauseOpen(true)}
            className="h-9 px-4 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10">
            Pausar
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-destructive/20">
          <div>
            <div className="font-medium text-sm">Encerrar empresa</div>
            <div className="text-xs text-muted-foreground">Marca a empresa como encerrada.</div>
          </div>
          <button onClick={() => { setCloseOpen(true); setCloseStep(1); setCloseName(""); }}
            className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm hover:opacity-90">
            Encerrar
          </button>
        </div>
      </section>

      {pauseOpen && (
        <Modal onClose={() => setPauseOpen(false)} title="Pausar empresa?">
          <p className="text-sm text-muted-foreground">
            Esta empresa sumirá do Command Center mas os dados serão preservados.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setPauseOpen(false)} className="h-9 px-4 rounded-md border border-border text-sm">Cancelar</button>
            <button onClick={() => { setPauseOpen(false); setStatus.mutate("pausada"); }}
              className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm">Pausar</button>
          </div>
        </Modal>
      )}

      {closeOpen && (
        <Modal onClose={() => setCloseOpen(false)} title="Encerrar empresa?">
          {closeStep === 1 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Ação irreversível. A empresa será marcada como encerrada.
              </p>
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setCloseOpen(false)} className="h-9 px-4 rounded-md border border-border text-sm">Cancelar</button>
                <button onClick={() => setCloseStep(2)} className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm">Continuar</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Para confirmar, digite o nome da empresa: <span className="font-mono text-foreground">{empresa?.nome}</span>
              </p>
              <input className={inp + " mt-3"} value={closeName} onChange={e => setCloseName(e.target.value)} placeholder={empresa?.nome} />
              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setCloseOpen(false)} className="h-9 px-4 rounded-md border border-border text-sm">Cancelar</button>
                <button disabled={closeName !== empresa?.nome}
                  onClick={() => { setCloseOpen(false); setStatus.mutate("encerrada"); }}
                  className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm disabled:opacity-50">
                  Encerrar definitivamente
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-2" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
