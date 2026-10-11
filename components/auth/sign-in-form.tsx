"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

/** Sign in, or create an account with the same form. */
export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(form: FormData) {
    setPending(true);
    setError(null);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const { error } = signUp
      ? await authClient.signUp.email({ email, password, name: String(form.get("name")) })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (error) return setError(error.message ?? "Something went wrong.");
    router.push("/");
    router.refresh();
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      {signUp && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signUp ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {signUp ? "Create account" : "Sign in"}
      </Button>
      <Button type="button" variant="link" onClick={() => setMode(signUp ? "sign-in" : "sign-up")}>
        {signUp ? "Have an account? Sign in" : "No account? Create one"}
      </Button>
    </form>
  );
}
