import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { SoonStub } from "@/components/nexus/SoonStub";

export const Route = createFileRoute("/_authenticated/tarefas")({
  component: () => (<><Header title="Tarefas"/><SoonStub name="Tarefas"/></>),
});
