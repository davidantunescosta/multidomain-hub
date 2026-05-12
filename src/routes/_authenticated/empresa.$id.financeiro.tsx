import { createFileRoute } from "@tanstack/react-router";
import { SoonStub } from "@/components/nexus/SoonStub";

export const Route = createFileRoute("/_authenticated/empresa/$id/financeiro")({
  component: () => <SoonStub name="Financeiro"/>,
});
