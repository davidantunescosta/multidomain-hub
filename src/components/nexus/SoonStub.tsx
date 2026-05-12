import { EmptyState } from "./EmptyState";
import { Wrench } from "lucide-react";

export function SoonStub({ name }: { name: string }) {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <EmptyState
        icon={<Wrench className="size-5"/>}
        title={`${name} — em construção`}
        description="A estrutura de banco e RLS já está pronta. Esta tela será implementada na próxima iteração."
      />
    </main>
  );
}
