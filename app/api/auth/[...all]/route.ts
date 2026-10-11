// Better Auth's own endpoints (sign-in, sign-up, session). The one API route; the app itself uses server components.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
