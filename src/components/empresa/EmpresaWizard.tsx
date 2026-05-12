import { useState } from "react";
import { Drawer } from "@/components/nexus/Drawer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f59e0b","#eab308","#22c55e","#10b981","#06b6d4","#3b82f6","#a855f7","#f97316"];

export function EmpresaWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (v:boolean)=>void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: "", descricao: "", segmento: "", cor_identidade: "#6366f1",
    membro_nome: "", membro_email: "", membro_papel: "dono",
  });

  function reset() { setStep(1); setForm({ nome:"",descricao:"",segmento:"",cor_identidade:"#6366f1",membro_nome:"",membro_email:"",membro_papel:"dono" }); }

  const create = useMutation({
    mutationFn: async () => {
      const { data: emp, error } = await supabase.from("empresas").insert({
        user_id: user!.id, nome: form.nome, descricao: form.descricao || null,
        segmento: form.segmento || null, cor_identidade: form.cor_identidade,
      }).select().single();
      if (error) throw error;
      if (form.membro_nome) {
        await supabase.from("membros").insert({
          empresa_id: emp.id, nome: form.membro_nome,
          email: form.membro_email || null, papel: form.membro_papel,
        });
      }
      return emp;
    },
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ["empresas-sidebar"] });
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
      toast.success("Empresa criada.");
      reset(); onOpenChange(false);
      nav({ to: "/empresa/$id", params: { id: emp.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}
      title="Nova empresa" description={`Passo ${step} de 3`}>
      <div className="space-y-4 py-4">
        {step === 1 && (
          <>
            <Field label="Nome *">
              <input value={form.nome} onChange={e => setForm({...form, nome:e.target.value})} className={inp}/>
            </Field>
            <Field label="Descrição">
              <textarea value={form.descricao} onChange={e => setForm({...form, descricao:e.target.value})} className={inp+" min-h-[80px]"}/>
            </Field>
            <Field label="Segmento">
              <input value={form.segmento} onChange={e => setForm({...form, segmento:e.target.value})} placeholder="ex: SaaS, Consultoria" className={inp}/>
            </Field>
            <Field label="Cor de identidade">
              <div className="flex flex-wrap gap-2">
                {PALETTE.map(c => (
                  <button key={c} type="button" onClick={() => setForm({...form, cor_identidade:c})}
                    className={`size-7 rounded-md border-2 ${form.cor_identidade===c?"border-foreground":"border-transparent"}`} style={{background:c}}/>
                ))}
                <input type="color" value={form.cor_identidade} onChange={e => setForm({...form, cor_identidade:e.target.value})}
                  className="size-7 rounded-md cursor-pointer bg-transparent"/>
              </div>
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-xs text-muted-foreground">Adicione você mesmo ou um sócio (opcional).</p>
            <Field label="Nome do membro">
              <input value={form.membro_nome} onChange={e => setForm({...form, membro_nome:e.target.value})} className={inp}/>
            </Field>
            <Field label="Email"><input value={form.membro_email} onChange={e => setForm({...form, membro_email:e.target.value})} className={inp}/></Field>
            <Field label="Papel">
              <select value={form.membro_papel} onChange={e => setForm({...form, membro_papel:e.target.value})} className={inp}>
                <option value="dono">Dono</option><option value="socio">Sócio</option>
                <option value="gerente">Gerente</option><option value="membro">Membro</option><option value="externo">Externo</option>
              </select>
            </Field>
          </>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm">
            <div className="p-3 rounded border border-border bg-background">
              <div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{background:form.cor_identidade}}/><span className="font-semibold">{form.nome}</span></div>
              {form.segmento && <div className="text-xs text-muted-foreground mt-1">{form.segmento}</div>}
              {form.descricao && <div className="text-xs text-muted-foreground mt-1">{form.descricao}</div>}
              {form.membro_nome && <div className="text-xs mt-2 pt-2 border-t border-border">Primeiro membro: <b>{form.membro_nome}</b> ({form.membro_papel})</div>}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border pt-3 flex gap-2">
        {step > 1 && <button onClick={() => setStep(s => s-1)} className={btnSecondary}>Voltar</button>}
        {step < 3 && <button disabled={step===1 && !form.nome} onClick={() => setStep(s => s+1)} className={btnPrimary+" ml-auto"}>Avançar</button>}
        {step === 3 && <button disabled={create.isPending} onClick={() => create.mutate()} className={btnPrimary+" ml-auto"}>
          {create.isPending ? "Criando…" : "Criar e entrar"}
        </button>}
      </div>
    </Drawer>
  );
}

const inp = "w-full h-9 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary";
const btnPrimary = "h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50";
const btnSecondary = "h-9 px-4 rounded-md border border-border bg-surface text-xs hover:bg-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{label}</label>{children}</div>;
}
