"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { UserCheck } from 'lucide-react';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      // Verify token and fetch invite details
      verifyInviteToken(tokenParam);
    } else {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Invalid invitation link. Please request a new invitation.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const verifyInviteToken = async (inviteToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-invite?token=${encodeURIComponent(inviteToken)}`);
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setEmail(data.email);
        setRole(data.role);
        setIsValid(true);
      } else {
        toast({
          title: "Invalid Invitation",
          description: data.error || "This invitation is invalid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submission started");
    
    if (!token) {
      toast({ title: "Error", description: "Invalid invitation token", variant: "destructive" });
      return;
    }
    
    if (!name.trim()) {
      toast({ title: "Error", description: "Please enter your name", variant: "destructive" });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    console.log("Submitting to /api/auth/accept-invite with token:", token.substring(0, 8) + "...");
    
    try {
      // Make sure correct API endpoint is called
      const response = await fetch('/api/auth/complete-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          name, 
          password,
          email // Include email for additional verification
        }),
      });
      
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      
      if (response.ok) {
        toast({ title: "Success!", description: "Your account has been created. You can now sign in." });
        setTimeout(() => router.push('/auth/signin'), 1500); // Give toast time to display
      } else {
        toast({ 
          title: "Error", 
          description: data.error || "Failed to create account", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred while creating your account", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Verifying invitation...</CardTitle>
          <CardDescription>Please wait while we verify your invitation.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isValid) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
          <CardDescription>This invitation link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link href="/auth/signin">
            <Button variant="outline">Go to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Complete Your Registration</CardTitle>
        <CardDescription>
          You've been invited to join ChronoChimp! Please set up your account.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">Invited as: {role}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="Your Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Choose a password (min. 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Create Account
              </>
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account? <Link href="/auth/signin" className="underline">Sign In</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
