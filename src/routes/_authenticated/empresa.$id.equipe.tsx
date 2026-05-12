import { createFileRoute } from "@tanstack/react-router";
import { SoonStub } from "@/components/nexus/SoonStub";

export const Route = createFileRoute("/_authenticated/empresa/$id/equipe")({
  component: () => <SoonStub name="Equipe"/>,
});
