import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSession } from "@/services/auth/queries";

/** Header corner: who is signed in, or a sign-in link. Reads the request: render inside <Suspense>. */
export async function UserMenu() {
  const session = await getSession();
  if (!session)
    return (
      <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm" })}>
        Sign in
      </Link>
    );
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{session.user.name || session.user.email}</span>
      <SignOutButton />
    </div>
  );
}
