import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, Trash2, KeyRound, UserPlus, ShieldOff } from "lucide-react";
import {
  listUsers, createUser, setUserRole, deleteUser, resetUserPassword, checkIsAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — NEXUS OS" }] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const fetchIsAdmin = useServerFn(checkIsAdmin);
  const fetchUsers = useServerFn(listUsers);
  const fnCreate = useServerFn(createUser);
  const fnRole = useServerFn(setUserRole);
  const fnDelete = useServerFn(deleteUser);
  const fnReset = useServerFn(resetUserPassword);

  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => fetchIsAdmin() });
  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
    enabled: !!adminQ.data?.isAdmin,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const mCreate = useMutation({
    mutationFn: (v: { email: string; password: string; isAdmin: boolean }) => fnCreate({ data: v }),
    onSuccess: () => { toast.success("Usuário criado."); refresh(); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const mRole = useMutation({
    mutationFn: (v: { userId: string; role: "admin"|"user"; grant: boolean }) => fnRole({ data: v }),
    onSuccess: () => { toast.success("Permissão atualizada."); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mDelete = useMutation({
    mutationFn: (userId: string) => fnDelete({ data: { userId } }),
    onSuccess: () => { toast.success("Usuário excluído."); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mReset = useMutation({
    mutationFn: (v: { userId: string; password: string }) => fnReset({ data: v }),
    onSuccess: () => toast.success("Senha redefinida."),
    onError: (e: any) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  if (adminQ.isLoading) return <div className="p-6 text-sm text-muted-foreground">Verificando permissões…</div>;
  if (!adminQ.data?.isAdmin) {
    return (
      <div className="p-10 max-w-lg">
        <div className="flex items-center gap-2 text-destructive mb-2"><ShieldOff className="size-5"/><h1 className="font-display text-xl">Acesso negado</h1></div>
        <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="h-12 border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary"/>
          <h1 className="font-display font-semibold">Administração</h1>
          <span className="text-xs text-muted-foreground ml-2">Controle total do sistema</span>
        </div>
        <button onClick={() => setOpen(true)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90">
          <UserPlus className="size-3.5"/> Novo usuário
        </button>
      </header>

      <div className="p-6">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-left px-3 py-2 font-medium">Permissões</th>
                <th className="text-left px-3 py-2 font-medium">Último login</th>
                <th className="text-right px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.isLoading && <tr><td colSpan={4} className="px-3 py-6 text-muted-foreground text-center">Carregando…</td></tr>}
              {usersQ.data?.map(u => {
                const isUserAdmin = u.roles.includes("admin");
                return (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {u.roles.map(r => (
                          <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${r==="admin"?"bg-primary/20 text-primary":"bg-accent text-foreground"}`}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "nunca"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => mRole.mutate({ userId: u.id, role: "admin", grant: !isUserAdmin })}
                          className="h-7 px-2 rounded text-[11px] border border-border hover:bg-accent flex items-center gap-1"
                          title={isUserAdmin ? "Remover admin" : "Tornar admin"}
                        >
                          <Shield className="size-3"/>{isUserAdmin ? "Remover admin" : "Tornar admin"}
                        </button>
                        <button
                          onClick={() => {
                            const p = prompt("Nova senha (mín. 6):");
                            if (p && p.length >= 6) mReset.mutate({ userId: u.id, password: p });
                          }}
                          className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-accent" title="Redefinir senha"
                        ><KeyRound className="size-3"/></button>
                        <button
                          onClick={() => { if (confirm(`Excluir ${u.email}?`)) mDelete.mutate(u.id); }}
                          className="h-7 w-7 grid place-items-center rounded border border-border hover:bg-destructive/20 text-destructive" title="Excluir"
                        ><Trash2 className="size-3"/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-background/80 grid place-items-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-lg p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="font-display font-semibold mb-4">Novo usuário</h2>
            <form onSubmit={(e) => { e.preventDefault(); mCreate.mutate({ email, password, isAdmin }); }} className="space-y-3">
              <input type="email" required placeholder="email@exemplo.com" value={email} onChange={e=>setEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-surface border border-border text-sm"/>
              <input type="password" required minLength={6} placeholder="Senha (mín. 6)" value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-surface border border-border text-sm"/>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isAdmin} onChange={e=>setIsAdmin(e.target.checked)}/> Administrador</label>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={()=>setOpen(false)} className="h-9 px-3 rounded-md text-sm border border-border">Cancelar</button>
                <button type="submit" disabled={mCreate.isPending} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm">{mCreate.isPending?"Criando…":"Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}