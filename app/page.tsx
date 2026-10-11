import { Suspense } from "react";
import { connection } from "next/server";
import { UserMenu } from "@/components/auth/user-menu";
import { AccountPlanner, LocalPlanner } from "@/components/planner/planner";
import { getSession } from "@/services/auth/queries";
import { getCatalog } from "@/services/catalog/queries";
import { listPlans } from "@/services/plans/queries";

export default function Home() {
  return (
    // The ingredients drawer is fixed to the right edge; leave room for it while it is open.
    <div className="flex-1 lg:has-[[data-ingredients-drawer]]:pr-80">
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-1 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Planet Crafter planner</h1>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </div>
        <p className="mb-6 text-muted-foreground">
          Pick what you want to build; see the raw resources it takes, all the way down.
        </p>
        <Suspense fallback={<p className="text-muted-foreground">Loading items…</p>}>
          <PlannerWithData />
        </Suspense>
      </main>
    </div>
  );
}

async function PlannerWithData() {
  // Read the database per request, not at build time, so builds need no database.
  await connection();
  const [catalog, session] = await Promise.all([getCatalog(), getSession()]);
  if (!session) return <LocalPlanner catalog={catalog} />;
  // Keyed by user so signing in as someone else starts from their plans, not the last state.
  return <AccountPlanner
      key={session.user.id}
      catalog={catalog}
      userId={session.user.id}
      plans={await listPlans(session.user.id)}
    />;
}
