'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserCircle, Settings, LogOut, Loader2 } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import type { SessionUser } from '@/app/api/auth/session/route'; 
import { Skeleton } from '@/components/ui/skeleton'; 

export function AppHeader() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      setIsLoadingSession(true);
      try {
        const response = await fetch('/api/auth/session', {
          // Add cache: 'no-store' to prevent browser caching
          cache: 'no-store'
        }); 
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched user session:", data.user); 
          
          // Check if avatar URL exists and if it's a valid format
          if (data.user && data.user.avatarUrl) {
            console.log("Avatar URL length:", data.user.avatarUrl.length);
            if (data.user.avatarUrl.startsWith('data:image/')) {
              console.log("Avatar is a data URI");
            } else {
              console.log("Avatar is a URL");
            }
            
            // Don't modify the avatarUrl if it's a data URI
            if (data.user.avatarUrl.startsWith('data:image/')) {
              setCurrentUser(data.user);
            } else {
              // Only add cache busting for regular URLs
              setCurrentUser({
                ...data.user,
                avatarUrl: data.user.avatarUrl + (data.user.avatarUrl.includes('?') ? '&' : '?') + 'v=' + Date.now()
              });
            }
          } else {
            setCurrentUser(data.user);
          }
        } else {
          setCurrentUser(null); 
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
        setCurrentUser(null);
      } finally {
        setIsLoadingSession(false);
      }
    };
    fetchSession();
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Logout failed' }));
        throw new Error(errorData.error || 'Logout failed');
      }
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      setCurrentUser(null); 
      window.location.href = '/auth/login'; 
    } catch (error) {
      toast({
        title: "Logout Error",
        description: (error as Error).message || "Could not sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAvatarFallback = (name?: string) => {
    if (!name || name.trim() === '') return <UserCircle className="h-full w-full" />;
    const nameParts = name.split(' ').filter(Boolean);
    if (nameParts.length === 1 && nameParts[0].length > 0) {
        return nameParts[0].charAt(0).toUpperCase();
    }
    if (nameParts.length > 1 && nameParts[0].length > 0 && nameParts[nameParts.length - 1].length > 0) {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
    return <UserCircle className="h-full w-full" />;
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        {/* Placeholder for page title or breadcrumbs */}
      </div>
      <div className="flex items-center gap-4">
        {isLoadingSession ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  {currentUser?.avatarUrl ? (
                    <AvatarImage 
                      src={currentUser.avatarUrl} 
                      alt={currentUser.name || 'User'} 
                      data-ai-hint="avatar person"
                      onLoad={() => console.log("Avatar image loaded successfully")}
                      onError={(e) => {
                        console.error("Avatar failed to load:", currentUser.avatarUrl);
                        // Instead of hiding the image, which might cause layout issues
                        // Log more information about the error
                        console.error("Error details:", e);
                        // Don't hide immediately - try to load a fallback image
                        try {
                          const img = e.target as HTMLImageElement;
                          // Only hide if we can't load a fallback
                          if (img.src !== "https://placehold.co/100x100.png") {
                            img.src = "https://placehold.co/100x100.png";
                          } else {
                            img.style.display = 'none';
                          }
                        } catch (fallbackError) {
                          console.error("Fallback also failed:", fallbackError);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }
                      }} 
                      style={{ objectFit: 'cover' }}
                    />
                  ) : null}
                  <AvatarFallback>{getAvatarFallback(currentUser?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
