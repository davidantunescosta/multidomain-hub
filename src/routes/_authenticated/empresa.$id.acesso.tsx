import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, RotateCcw } from "lucide-react";
import { Drawer } from "@/components/nexus/Drawer";
import { AcessoNegado } from "@/components/nexus/AcessoNegado";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/empresa/$id/acesso")({
  component: AcessoPage,
});

const PAPEIS = ["gerente", "membro", "atendente", "visualizador"] as const;
const MODULOS = ["pipeline","contratos","reunioes","tarefas","agenda","financeiro","equipe"] as const;
const ACOES = ["ver","criar","editar","excluir"] as const;
type Papel = typeof PAPEIS[number];
type Modulo = typeof MODULOS[number];
type Acao = typeof ACOES[number];

const PAPEL_BADGE: Record<string, string> = {
  dono: "bg-primary/15 text-primary border-primary/30",
  gerente: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  membro: "bg-muted text-foreground border-border",
  atendente: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  visualizador: "bg-background text-muted-foreground border-border",
};

function AcessoPage() {
  const { id: empresaId } = useParams({ from: "/_authenticated/empresa/$id/acesso" });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: gate, isLoading: gateLoad } = useQuery({
    queryKey: ["acesso-gate", user?.id, empresaId],
    queryFn: async () => {
      const [{ data: role }, { data: membro }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role","admin").maybeSingle(),
        supabase.from("membros").select("cliente_id, papel").eq("user_id", user!.id).eq("empresa_id", empresaId).eq("ativo", true).maybeSingle(),
      ]);
      const isAdmin = !!role;
      const isDono = membro?.papel === "dono";
      return { isAdmin, isDono, clienteId: membro?.cliente_id ?? null };
    },
    enabled: !!user && !!empresaId,
  });

  const { data: empresa } = useQuery({
    queryKey: ["empresa", empresaId],
    queryFn: async () => (await supabase.from("empresas").select("nome, cliente_id").eq("id", empresaId).single()).data,
  });

  const clienteId = (gate?.clienteId as string | null) ?? (empresa?.cliente_id as string | null) ?? null;

  const { data: cliente } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => clienteId ? (await supabase.from("clientes").select("*").eq("id", clienteId).single()).data : null,
    enabled: !!clienteId,
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-empresa", empresaId],
    queryFn: async () => (await supabase.from("membros").select("*").eq("empresa_id", empresaId).eq("ativo", true).order("nome")).data ?? [],
  });

  const { data: countMembrosCliente } = useQuery({
    queryKey: ["membros-count-cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return 0;
      const { count } = await supabase.from("membros").select("id", { count: "exact", head: true }).eq("cliente_id", clienteId).eq("ativo", true);
      return count ?? 0;
    },
    enabled: !!clienteId,
  });

  const { data: permissoes } = useQuery({
    queryKey: ["permissoes", clienteId],
    queryFn: async () => clienteId ? (await supabase.from("permissoes").select("*").eq("cliente_id", clienteId)).data ?? [] : [],
    enabled: !!clienteId,
  });

  const togglePerm = useMutation({
    mutationFn: async (args: { papel: Papel; modulo: Modulo; acao: Acao; valor: boolean; existeEspecifica: boolean; existeId?: string }) => {
      if (!clienteId) throw new Error("Cliente não vinculado");
      const col = args.acao === "ver" ? "pode_ver" : args.acao === "criar" ? "pode_criar" : args.acao === "editar" ? "pode_editar" : "pode_excluir";
      if (args.existeEspecifica && args.existeId) {
        const { error } = await supabase.from("permissoes").update({ [col]: args.valor } as any).eq("id", args.existeId);
        if (error) throw error;
      } else {
        const heredada = permissoes?.find(p => p.empresa_id === null && p.papel === args.papel && p.modulo === args.modulo);
        const base = heredada ?? { pode_ver: false, pode_criar: false, pode_editar: false, pode_excluir: false };
        const { error } = await supabase.from("permissoes").insert({
          cliente_id: clienteId,
          empresa_id: empresaId,
          papel: args.papel,
          modulo: args.modulo,
          pode_ver: base.pode_ver,
          pode_criar: base.pode_criar,
          pode_editar: base.pode_editar,
          pode_excluir: base.pode_excluir,
          [col]: args.valor,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissoes", clienteId] });
      qc.invalidateQueries({ queryKey: ["permissao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetEspecifica = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("permissoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissoes", clienteId] });
      qc.invalidateQueries({ queryKey: ["permissao"] });
      toast.success("Regra resetada para o padrão herdado.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [convidar, setConvidar] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPapel, setNovoPapel] = useState<Papel>("membro");

  const addMembro = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Empresa não vinculada a um contrato.");
      if (!cliente) throw new Error("Contrato não encontrado.");
      if ((countMembrosCliente ?? 0) >= cliente.max_usuarios) {
        throw new Error("Limite de usuários do seu plano atingido. Entre em contato para upgrade.");
      }
      const { error } = await supabase.from("membros").insert({
        empresa_id: empresaId, cliente_id: clienteId,
        nome: novoNome, email: novoEmail, papel: novoPapel, ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro adicionado. Compartilhe o link de acesso com ele.");
      setConvidar(false); setNovoNome(""); setNovoEmail(""); setNovoPapel("membro");
      qc.invalidateQueries({ queryKey: ["membros-empresa", empresaId] });
      qc.invalidateQueries({ queryKey: ["membros-count-cliente", clienteId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePapel = useMutation({
    mutationFn: async (args: { id: string; papel: string }) => {
      const { error } = await supabase.from("membros").update({ papel: args.papel }).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membros-empresa", empresaId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removerMembro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("membros").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido.");
      qc.invalidateQueries({ queryKey: ["membros-empresa", empresaId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (gateLoad) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (!gate?.isAdmin && !gate?.isDono) return <AcessoNegado mensagem="Apenas o dono do contrato gerencia o acesso." />;

  const getPerm = (papel: Papel, modulo: Modulo) => {
    const especifica = permissoes?.find(p => p.empresa_id === empresaId && p.papel === papel && p.modulo === modulo);
    const padrao = permissoes?.find(p => p.empresa_id === null && p.papel === papel && p.modulo === modulo);
    return { especifica, padrao };
  };

  const acaoCol = (acao: Acao) => acao === "ver" ? "pode_ver" : acao === "criar" ? "pode_criar" : acao === "editar" ? "pode_editar" : "pode_excluir";

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="px-4 py-4 border-b border-border">
        <h1 className="font-display font-semibold text-lg">Gestão de Acesso — {empresa?.nome}</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie quem pode acessar esta empresa e o que cada um pode fazer.</p>
      </header>

      {!clienteId && (
        <div className="m-6 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-500 px-4 py-3 text-sm">
          Esta empresa ainda não está vinculada a um contrato. Peça ao administrador para vincular.
        </div>
      )}

      <section className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold">Membros com acesso</h2>
          <button
            onClick={() => setConvidar(true)}
            disabled={!clienteId}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-2 disabled:opacity-50">
            <UserPlus className="size-3.5"/> Convidar membro
          </button>
        </div>
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          {(membros ?? []).length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhum membro cadastrado.</div>
          )}
          {membros?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3">
              <div className="size-8 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-semibold">
                {initials(m.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
              </div>
              <select
                value={m.papel}
                onChange={(e) => updatePapel.mutate({ id: m.id, papel: e.target.value })}
                disabled={m.papel === "dono"}
                className={`h-7 text-xs rounded-md border px-2 ${PAPEL_BADGE[m.papel] ?? "border-border bg-background"}`}>
                {m.papel === "dono" && <option value="dono">dono</option>}
                {PAPEIS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {m.papel !== "dono" && (
                <button
                  onClick={() => { if (confirm(`Remover ${m.nome}?`)) removerMembro.mutate(m.id); }}
                  className="size-7 grid place-items-center rounded text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5"/>
                </button>
              )}
            </div>
          ))}
        </div>
        {cliente && (
          <div className="text-xs text-muted-foreground">
            {countMembrosCliente ?? 0} de {cliente.max_usuarios} usuários do seu plano ({cliente.plano}).
          </div>
        )}
      </section>

      <section className="p-6 space-y-3">
        <div>
          <h2 className="font-display font-semibold">Permissões por papel (esta empresa)</h2>
          <p className="text-xs text-muted-foreground">
            Personalize o que cada papel pode fazer aqui. Toggles em cinza são herdados do padrão do contrato.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="text-left p-2 font-medium text-muted-foreground">Módulo</th>
                {PAPEIS.map(p => (
                  <th key={p} className="p-2 font-medium text-muted-foreground capitalize">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULOS.map(modulo => (
                <tr key={modulo} className="border-b border-border/60 last:border-0">
                  <td className="p-2 font-medium capitalize">{modulo}</td>
                  {PAPEIS.map(papel => {
                    const { especifica, padrao } = getPerm(papel, modulo);
                    return (
                      <td key={papel} className="p-2">
                        <div className="flex items-center gap-1">
                          {ACOES.map(acao => {
                            const col = acaoCol(acao);
                            const valEspec = especifica ? (especifica as any)[col] : undefined;
                            const valPadrao = padrao ? (padrao as any)[col] : false;
                            const herdado = valEspec === undefined;
                            const valor = herdado ? valPadrao : valEspec;
                            return (
                              <button
                                key={acao}
                                title={`${acao}${herdado ? " (herdado)" : ""}`}
                                disabled={!clienteId}
                                onClick={() => togglePerm.mutate({
                                  papel, modulo, acao, valor: !valor,
                                  existeEspecifica: !!especifica, existeId: especifica?.id,
                                })}
                                className={`h-6 px-1.5 rounded text-[10px] font-mono uppercase border transition-colors ${
                                  valor
                                    ? herdado
                                      ? "bg-muted text-muted-foreground border-border"
                                      : "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border"
                                }`}>
                                {acao[0]}
                              </button>
                            );
                          })}
                          {especifica && (
                            <button
                              title="Resetar para padrão herdado"
                              onClick={() => resetEspecifica.mutate(especifica.id)}
                              className="size-5 grid place-items-center rounded text-muted-foreground hover:text-foreground">
                              <RotateCcw className="size-3"/>
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-muted-foreground">
          V = ver · C = criar · E = editar · X = excluir. As permissões padrão são definidas pelo administrador do sistema.
        </div>
      </section>

      <section className="p-6 space-y-3">
        <h2 className="font-display font-semibold">Resumo de acesso por papel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PAPEIS.map(papel => {
            const ver: string[] = [], criarEditar: string[] = [], naoAcessa: string[] = [];
            MODULOS.forEach(modulo => {
              const { especifica, padrao } = getPerm(papel, modulo);
              const r = especifica ?? padrao;
              if (!r) { naoAcessa.push(modulo); return; }
              const v = (r as any).pode_ver, c = (r as any).pode_criar, e = (r as any).pode_editar;
              if (v) ver.push(modulo); else naoAcessa.push(modulo);
              if (c || e) criarEditar.push(modulo);
            });
            return (
              <div key={papel} className="rounded-lg border border-border bg-surface p-4">
                <div className={`inline-block text-xs px-2 py-0.5 rounded border mb-2 capitalize ${PAPEL_BADGE[papel]}`}>{papel}</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div><span className="text-foreground font-medium">Pode ver:</span> {ver.join(", ") || "—"}</div>
                  <div><span className="text-foreground font-medium">Cria/edita:</span> {criarEditar.join(", ") || "—"}</div>
                  <div><span className="text-foreground font-medium">Não acessa:</span> {naoAcessa.join(", ") || "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Drawer open={convidar} onOpenChange={setConvidar} title="Convidar membro" description="Adicione um novo membro a esta empresa.">
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background text-sm"/>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background text-sm"/>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Papel</label>
            <select value={novoPapel} onChange={e => setNovoPapel(e.target.value as Papel)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background text-sm">
              {PAPEIS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button
            onClick={() => addMembro.mutate()}
            disabled={!novoNome || !novoEmail || addMembro.isPending}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {addMembro.isPending ? "Salvando…" : "Adicionar membro"}
          </button>
        </div>
      </Drawer>
    </div>
  );
}