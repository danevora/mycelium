import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mycelium — LLM Wiki",
  description: "An AI-maintained personal knowledge base.",
};

// Applied before paint to avoid a flash of the wrong theme. Defaults to dark.
const themeBootScript = `(function(){try{var t=localStorage.getItem('mycelium-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

// Mycelium mark: a small connected-node network.
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 17l5-7m1 0l6 4M11 10l-3 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="11" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="14" r="2" fill="currentColor" />
      <circle cx="6" cy="17.5" r="2" fill="currentColor" />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const nav = [
    { href: "/", label: "Sources" },
    { href: "/graph", label: "Graph" },
    { href: "/wiki", label: "Wiki" },
    { href: "/chat", label: "Chat" },
  ];
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        </head>
        <body>
          <header className="sticky top-0 z-10 border-b border-edge bg-canvas/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
              <Link href="/" className="flex items-center gap-2 text-lav">
                <Mark />
                <span className="text-lg font-semibold tracking-tight text-lav-light">
                  Mycelium
                </span>
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-md px-3 py-1.5 text-muted transition hover:bg-cardhi hover:text-lav-light"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <ThemeToggle />
                {userId ? (
                  <UserButton />
                ) : (
                  <SignInButton mode="modal">
                    <button className="rounded-md bg-lav px-3 py-1.5 text-sm font-medium text-onaccent hover:bg-lav-light">
                      Sign in
                    </button>
                  </SignInButton>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
