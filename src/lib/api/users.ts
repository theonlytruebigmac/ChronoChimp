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

