
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListChecks, Settings, TerminalSquare, LayoutGrid, ShieldCheck, Eye } from 'lucide-react'; // Added Eye
import { cn } from '@/lib/utils';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import React from 'react';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/tasks', label: 'My Tasks', icon: ListChecks },
  { href: '/views', label: 'Views', icon: Eye }, // Added Views link
  { href: '/settings', label: 'Settings', icon: Settings },
];

const bottomNavItems = [
  { href: '/admin', label: 'Admin Panel', icon: ShieldCheck },
  { href: '/api-docs', label: 'API Docs', icon: TerminalSquare },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            <path d="M12.5 8H11v6l4.75 2.85.75-1.23-4-2.37z" opacity=".7"/>
          </svg>
          <span className="group-data-[collapsible=icon]:hidden">ChronoTask</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between p-2">
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  tooltip={{ children: item.label }}
                  className="justify-start"
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        <SidebarFooter className="mt-auto p-2">
          <SidebarSeparator className="my-2" />
          <SidebarMenu>
            {bottomNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={{ 
                      children: item.label
                    }}
                    className="justify-start"
                  >
                    <a>
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </SidebarContent>
    </>
  );
}
