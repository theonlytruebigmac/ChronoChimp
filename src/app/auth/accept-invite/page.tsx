
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, UserPlus } from 'lucide-react';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [inviteDetails, setInviteDetails] = useState<{ email: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // Validate token and fetch invite details
      const fetchInvite = async () => {
        setIsLoadingToken(true);
        setError(null);
        try {
          const response = await fetch(`/api/auth/invites/${tokenFromUrl}`);
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to validate invite token.');
          }
          setInviteDetails(data);
        } catch (err: any) {
          setError(err.message || 'Invalid or expired invite link.');
          setInviteDetails(null);
        } finally {
          setIsLoadingToken(false);
        }
      };
      fetchInvite();
    } else {
      setError('No invite token provided.');
      setIsLoadingToken(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("No invite token available for submission.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/complete-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }
      toast({
        title: 'Registration Successful!',
        description: data.message || 'You can now log in.',
      });
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      toast({ title: "Error", description: err.message || "Registration failed.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingToken) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Validating Invite...</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Please wait while we check your invite link.</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !inviteDetails) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Invite Error
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-destructive">{error || 'This invite link is invalid or has expired.'}</p>
          <p className="mt-4 text-sm">
            <Link href="/auth/login" className="text-primary hover:underline">
              Go to Login
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Complete Your Registration</CardTitle>
        <CardDescription>You've been invited to join ChronoTask! Please set up your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={inviteDetails.email}
              readOnly
              disabled
              className="text-base bg-muted"
            />
            <p className="text-xs text-muted-foreground">Invited as: {inviteDetails.role}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-base"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <Input
              id="password"
              type="password"
              placeholder="Choose a password (min. 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-base"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="text-base"
              disabled={isSubmitting}
            />
          </div>
          
          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>}
          </Button>
        </form>
         <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  // Suspense boundary is necessary because useSearchParams() is a Client Hook
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader><CardTitle className="text-center text-2xl">Loading Invite...</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-center">Please wait...</p></CardContent>
      </Card>
    }>
      <AcceptInviteForm />
    </Suspense>
  );
}
