import { Search } from "lucide-react";
import { NotificationsBell } from "./NotificationsBell";
import { useCommandPalette } from "./palette-store";

export function Header({ title, accent }: { title?: string; accent?: string }) {
  const { setOpen } = useCommandPalette();
  return (
    <header className="h-12 border-b border-border bg-background flex items-center px-4 gap-3 shrink-0">
      {accent && <span className="size-2 rounded-full" style={{ background: accent }} />}
      <h1 className="text-sm font-semibold font-display tracking-tight">{title}</h1>
      <button
        onClick={() => setOpen(true)}
        className="ml-auto h-8 px-3 rounded-md border border-border bg-surface text-xs text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2 min-w-[260px]"
      >
        <Search className="size-3.5"/>
        <span>Buscar ou criar…</span>
        <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border border-border">⌘K</kbd>
      </button>
      <NotificationsBell/>
    </header>
  );
}
