import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Building2, User2, FileText, Calendar, CheckSquare, Plus } from "lucide-react";
import { useCommandPalette } from "./palette-store";

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [q, setQ] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const { data } = useQuery({
    queryKey: ["palette-search", q],
    enabled: open,
    queryFn: async () => {
      const term = q.trim();
      const like = term ? `%${term}%` : "%%";
      const [emp, lead, ctr, reu, tar] = await Promise.all([
        supabase.from("empresas").select("id,nome").ilike("nome", like).limit(6),
        supabase.from("pipeline").select("id,nome_lead,empresa_lead,empresa_id").ilike("nome_lead", like).limit(6),
        supabase.from("contratos").select("id,nome_cliente,empresa_id").ilike("nome_cliente", like).limit(6),
        supabase.from("reunioes").select("id,titulo,data_hora,empresa_id").ilike("titulo", like).limit(6),
        supabase.from("tarefas").select("id,titulo,empresa_id").ilike("titulo", like).limit(6),
      ]);
      return {
        empresas: emp.data ?? [], leads: lead.data ?? [], contratos: ctr.data ?? [],
        reunioes: reu.data ?? [], tarefas: tar.data ?? [],
      };
    },
  });

  function go(path: string) { setOpen(false); nav({ to: path as any }); }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar empresas, leads, contratos, reuniões…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandGroup heading="Ações rápidas">
            <CommandItem onSelect={() => go("/empresas?new=1")}><Plus className="size-4 mr-2"/>Nova empresa</CommandItem>
          </CommandGroup>
          <CommandSeparator/>
          {data?.empresas.length ? (
            <CommandGroup heading="Empresas">
              {data.empresas.map(e => (
                <CommandItem key={e.id} onSelect={() => go(`/empresa/${e.id}`)}><Building2 className="size-4 mr-2"/>{e.nome}</CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {data?.leads.length ? (
            <CommandGroup heading="Leads">
              {data.leads.map(l => (
                <CommandItem key={l.id} onSelect={() => go(`/empresa/${l.empresa_id}/pipeline`)}>
                  <User2 className="size-4 mr-2"/>{l.nome_lead}{l.empresa_lead ? ` — ${l.empresa_lead}` : ""}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {data?.contratos.length ? (
            <CommandGroup heading="Contratos">
              {data.contratos.map(c => (
                <CommandItem key={c.id} onSelect={() => go(`/empresa/${c.empresa_id}/contratos`)}>
                  <FileText className="size-4 mr-2"/>{c.nome_cliente}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {data?.reunioes.length ? (
            <CommandGroup heading="Reuniões">
              {data.reunioes.map(r => (
                <CommandItem key={r.id} onSelect={() => go(`/empresa/${r.empresa_id}/reunioes`)}>
                  <Calendar className="size-4 mr-2"/>{r.titulo}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {data?.tarefas.length ? (
            <CommandGroup heading="Tarefas">
              {data.tarefas.map(t => (
                <CommandItem key={t.id} onSelect={() => go(`/empresa/${t.empresa_id}/tarefas`)}>
                  <CheckSquare className="size-4 mr-2"/>{t.titulo}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
