import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AccountMenu } from "@/components/auth/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/services/auth/queries";

/** Header corner: theme button, then a sign-in link or the account menu. Reads the request: render inside <Suspense>. */
export async function UserMenu() {
  const session = await getSession();
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {session ? (
        <AccountMenu name={session.user.name} email={session.user.email} />
      ) : (
        <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Sign in
        </Link>
      )}
    </div>
  );
}
