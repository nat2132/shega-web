'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/hooks/useTranslations';
import { ThemeProvider } from '@/hooks/useTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: 'var(--foreground)', secondary: 'var(--background)' } },
            }}
          />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}