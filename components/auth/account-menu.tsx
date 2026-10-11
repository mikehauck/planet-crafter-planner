"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

/** First letters of the first two words of the name; the email's first letter when there is no name. */
function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return email.charAt(0).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

/** Signed-in header button: initials in a circle, opening a menu with sign out. */
export function AccountMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Account"
      >
        {initials(name, email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{name || email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut();
            router.refresh();
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
