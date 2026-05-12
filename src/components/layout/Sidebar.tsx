import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, CalendarDays, CheckSquare, Building2, Bell, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { useState } from "react";

const GLOBAL = [
  { to: "/", label: "Command Center", icon: LayoutGrid },
  { to: "/agenda", label: "Agenda Global", icon: CalendarDays },
  { to: "/tarefas", label: "Minhas Tarefas", icon: CheckSquare },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: r => r.location.pathname });

  const { data: empresas } = useQuery({
    queryKey: ["empresas-sidebar"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("id,nome,cor_identidade,status").eq("status","ativa").order("nome");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: unread } = useQuery({
    queryKey: ["notificacoes-unread"],
    queryFn: async () => {
      const { count } = await supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  return (
    <aside className={`shrink-0 border-r border-border bg-sidebar flex flex-col transition-all ${collapsed ? "w-14" : "w-60"}`}>
      <div className="h-12 flex items-center px-3 border-b border-border gap-2">
        <div className="size-7 rounded-md bg-primary grid place-items-center text-primary-foreground font-display font-bold text-sm">N</div>
        {!collapsed && <span className="font-display font-bold tracking-tight">NEXUS OS</span>}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto size-6 grid place-items-center rounded hover:bg-accent text-muted-foreground"
          aria-label="Colapsar"
        >{collapsed ? <ChevronRight className="size-3.5"/> : <ChevronLeft className="size-3.5"/>}</button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-2 space-y-0.5">
          {GLOBAL.map(item => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-2 h-8 px-2 rounded text-sm transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.to === "/notificacoes" && (unread ?? 0) > 0 && (
                  <span className="text-[10px] px-1.5 rounded bg-primary text-primary-foreground font-mono">{unread}</span>
                )}
              </Link>
            );
          })}
        </div>

        {!collapsed && (
          <>
            <div className="mt-5 mb-1 px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Empresas Ativas</div>
            <div className="px-2 space-y-0.5">
              {(empresas ?? []).length === 0 && (
                <Link to="/empresas" className="block px-2 py-2 text-xs text-muted-foreground hover:text-foreground">+ Criar primeira empresa</Link>
              )}
              {empresas?.map(e => {
                const active = path.includes(`/empresa/${e.id}`);
                return (
                  <Link key={e.id} to="/empresa/$id" params={{ id: e.id }}
                    className={`flex items-center gap-2 h-8 px-2 rounded text-sm ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
                  >
                    <span className="size-2 rounded-full shrink-0" style={{ background: e.cor_identidade }} />
                    <span className="truncate">{e.nome}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-border p-2">
        <div className={`flex items-center gap-2 px-2 py-1.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="size-7 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-semibold">
            {initials(user?.email ?? "")}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate">{user?.email}</div>
              </div>
              <button onClick={signOut} className="size-7 grid place-items-center rounded hover:bg-accent text-muted-foreground" title="Sair">
                <LogOut className="size-3.5"/>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
