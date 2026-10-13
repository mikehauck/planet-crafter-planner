import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";

// Email + password only for now: there is no email sender, so no verification or password reset yet.
// Admins: the `role` column, set to "admin" by hand with SQL.
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  plugins: [admin({ defaultRole: "user" }), nextCookies()], // nextCookies must stay last
});
