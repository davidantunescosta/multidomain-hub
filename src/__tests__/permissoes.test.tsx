import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// --- Mocks ---
const mockUser = { id: "user-test-id" };

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

type Row = Record<string, any> | null;
const state = {
  role: null as Row,            // user_roles row (admin) ou null
  membro: null as Row,          // linha em membros
  rpcResult: false as boolean,  // retorno do pode_acessar_modulo
};

function buildSelect(table: string) {
  // Encadeia .select().eq().eq()...maybeSingle()
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => {
      if (table === "user_roles") return { data: state.role };
      if (table === "membros") return { data: state.membro };
      return { data: null };
    },
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => buildSelect(table),
    rpc: async () => ({ data: state.rpcResult }),
  },
}));

import { usePermissao, ModuloPermissao } from "@/hooks/use-permissao";

const MODULOS: ModuloPermissao[] = [
  "pipeline","contratos","reunioes","tarefas","agenda","financeiro","equipe",
];

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

async function getPermissao(modulo: ModuloPermissao) {
  const { result } = renderHook(() => usePermissao("empresa-1", modulo), {
    wrapper: wrapper(),
  });
  await waitFor(() => expect(result.current.carregando).toBe(false));
  return result.current.pode;
}

const TOTAL = { ver: true, criar: true, editar: true, excluir: true };

beforeEach(() => {
  state.role = null;
  state.membro = null;
  state.rpcResult = false;
});

describe("Cenário C — módulos sempre liberados", () => {
  it("Dono de empresa em plano BÁSICO tem acesso total a todos os 7 módulos", async () => {
    state.membro = { papel: "dono", cliente_id: "cliente-basico" };
    for (const m of MODULOS) {
      expect(await getPermissao(m)).toEqual(TOTAL);
    }
  });

  it("Dono de empresa em plano PROFISSIONAL tem acesso total a todos os 7 módulos", async () => {
    state.membro = { papel: "dono", cliente_id: "cliente-prof" };
    for (const m of MODULOS) {
      expect(await getPermissao(m)).toEqual(TOTAL);
    }
  });

  it("Admin global tem acesso total mesmo sem ser membro", async () => {
    state.role = { role: "admin" };
    for (const m of MODULOS) {
      expect(await getPermissao(m)).toEqual(TOTAL);
    }
  });

  it("Membro não-dono usa RPC pode_acessar_modulo (sem filtro por plano)", async () => {
    state.membro = { papel: "membro", cliente_id: "cliente-basico" };
    state.rpcResult = true; // RPC libera tudo
    for (const m of MODULOS) {
      expect(await getPermissao(m)).toEqual(TOTAL);
    }
  });

  it("Membro não-dono sem permissão no RPC é negado em todos os módulos", async () => {
    state.membro = { papel: "membro", cliente_id: "cliente-basico" };
    state.rpcResult = false;
    for (const m of MODULOS) {
      expect(await getPermissao(m)).toEqual({
        ver: false, criar: false, editar: false, excluir: false,
      });
    }
  });

  it("Usuário sem vínculo (sem membro e sem role) é negado", async () => {
    for (const m of MODULOS) {
      expect(await getPermissao(m)).toEqual({
        ver: false, criar: false, editar: false, excluir: false,
      });
    }
  });
});

describe("Workspace tabs — sempre exibe os 7 módulos", () => {
  it("Lista de TABS contém todos os módulos independente de plano", async () => {
    const src = await import("fs").then(fs =>
      fs.readFileSync("src/routes/_authenticated/empresa.$id.tsx", "utf8")
    );
    for (const m of MODULOS) {
      expect(src).toContain(`modulo: "${m}"`);
    }
    // Garante que não há filtro por modulos_liberados
    expect(src).not.toMatch(/modulos_liberados/);
  });
});