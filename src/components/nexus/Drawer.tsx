import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { ReactNode } from "react";

export function Drawer({
  open, onOpenChange, title, description, children, side = "right", width = "max-w-xl",
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  title: string; description?: string; children: ReactNode;
  side?: "right" | "left"; width?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={`${width} w-full bg-surface border-border flex flex-col`}>
        <SheetHeader>
          <SheetTitle className="font-display text-lg">{title}</SheetTitle>
          {description && <SheetDescription className="text-xs">{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pr-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
