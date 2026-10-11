import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** The signed-in session, or null. Request-time data: callers render inside <Suspense>. Read once per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** The signed-in user; anyone else is sent to the sign-in page. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

/** The signed-in admin; other users get a 404, so admin pages do not show they exist. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
