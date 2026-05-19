import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AcaoPermissao = "ver" | "criar" | "editar" | "excluir";
export type ModuloPermissao =
  | "pipeline" | "contratos" | "reunioes" | "tarefas" | "agenda" | "financeiro" | "equipe";

export function usePermissao(empresaId: string | undefined, modulo: ModuloPermissao) {
  const { user } = useAuth();

  const { data: acoes, isLoading } = useQuery({
    queryKey: ["permissao", user?.id, empresaId, modulo],
    queryFn: async () => {
      const negado: Record<AcaoPermissao, boolean> = { ver: false, criar: false, editar: false, excluir: false };
      const total: Record<AcaoPermissao, boolean> = { ver: true, criar: true, editar: true, excluir: true };

      // Admin sempre acesso total
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      const isAdmin = !!roleRow;

      // Membro da empresa
      const { data: membro } = await supabase
        .from("membros")
        .select("papel, cliente_id")
        .eq("user_id", user!.id)
        .eq("empresa_id", empresaId!)
        .eq("ativo", true)
        .maybeSingle();

      if (isAdmin) return total;
      if (!membro) return negado;
      if (membro.papel === "dono") return total;

      // Permissões granulares via RPC
      const result: Record<AcaoPermissao, boolean> = { ver: false, criar: false, editar: false, excluir: false };
      for (const acao of ["ver", "criar", "editar", "excluir"] as AcaoPermissao[]) {
        const { data } = await supabase.rpc("pode_acessar_modulo", {
          _user_id: user!.id,
          _empresa_id: empresaId!,
          _modulo: modulo,
          _acao: acao,
        });
        result[acao] = !!data;
      }
      return result;
    },
    enabled: !!user && !!empresaId,
    staleTime: 60_000,
  });

  return {
    pode: acoes ?? { ver: false, criar: false, editar: false, excluir: false },
    carregando: isLoading,
  };
}