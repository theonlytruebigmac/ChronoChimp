import type { MockUser as User, UserRole } from '@/app/admin/page';

const API_BASE_URL = '/api/admin/users';

export type UserCreationData = {
  name: string;
  email: string;
  role?: UserRole;
  password?: string; // Password is required for creation
  avatarUrl?: string;
  isTwoFactorEnabled?: boolean;
};

export type UserUpdateData = Partial<Omit<UserCreationData, 'password'>> & { 
  password?: string;
  isTwoFactorEnabled?: boolean; // Already here, ensure it matches
};

// Update the User type to include isPendingInvite as optional
export type UserWithInviteFlag = User & {
  isPendingInvite?: false; // Regular users are not pending invites
};

// Make InvitedUser more precise
export type InvitedUser = {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'expired' | 'accepted';
  createdAt: string;
  expiresAt: string;
  isInvite: true;  // Flag to distinguish from registered users
  // Fields for display compatibility
  name: string;
  joinedDate: string;
  isPendingInvite: true; // Always true for invited users
  avatarUrl: null | undefined; // Never has an avatar
};

// Combined type for admin display
export type AdminDisplayUser = UserWithInviteFlag | InvitedUser;

// Type guard function to check if a user is an invited user
export function isInvitedUser(user: AdminDisplayUser): user is InvitedUser {
  return (user as InvitedUser).isInvite === true;
}

// Function to get all pending invites
export async function fetchPendingInvites(): Promise<InvitedUser[]> {
  const response = await fetch('/api/admin/invites');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch invites' }));
    throw new Error(errorData.error || 'Failed to fetch invites');
  }
  return response.json();
}

export async function fetchAdminUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch users and could not parse error.' }));
    throw new Error(errorData.error || 'Failed to fetch users');
  }
  return response.json();
}

export async function fetchAdminUser(userId: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/${userId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Failed to fetch user ${userId} and could not parse error.` }));
    if (response.status === 404) throw new Error('User not found');
    throw new Error(errorData.error || `Failed to fetch user ${userId}`);
  }
  return response.json();
}

export async function createAdminUser(userData: UserCreationData): Promise<User> {
  const response = await fetch(`${API_BASE_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create user and could not parse error.' }));
    throw new Error(errorData.error || 'Failed to create user');
  }
  return response.json();
}

export async function updateAdminUser(userId: string, userData: UserUpdateData): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Failed to update user ${userId} and could not parse error.` }));
    if (response.status === 404) throw new Error('User not found for update');
    throw new Error(errorData.error || `Failed to update user ${userId}`);
  }
  return response.json();
}

export async function deleteAdminUser(userId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Failed to delete user ${userId} and could not parse error.` }));
    if (response.status === 404) throw new Error('User not found for deletion');
    throw new Error(errorData.error || `Failed to delete user ${userId}`);
  }
  return response.json();
}

export const inviteAdminUser = async (data: { email: string; role: UserRole }): Promise<{ message: string }> => {
  const response = await fetch('/api/admin/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to invite user' }));
    throw new Error(errorData.error || 'Failed to invite user');
  }

  return response.json();
};

// Function to delete an invite
export async function deleteInvite(inviteId: string): Promise<{ message: string }> {
  const response = await fetch(`/api/admin/invites/${inviteId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to delete invite ${inviteId}` }));
    throw new Error(errorData.error || `Failed to delete invite`);
  }
  return response.json();
}

// Function to resend an invite
export async function resendInvite(inviteId: string): Promise<{ message: string }> {
  const response = await fetch(`/api/admin/invites/${inviteId}/resend`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Failed to resend invite` }));
    throw new Error(errorData.error || `Failed to resend invite`);
  }
  return response.json();
}

