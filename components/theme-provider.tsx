"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Light / dark / system theme: sets the `dark` class on <html>, which `app/globals.css` keys off. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
