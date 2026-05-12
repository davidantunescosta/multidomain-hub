import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { SoonStub } from "@/components/nexus/SoonStub";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: () => (<><Header title="Agenda"/><SoonStub name="Agenda"/></>),
});
