import { createFileRoute, Link, Outlet, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { useCommandPalette } from "@/components/layout/palette-store";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/empresa/$id")({
  component: WorkspaceLayout,
});

const TABS = [
  { to: "pipeline", label: "Pipeline" },
  { to: "contratos", label: "Contratos" },
  { to: "reunioes", label: "Reuniões" },
  { to: "tarefas", label: "Tarefas" },
  { to: "agenda", label: "Agenda" },
  { to: "financeiro", label: "Financeiro" },
  { to: "equipe", label: "Equipe" },
  { to: "configuracoes", label: "Configurações" },
];

const DONO_TABS = [{ to: "acesso", label: "Gestão de Acesso" }];

function WorkspaceLayout() {
  const { id } = useParams({ from: "/_authenticated/empresa/$id" });
  const path = useRouterState({ select: r => r.location.pathname });
  const { setOpen } = useCommandPalette();
  const { user } = useAuth();

  const { data: empresa } = useQuery({
    queryKey: ["empresa", id],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("*").eq("id", id).single();
      return data;
    },
  });

  const { data: podeGerirAcesso } = useQuery({
    queryKey: ["pode-gerir-acesso", user?.id, id],
    queryFn: async () => {
      const [{ data: roleRow }, { data: membroRow }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle(),
        supabase.from("membros").select("papel").eq("user_id", user!.id).eq("empresa_id", id).eq("ativo", true).maybeSingle(),
      ]);
      return !!roleRow || membroRow?.papel === "dono";
    },
    enabled: !!user && !!id,
  });

  if (!empresa) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  const allTabs = podeGerirAcesso ? [...TABS, ...DONO_TABS] : TABS;

  return (
    <>
      <header className="border-b border-border bg-background shrink-0">
        <div className="h-12 flex items-center px-4 gap-3" style={{ borderTop: `2px solid ${empresa.cor_identidade}` }}>
          <Link to="/" className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground" title="Voltar ao Command Center">
            <ArrowLeft className="size-4"/>
          </Link>
          <span className="size-2 rounded-full" style={{ background: empresa.cor_identidade }}/>
          <h1 className="font-display font-semibold">{empresa.nome}</h1>
          {empresa.segmento && <span className="text-[11px] text-muted-foreground">{empresa.segmento}</span>}
          <button onClick={() => setOpen(true)} className="ml-auto h-7 px-3 text-xs rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground">⌘K</button>
          <NotificationsBell/>
        </div>
        <nav className="px-4 flex gap-1 overflow-x-auto">
          {allTabs.map(t => {
            const full = `/empresa/${id}/${t.to}`;
            const active = path.includes(full);
            return (
              <Link key={t.to} to={full as any}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <Outlet/>
    </>
  );
}
