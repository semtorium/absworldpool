"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { abstractTestnet } from "viem/chains";
import { LanguageProvider } from "@/lib/LanguageContext";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000, refetchInterval: 15_000 } },
  }));

  return (
    <AbstractWalletProvider chain={abstractTestnet}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AbstractWalletProvider>
  );
}
