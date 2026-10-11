import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in · Planet Crafter planner" };

export default function SignInPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:underline">
        ← Back to the planner
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </main>
  );
}
