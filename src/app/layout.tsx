"use client"; // Required for QueryClientProvider and usePathname

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import '@/styles/components.css';
import '@/styles/layouts.css';
import '@/styles/reset.css';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePathname } from 'next/navigation'; // Import usePathname

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const queryClient = new QueryClient();

// Define authentication routes
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some(route => pathname.startsWith(route));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>ChronoChimp</title>
        <meta name="description" content="Modern Time Tracking and Productivity Application" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <TanstackQueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {isAuthPage ? (
              <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
                {children}
              </main>
            ) : (
              <SidebarProvider defaultOpen={true}>
                <Sidebar collapsible="icon">
                  <AppSidebar />
                </Sidebar>
                <SidebarInset className="overflow-x-hidden">
                  <AppHeader />
                  <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                  </main>
                </SidebarInset>
              </SidebarProvider>
            )}
            <Toaster />
          </ThemeProvider>
        </TanstackQueryClientProvider>
      </body>
    </html>
  );
}
