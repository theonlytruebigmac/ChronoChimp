
// For current user's profile and settings
import type { MockUser as UserBase, UserRole } from '@/app/admin/page'; // Reusing admin type for structure
import type { ApiKey } from '@/app/api/me/api_keys/route'; // Import from API route directly

const API_ME_BASE_URL = '/api/me';

// Augment User type to include notification preferences, 2FA, and SMTP settings
export type UserProfile = UserBase & {
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpEncryption?: string | null;
  smtpUsername?: string | null;
  // smtpPassword is not typically sent to client
  smtpSendFrom?: string | null;
};

export type ProfileUpdateData = {
  name?: string;
  email?: string;
  avatarUrl?: string | null; // Allow null to remove avatar
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpEncryption?: string | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  smtpSendFrom?: string | null;
};

export type SmtpTestData = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpEncryption?: string | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  smtpSendFrom?: string | null;
};

export type PasswordUpdateData = {
  currentPassword?: string;
  newPassword?: string;
};

export type ApiKeyCreationData = {
  name: string;
  expiresInDays?: number | null;
};


export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_ME_BASE_URL}/profile`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user profile.' }));
    throw new Error(errorData.error || 'Failed to fetch user profile');
  }
  return response.json();
}

export async function updateUserProfile(profileData: ProfileUpdateData): Promise<UserProfile> {
  const response = await fetch(`${API_ME_BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update user profile.' }));
    throw new Error(errorData.error || 'Failed to update user profile');
  }
  return response.json();
}

export async function updateUserPassword(passwordData: PasswordUpdateData): Promise<{ message: string }> {
  const response = await fetch(`${API_ME_BASE_URL}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(passwordData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update password.' }));
    throw new Error(errorData.error || 'Failed to update password');
  }
  return response.json();
}

// API Keys for current user
export async function fetchUserApiKeys(): Promise<ApiKey[]> {
  const response = await fetch(`${API_ME_BASE_URL}/api_keys`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch API keys.' }));
    throw new Error(errorData.error || 'Failed to fetch API keys');
  }
  return response.json();
}

export async function createUserApiKey(apiKeyData: ApiKeyCreationData): Promise<ApiKey> {
  const response = await fetch(`${API_ME_BASE_URL}/api_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiKeyData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create API key.' }));
    throw new Error(errorData.error || 'Failed to create API key');
  }
  return response.json();
}

export async function revokeUserApiKey(apiKeyId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_ME_BASE_URL}/api_keys/${apiKeyId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to revoke API key.' }));
    throw new Error(errorData.error || 'Failed to revoke API key');
  }
  return response.json();
}

export async function testSmtpConnection(smtpData: SmtpTestData): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_ME_BASE_URL}/smtp/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(smtpData),
  });
  if (!response.ok) {
    // For test connection, a non-200 from API might still be a valid "test failed" response
    const errorData = await response.json().catch(() => ({ message: 'Failed to test SMTP connection and could not parse error.' }));
    if (response.status === 400 && errorData.details) { // Zod validation error
      throw new Error(errorData.message || "Invalid input for SMTP test.");
    }
    // The API for test returns 200 even for "simulated failures" with success:false
    // This part is for actual network or unexpected server errors
    throw new Error(errorData.message || 'Failed to test SMTP connection due to a server error.'); 
  }
  return response.json();
}

