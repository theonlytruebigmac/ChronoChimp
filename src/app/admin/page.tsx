"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShieldCheck, Users, PlusCircle, MoreHorizontal, FilePenLine, Trash2, RefreshCw, AlertTriangle, ShieldAlert, UserPlus, Mail, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchAdminUsers, 
  deleteAdminUser, 
  inviteAdminUser, 
  fetchPendingInvites, 
  deleteInvite, 
  resendInvite, 
  type InvitedUser,
  type AdminDisplayUser,
  isInvitedUser
} from '@/lib/api/users';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle as InviteDialogTitle, DialogDescription as InviteDialogDescription, DialogFooter as InviteDialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export type UserRole = "Admin" | "Editor" | "Viewer";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedDate: string;
  avatarUrl?: string;
  isTwoFactorEnabled?: boolean;
}

const userRolesForSelect: UserRole[] = ["Admin", "Editor", "Viewer"];

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<UserRole>('Viewer');


  const { data: users = [], isLoading, isError, error, refetch } = useQuery<MockUser[], Error>({
    queryKey: ['adminUsers'],
    queryFn: fetchAdminUsers,
  });

  // Add new state for invited users
  const { data: invitedUsers = [], isLoading: isLoadingInvites } = useQuery<InvitedUser[], Error>({
    queryKey: ['adminInvites'],
    queryFn: fetchPendingInvites,
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.removeQueries({ queryKey: ['adminUser', userId] });
      toast({ title: "User Deleted", description: data.message });
    },
    onError: (err: Error, userId) => {
      toast({ title: "Error Deleting User", description: err.message || `Could not delete user ${userId}.`, variant: "destructive" });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: (data: { email: string; role: UserRole }) => inviteAdminUser(data),
    onSuccess: (data) => {
      toast({ title: "User Invited", description: data.message });
      setIsInviteUserDialogOpen(false);
      setInviteEmail('');
      setInviteRole('Viewer');
    },
    onError: (err: Error) => {
      toast({ title: "Error Inviting User", description: err.message || "Could not send invite.", variant: "destructive" });
    }
  });

  // Add mutations for invite actions
  const deleteInviteMutation = useMutation({
    mutationFn: deleteInvite,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminInvites'] });
      toast({ title: "Invite Deleted", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error Deleting Invite", description: err.message, variant: "destructive" });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: resendInvite,
    onSuccess: (data) => {
      toast({ title: "Invite Resent", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error Resending Invite", description: err.message, variant: "destructive" });
    },
  });

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  // Add a function to check SMTP configuration before sending invites
  const checkSmtpConfigured = async () => {
    try {
      const response = await fetch('/api/admin/smtp-status');
      if (response.ok) {
        const data = await response.json();
        return data.configured;
      }
      return false;
    } catch (error) {
      console.error("Error checking SMTP status", error);
      return false;
    }
  };

  // Change the "warning" variant to a supported variant type
  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast({ title: "Email Required", description: "Please enter an email address for the invite.", variant: "destructive"});
      return;
    }
    // Basic email format check (can be more robust)
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive"});
      return;
    }

    // Check SMTP configuration
    const isSmtpConfigured = await checkSmtpConfigured();
    if (!isSmtpConfigured) {
      toast({ 
        title: "⚠️ SMTP Not Configured", 
        description: "Email invites require SMTP configuration. The invite will be created but no email will be sent.",
        variant: "default"  // Changed from "warning" to "default"
      });
    }
    
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleDeleteInvite = (inviteId: string) => {
    deleteInviteMutation.mutate(inviteId);
  };

  const handleResendInvite = (inviteId: string) => {
    resendInviteMutation.mutate(inviteId);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getRoleBadgeVariant = (role: UserRole): React.ComponentProps<typeof Badge>['variant'] => {
    switch (role) {
      case "Admin": return "destructive";
      case "Editor": return "secondary";
      case "Viewer": return "outline";
      default: return "default";
    }
  };

  const getAvatarFallbackInitials = (name: string) => {
    if (!name) return "U";
    const nameParts = name.split(' ').filter(Boolean);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    if (nameParts.length > 1) {
      return nameParts[0].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    }
    return nameParts[0]?.charAt(0).toUpperCase() || "U";
  };

  const totalUsers = users.length;
  const adminUsersCount = users.filter(user => user.role === "Admin").length;
  const usersWithout2FACount = users.filter(user => !user.isTwoFactorEnabled).length;

  const summaryCardsConfig = [
    { title: "Total Users", icon: Users, color: "text-primary", dataKey: 'totalUsers' as const },
    { title: "Admin Accounts", icon: ShieldCheck, color: "text-destructive", dataKey: 'adminUsersCount' as const },
    { title: "Users without 2FA", icon: ShieldAlert, color: "text-yellow-500", dataKey: 'usersWithout2FACount' as const },
  ];

  const summaryData = {
    totalUsers,
    adminUsersCount,
    usersWithout2FACount
  };


  // Update loading state
  if (isLoading || isLoadingInvites) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48 mb-4" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaryCardsConfig.map((_, i) => (
            <Card key={i} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-1/4 mt-1" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-2" />
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 text-center p-8 max-w-2xl mx-auto">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive">Failed to load users</h2>
        <p className="text-muted-foreground text-lg mt-2">
          {error?.message || "An unexpected error occurred while trying to fetch user data."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
            Please check your connection or try again later.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="mt-6 text-base py-2 px-4">
          <RefreshCw className="mr-2 h-5 w-5" /> Retry
        </Button>
      </div>
    );
  }

  // Update how we combine users and invites with proper type safety
  const allUsers: AdminDisplayUser[] = [
    // For regular users, explicitly set isPendingInvite to false
    ...users.map(user => ({ 
      ...user, 
      isPendingInvite: false as const // Use const assertion to ensure it's exactly false
    })), 
    
    // For invited users, ensure they have all required properties
    ...invitedUsers.map(invite => ({
      ...invite,
      name: invite.email, // Use email as name
      joinedDate: invite.createdAt,
      isPendingInvite: true as const, // Use const assertion to ensure it's exactly true
      avatarUrl: null, // Explicitly null for invited users
      isInvite: true as const // Ensure this is true
    }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center">
          <ShieldCheck className="mr-3 h-7 w-7 text-primary" />
          Admin Panel
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCardsConfig.map((card) => (
          <Card key={card.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={cn("h-5 w-5 text-muted-foreground", card.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{summaryData[card.dataKey]}</div>
              <p className="text-xs text-muted-foreground pt-1">
                {card.title === "Total Users" ? "registered accounts" :
                 card.title === "Admin Accounts" ? "with admin privileges" :
                 card.title === "Users without 2FA" ? "potentially less secure accounts" : "information"}
              </p>
            </CardContent>
          </Card>
        ))}
        {/* Add new fourth card for pending invites */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {isLoadingInvites ? <Skeleton className="h-8 w-16" /> : invitedUsers.length}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {invitedUsers.length === 1 ? 'User' : 'Users'} waiting to accept
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              User Management
            </CardTitle>
            <CardDescription>
              View, edit, and manage user accounts and roles.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline">
              <Link href="/admin/users/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New User
              </Link>
            </Button>
            <Dialog 
              open={isInviteUserDialogOpen} 
              onOpenChange={(open) => {
                setIsInviteUserDialogOpen(open);
                if (!open) { // Reset fields when dialog is closed
                  setInviteEmail('');
                  setInviteRole('Viewer');
                }
              }}
            >
              <Button onClick={() => setIsInviteUserDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Invite User
              </Button>
              <DialogContent>
                <DialogHeader>
                  <InviteDialogTitle>Invite New User</InviteDialogTitle>
                  <InviteDialogDescription>
                    Enter the email address and select a role for the new user. They will receive an invite to complete their registration.
                  </InviteDialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as UserRole)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRolesForSelect.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <InviteDialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteUserDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                    {inviteUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Invite...</> : "Send Invite"}
                  </Button>
                </InviteDialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] hidden sm:table-cell">Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="w-[120px]">Role</TableHead>
                <TableHead className="w-[150px] hidden lg:table-cell">Joined Date</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.map((user) => (
                <TableRow key={user.id} className={isInvitedUser(user) ? "bg-muted/50" : ""}>
                  <TableCell className="hidden sm:table-cell">
                    <Avatar className="h-10 w-10">
                      {isInvitedUser(user) ? (
                        <Mail className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <>
                          <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="avatar person" />
                          <AvatarFallback>{getAvatarFallbackInitials(user.name)}</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 sm:hidden">
                        {user.isPendingInvite ? (
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <>
                            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="avatar person" />
                            <AvatarFallback>{getAvatarFallbackInitials(user.name)}</AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {user.isPendingInvite ? (
                            <span className="flex items-center">
                              <span className="truncate">{user.email}</span>
                              <Badge variant="outline" className="ml-2 text-xs">Invited</Badge>
                            </span>
                          ) : (
                            user.name
                          )}
                        </p>
                        {!user.isPendingInvite && (
                          <div className="text-xs text-muted-foreground md:hidden truncate">{user.email}</div>
                        )}
                        {user.isPendingInvite && (
                          <div className="text-xs text-muted-foreground">Expires: {formatDate((user as any).expiresAt)}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {user.isPendingInvite ? (
                      <span className="flex items-center">
                        {user.email}
                        <Badge variant="outline" className="ml-2 text-xs">Pending</Badge>
                      </span>
                    ) : (
                      user.email
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(user.joinedDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isInvitedUser(user) ? (
                          <>
                            <DropdownMenuItem onClick={() => handleResendInvite(user.id)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Invite
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Invite
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete the invitation sent to "{user.email}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteInvite(user.id)}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  >
                                    Delete Invite
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/${user.id}/edit`}>
                                <FilePenLine className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user "{user.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    disabled={deleteUserMutation.isPending && deleteUserMutation.variables === user.id}
                                  >
                                    {deleteUserMutation.isPending && deleteUserMutation.variables === user.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {allUsers.length === 0 && !isLoading && !isLoadingInvites && (
            <div className="mt-4 p-6 border border-dashed rounded-lg text-center text-muted-foreground">
              No users or invites found. Click "Add New User" or "Invite User" to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

