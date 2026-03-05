import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3 pytania | DFE.academy",
  description: "Grupowy diagnostyczny czat z AI",
};

function Header() {
  return (
    <header className="w-full border-b border-white/10 bg-navy/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-gold font-bold text-xl tracking-tight">
          DFE.academy
        </span>
        <span className="text-white/80 text-sm">
          Akademia Leona Kozminskiego
        </span>
      </div>
      <div className="text-center pb-3">
        <h1 className="text-2xl font-bold text-white">3 pytania</h1>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="w-full border-t border-white/10 py-4 text-center text-white/50 text-xs">
      &copy; DFE.academy &middot; Wszelkie prawa zastrzezone.
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
