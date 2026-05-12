import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { StatusBadge } from "@/components/nexus/StatusBadge";
import { EmpresaWizard } from "@/components/empresa/EmpresaWizard";
import { Building2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const search = z.object({ new: z.string().optional() });

export const Route = createFileRoute("/_authenticated/empresas")({
  validateSearch: search,
  component: EmpresasPage,
});

function EmpresasPage() {
  const qc = useQueryClient();
  const sp = useSearch({ from: "/_authenticated/empresas" });
  const [wizard, setWizard] = useState(false);

  useEffect(() => { if (sp.new === "1") setWizard(true); }, [sp.new]);

  const { data, isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("empresas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["empresas-sidebar"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
      toast.success("Atualizado.");
    },
  });

  return (
    <>
      <Header title="Empresas"/>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Suas empresas</h2>
          <button onClick={() => setWizard(true)} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-2">
            <Plus className="size-3.5"/>Nova Empresa
          </button>
        </div>

        {isLoading ? <ListSkeleton rows={3}/> : !data?.length ? (
          <EmptyState icon={<Building2 className="size-5"/>} title="Sem empresas"
            action={<button onClick={()=>setWizard(true)} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium">Criar empresa</button>}/>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map(e => (
              <div key={e.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                <div className="h-1" style={{background:e.cor_identidade}}/>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{e.nome}</h3>
                      {e.segmento && <p className="text-[11px] text-muted-foreground">{e.segmento}</p>}
                    </div>
                    <StatusBadge value={e.status}/>
                  </div>
                  {e.descricao && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{e.descricao}</p>}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                    <Link to="/empresa/$id" params={{id:e.id}} className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 grid place-items-center">Entrar</Link>
                    {e.status === "ativa" && <button onClick={() => setStatus.mutate({id:e.id,status:"pausada"})} className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent">Pausar</button>}
                    {e.status === "pausada" && <button onClick={() => setStatus.mutate({id:e.id,status:"ativa"})} className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent">Reativar</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <EmpresaWizard open={wizard} onOpenChange={setWizard}/>
    </>
  );
}
