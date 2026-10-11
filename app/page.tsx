import { Suspense } from "react";
import { connection } from "next/server";
import { Planner } from "@/components/planner/planner";
import { getCatalog } from "@/lib/catalog";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Planet Crafter planner</h1>
      <p className="mb-6 text-muted-foreground">
        Pick what you want to build; see the raw resources it takes, all the way down.
      </p>
      <Suspense fallback={<p className="text-muted-foreground">Loading items…</p>}>
        <PlannerWithData />
      </Suspense>
    </main>
  );
}

async function PlannerWithData() {
  // Read the database per request, not at build time, so builds need no database.
  await connection();
  return <Planner catalog={await getCatalog()} />;
}
