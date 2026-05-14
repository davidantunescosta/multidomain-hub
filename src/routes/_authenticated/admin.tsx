import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Database, Loader2, CheckCircle2, AlertCircle, Plus, Link2, Unlink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoData, seedPermissoesCliente } from "@/lib/seed-demo";
import { Drawer } from "@/components/nexus/Drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — NEXUS OS" }] }),
  component: AdminPage,
});

const PLANO_PRICE: Record<string, number> = { basico: 197, profissional: 397, enterprise: 797 };
const PLANO_MODULOS: Record<string, string[]> = {
  basico:        ["pipeline","agenda"],
  profissional:  ["pipeline","agenda","reunioes","tarefas","contratos"],
  enterprise:    ["pipeline","agenda","reunioes","tarefas","contratos","financeiro","equipe"],
};
const PLANO_LIMITES: Record<string, { max_empresas: number; max_usuarios: number }> = {
  basico:       { max_empresas: 1,   max_usuarios: 3 },
  profissional: { max_empresas: 3,   max_usuarios: 8 },
  enterprise:   { max_empresas: 999, max_usuarios: 999 },
};
const PLANO_DESC: Record<string, string> = {
  basico: "Para quem está começando. Gerencie seus leads e compromissos.",
  profissional: "Para equipes em crescimento. Controle completo do ciclo de vendas.",
  enterprise: "Sem limites. Visibilidade financeira e gestão completa de equipe.",
};
const PLANO_BADGE: Record<string, string> = {
  basico: "bg-muted text-muted-foreground border-border",
  profissional: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  enterprise: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};
const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-green-500/15 text-green-500 border-green-500/30",
  suspenso: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  encerrado: "bg-red-500/15 text-red-500 border-red-500/30",
};

const PAPEIS = ["gerente","membro","atendente","visualizador"] as const;
const MODULOS = ["pipeline","contratos","reunioes","tarefas","agenda","financeiro","equipe"] as const;
const ACOES = ["ver","criar","editar","excluir"] as const;
type Papel = typeof PAPEIS[number];
type Modulo = typeof MODULOS[number];
type Acao = typeof ACOES[number];

function AdminPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <header className="h-12 border-b border-border px-4 flex items-center">
        <h1 className="font-display font-semibold">Administração</h1>
      </header>
      <div className="p-6">
        <Tabs defaultValue="usuarios">
          <TabsList>
            <TabsTrigger value="usuarios">Usuários do sistema</TabsTrigger>
            <TabsTrigger value="clientes">Clientes & Contratos</TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios" className="mt-6">
            <SeedSection/>
          </TabsContent>
          <TabsContent value="clientes" className="mt-6">
            <ClientesSection/>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SeedSection() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSeed() {
    setLoading(true);
    setResult(null);
    try {
      const r = await seedDemoData();
      setResult(r);
      if (r.success) toast.success(r.message);
      else toast.error(r.message);
    } catch (e: any) {
      const msg = e?.message ?? "Erro inesperado.";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="size-9 rounded-md bg-primary/10 grid place-items-center text-primary">
              <Database className="size-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Dados de demonstração</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Popula o sistema com empresas, leads, contratos, reuniões, tarefas e financeiro
                de demonstração para testar todas as funcionalidades.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground mb-4">
            Se já existirem empresas cadastradas, o seed não será executado.
          </div>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Carregando dados…" : "Carregar dados de demonstração"}
          </button>

          {result && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                result.success
                  ? "border-green-500/30 bg-green-500/10 text-green-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}
        </div>
    </div>
  );
}

function ClientesSection() {
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const { data: clientes } = useQuery({
    queryKey: ["admin-clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-clientes-counts"],
    queryFn: async () => {
      const [{ data: emps }, { data: mems }, { count: empresasAtivas }] = await Promise.all([
        supabase.from("empresas").select("id, cliente_id"),
        supabase.from("membros").select("id, cliente_id, ativo").eq("ativo", true),
        supabase.from("empresas").select("id", { count: "exact", head: true }).eq("status", "ativa"),
      ]);
      const empCount = new Map<string, number>();
      const memCount = new Map<string, number>();
      (emps ?? []).forEach(e => { if (e.cliente_id) empCount.set(e.cliente_id, (empCount.get(e.cliente_id) ?? 0) + 1); });
      (mems ?? []).forEach(m => { if (m.cliente_id) memCount.set(m.cliente_id, (memCount.get(m.cliente_id) ?? 0) + 1); });
      const totalUsuarios = (mems ?? []).length;
      return { empCount, memCount, totalUsuarios, empresasAtivas: empresasAtivas ?? 0 };
    },
  });

  const ativos = (clientes ?? []).filter(c => c.status === "ativo");
  const mrr = ativos.reduce((s, c) => s + (PLANO_PRICE[c.plano] ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Clientes ativos" value={ativos.length}/>
        <Kpi label="MRR consolidado" value={`R$ ${mrr.toLocaleString("pt-BR")}`}/>
        <Kpi label="Total de usuários" value={counts?.totalUsuarios ?? 0}/>
        <Kpi label="Empresas ativas" value={counts?.empresasAtivas ?? 0}/>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold">Contratos</h2>
        <button onClick={() => setNovo(true)}
          className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
          <Plus className="size-4"/> Novo cliente
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Cliente</th>
              <th className="text-left p-3 font-medium">Email do dono</th>
              <th className="text-left p-3 font-medium">Plano</th>
              <th className="text-left p-3 font-medium">Módulos</th>
              <th className="text-left p-3 font-medium">Empresas</th>
              <th className="text-left p-3 font-medium">Usuários</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(clientes ?? []).length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">Nenhum cliente cadastrado.</td></tr>
            )}
            {clientes?.map(c => (
              <tr key={c.id} onClick={() => setSelecionado(c.id)}
                className="border-t border-border cursor-pointer hover:bg-accent/30">
                <td className="p-3 font-medium">{c.nome}</td>
                <td className="p-3 text-muted-foreground">{c.email_dono}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded border capitalize ${PLANO_BADGE[c.plano]}`}>{c.plano}</span></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1 max-w-[260px]">
                    {((c as any).modulos_liberados ?? []).map((m: string) => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border capitalize">{m}</span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{counts?.empCount.get(c.id) ?? 0}/{c.max_empresas}</td>
                <td className="p-3 text-xs text-muted-foreground">{counts?.memCount.get(c.id) ?? 0}/{c.max_usuarios}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded border capitalize ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NovoClienteDrawer open={novo} onOpenChange={setNovo} onCreated={(id) => {
        qc.invalidateQueries({ queryKey: ["admin-clientes"] });
        setNovo(false);
        setSelecionado(id);
      }}/>
      <ClienteDrawer clienteId={selecionado} onClose={() => setSelecionado(null)}/>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className="text-2xl font-display font-semibold mt-1">{value}</div>
    </div>
  );
}

function NovoClienteDrawer({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [plano, setPlano] = useState("basico");
  const [maxEmp, setMaxEmp] = useState(PLANO_LIMITES.basico.max_empresas);
  const [maxUsu, setMaxUsu] = useState(PLANO_LIMITES.basico.max_usuarios);
  const [salvando, setSalvando] = useState(false);

  function escolherPlano(p: string) {
    setPlano(p);
    setMaxEmp(PLANO_LIMITES[p].max_empresas);
    setMaxUsu(PLANO_LIMITES[p].max_usuarios);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const { data, error } = await supabase.from("clientes").insert({
        nome, email_dono: email, plano,
        max_empresas: maxEmp, max_usuarios: maxUsu,
        modulos_liberados: PLANO_MODULOS[plano],
      }).select().single();
      if (error) throw error;
      await seedPermissoesCliente(data.id);
      toast.success("Cliente criado com permissões padrão.");
      onCreated(data.id);
      setNome(""); setEmail(""); escolherPlano("basico");
    } catch (e: any) { toast.error(e.message); }
    finally { setSalvando(false); }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Novo cliente" description="Cadastre um novo contrato.">
      <div className="p-4 space-y-3">
        <Field label="Nome"><input value={nome} onChange={e => setNome(e.target.value)} className="input"/></Field>
        <Field label="Email do dono"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input"/></Field>
        <Field label="Plano">
          <select value={plano} onChange={e => escolherPlano(e.target.value)} className="input">
            <option value="basico">Básico — R$ 197</option>
            <option value="profissional">Profissional — R$ 397</option>
            <option value="enterprise">Enterprise — R$ 797</option>
          </select>
        </Field>
        <div className="rounded-md border border-border bg-background/50 p-3 text-xs space-y-2">
          <div className="text-muted-foreground">{PLANO_DESC[plano]}</div>
          <div className="flex flex-wrap gap-1">
            {PLANO_MODULOS[plano].map(m => (
              <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border capitalize">{m}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Máx empresas"><input type="number" value={maxEmp} onChange={e => setMaxEmp(+e.target.value)} className="input"/></Field>
          <Field label="Máx usuários"><input type="number" value={maxUsu} onChange={e => setMaxUsu(+e.target.value)} className="input"/></Field>
        </div>
        <button onClick={salvar} disabled={!nome || !email || salvando}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          {salvando ? "Salvando…" : "Criar cliente"}
        </button>
      </div>
      <style>{`.input{margin-top:.25rem;width:100%;height:2.25rem;padding:0 .75rem;border-radius:.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:.875rem}`}</style>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="text-xs text-muted-foreground">{label}</label>{children}</div>);
}

function ClienteDrawer({ clienteId, onClose }: { clienteId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const open = !!clienteId;

  const { data: cliente } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: async () => clienteId ? (await supabase.from("clientes").select("*").eq("id", clienteId).single()).data : null,
    enabled: !!clienteId,
  });

  const { data: empresasCliente } = useQuery({
    queryKey: ["cliente-empresas", clienteId],
    queryFn: async () => clienteId ? (await supabase.from("empresas").select("*").eq("cliente_id", clienteId).order("nome")).data ?? [] : [],
    enabled: !!clienteId,
  });

  const { data: empresasLivres } = useQuery({
    queryKey: ["empresas-livres"],
    queryFn: async () => (await supabase.from("empresas").select("id, nome").is("cliente_id", null).order("nome")).data ?? [],
    enabled: !!clienteId,
  });

  const { data: permissoes } = useQuery({
    queryKey: ["permissoes", clienteId],
    queryFn: async () => clienteId ? (await supabase.from("permissoes").select("*").eq("cliente_id", clienteId)).data ?? [] : [],
    enabled: !!clienteId,
  });

  const [edit, setEdit] = useState<any>(null);
  const [vincId, setVincId] = useState("");

  const formCliente = edit ?? cliente ?? {};

  const salvar = useMutation({
    mutationFn: async () => {
      const planoMudou = cliente?.plano !== formCliente.plano;
      const payload: any = {
        nome: formCliente.nome, email_dono: formCliente.email_dono,
        plano: formCliente.plano, max_empresas: formCliente.max_empresas,
        max_usuarios: formCliente.max_usuarios, status: formCliente.status,
        observacoes: formCliente.observacoes,
      };
      if (planoMudou && PLANO_MODULOS[formCliente.plano]) {
        payload.modulos_liberados = PLANO_MODULOS[formCliente.plano];
      }
      const { error } = await supabase.from("clientes").update(payload).eq("id", clienteId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
      qc.invalidateQueries({ queryKey: ["cliente", clienteId] });
      qc.invalidateQueries({ queryKey: ["permissao"] });
      setEdit(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const vincular = useMutation({
    mutationFn: async (empresaId: string) => {
      const { error } = await supabase.from("empresas").update({ cliente_id: clienteId }).eq("id", empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa vinculada.");
      qc.invalidateQueries({ queryKey: ["cliente-empresas", clienteId] });
      qc.invalidateQueries({ queryKey: ["empresas-livres"] });
      qc.invalidateQueries({ queryKey: ["admin-clientes-counts"] });
      setVincId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const desvincular = useMutation({
    mutationFn: async (empresaId: string) => {
      const { error } = await supabase.from("empresas").update({ cliente_id: null }).eq("id", empresaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa desvinculada.");
      qc.invalidateQueries({ queryKey: ["cliente-empresas", clienteId] });
      qc.invalidateQueries({ queryKey: ["empresas-livres"] });
      qc.invalidateQueries({ queryKey: ["admin-clientes-counts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePerm = useMutation({
    mutationFn: async (args: { papel: Papel; modulo: Modulo; acao: Acao; valor: boolean; existeId?: string }) => {
      const col = args.acao === "ver" ? "pode_ver" : args.acao === "criar" ? "pode_criar" : args.acao === "editar" ? "pode_editar" : "pode_excluir";
      if (args.existeId) {
        const { error } = await supabase.from("permissoes").update({ [col]: args.valor } as any).eq("id", args.existeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("permissoes").insert({
          cliente_id: clienteId!, empresa_id: null,
          papel: args.papel, modulo: args.modulo,
          pode_ver: false, pode_criar: false, pode_editar: false, pode_excluir: false,
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

  const acaoCol = (acao: Acao) => acao === "ver" ? "pode_ver" : acao === "criar" ? "pode_criar" : acao === "editar" ? "pode_editar" : "pode_excluir";

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()} title={cliente?.nome ?? "Cliente"} description={cliente?.email_dono} width="max-w-3xl">
      {!cliente ? <div className="p-4 text-sm text-muted-foreground">Carregando…</div> : (
      <div className="p-4 space-y-6">
        <section className="space-y-3">
          <h3 className="font-display font-semibold">Dados do contrato</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome"><input value={formCliente.nome ?? ""} onChange={e => setEdit({...formCliente, nome: e.target.value})} className="input"/></Field>
            <Field label="Email do dono"><input value={formCliente.email_dono ?? ""} onChange={e => setEdit({...formCliente, email_dono: e.target.value})} className="input"/></Field>
            <Field label="Plano">
              <select value={formCliente.plano ?? "basico"} onChange={e => setEdit({...formCliente, plano: e.target.value})} className="input">
                <option value="basico">Básico</option>
                <option value="profissional">Profissional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={formCliente.status ?? "ativo"} onChange={e => setEdit({...formCliente, status: e.target.value})} className="input">
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </Field>
            <Field label="Máx empresas"><input type="number" value={formCliente.max_empresas ?? 0} onChange={e => setEdit({...formCliente, max_empresas: +e.target.value})} className="input"/></Field>
            <Field label="Máx usuários"><input type="number" value={formCliente.max_usuarios ?? 0} onChange={e => setEdit({...formCliente, max_usuarios: +e.target.value})} className="input"/></Field>
          </div>
          <Field label="Observações"><textarea value={formCliente.observacoes ?? ""} onChange={e => setEdit({...formCliente, observacoes: e.target.value})} className="input" rows={3}/></Field>
          <button onClick={() => salvar.mutate()} disabled={!edit || salvar.isPending}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
            {salvar.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </section>

        <section className="space-y-3">
          <h3 className="font-display font-semibold">Empresas deste cliente</h3>
          <div className="rounded-lg border border-border bg-background/50 divide-y divide-border">
            {(empresasCliente ?? []).length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Nenhuma empresa vinculada.</div>
            )}
            {empresasCliente?.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="size-2 rounded-full" style={{ background: e.cor_identidade }}/>
                <span className="flex-1">{e.nome}</span>
                <span className="text-xs text-muted-foreground capitalize">{e.status}</span>
                <button onClick={() => { if (confirm(`Desvincular ${e.nome}?`)) desvincular.mutate(e.id); }}
                  className="size-7 grid place-items-center rounded text-muted-foreground hover:text-destructive">
                  <Unlink className="size-3.5"/>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={vincId} onChange={e => setVincId(e.target.value)} className="input flex-1">
              <option value="">— Selecione uma empresa sem contrato —</option>
              {(empresasLivres ?? []).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <button onClick={() => vincId && vincular.mutate(vincId)} disabled={!vincId}
              className="h-9 px-3 rounded-md border border-border bg-surface text-sm flex items-center gap-2 disabled:opacity-50">
              <Link2 className="size-3.5"/> Vincular
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-display font-semibold">Permissões padrão</h3>
          <p className="text-xs text-muted-foreground">Valem para todas as empresas deste cliente. Cada toggle: V=ver, C=criar, E=editar, X=excluir.</p>
          <div className="rounded-lg border border-border bg-background/50 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-medium text-muted-foreground">Módulo</th>
                  {PAPEIS.map(p => <th key={p} className="p-2 font-medium text-muted-foreground capitalize">{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {MODULOS.map(modulo => (
                  <tr key={modulo} className="border-b border-border/60 last:border-0">
                    <td className="p-2 font-medium capitalize">{modulo}</td>
                    {PAPEIS.map(papel => {
                      const reg = permissoes?.find(p => p.empresa_id === null && p.papel === papel && p.modulo === modulo);
                      return (
                        <td key={papel} className="p-2">
                          <div className="flex items-center gap-1">
                            {ACOES.map(acao => {
                              const valor = reg ? (reg as any)[acaoCol(acao)] : false;
                              return (
                                <button key={acao} title={acao}
                                  onClick={() => togglePerm.mutate({ papel, modulo, acao, valor: !valor, existeId: reg?.id })}
                                  className={`h-6 px-1.5 rounded text-[10px] font-mono uppercase border ${valor ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
                                  {acao[0]}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}
      <style>{`.input{margin-top:.25rem;width:100%;min-height:2.25rem;padding:.4rem .75rem;border-radius:.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:.875rem}`}</style>
    </Drawer>
  );
}