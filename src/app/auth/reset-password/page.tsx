
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("No reset token found. Please use the link provided in your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess(data.message || "Your password has been successfully reset. You can now log in.");
      toast({
        title: "Password Reset Successful",
        description: data.message || "You can now log in with your new password.",
      });
      // Clear form or redirect
      setPassword('');
      setConfirmPassword('');
      // Optionally redirect after a delay:
      setTimeout(() => router.push('/auth/login'), 3000);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      toast({
        title: "Error Resetting Password",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !token) { // Show error if token was invalid from the start
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Password Reset Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center">{error}</p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/auth/forgot-password" className="font-medium text-primary hover:underline">
              Request a new reset link
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="text-center">
            <p className="text-green-600">{success}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              You will be redirected to login shortly. Or,{' '}
               <Link href="/auth/login" className="font-medium text-primary hover:underline">
                click here to login now
              </Link>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="•••••••• (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base"
                disabled={isLoading || !token}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="text-base"
                disabled={isLoading || !token}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !token}>
              {isLoading ? 'Resetting...' : <><LockKeyhole className="mr-2 h-4 w-4" /> Reset Password</>}
            </Button>
          </form>
        )}
        {!success && (
           <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}


export default function ResetPasswordPage() {
  // Suspense boundary is necessary because useSearchParams() is a Client Hook
  // and the page might be statically rendered otherwise.
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader><CardTitle className="text-center text-2xl">Loading Page...</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-center">Please wait a moment.</p></CardContent>
      </Card>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

