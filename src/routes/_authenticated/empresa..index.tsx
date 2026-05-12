import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/empresa/")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/empresa/$id/pipeline", params }); },
});
