"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, ShieldCheck, Loader2 } from 'lucide-react';

export function LoginForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string>('/dashboard');
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [userIdForOtp, setUserIdForOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  // Get return URL from query parameter
  useEffect(() => {
    const returnUrlParam = searchParams?.get('returnUrl');
    if (returnUrlParam) {
      setReturnUrl(returnUrlParam);
    }
  }, [searchParams]);
  
  const handleSubmitPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Login attempt:', { email }); // Log email for debugging
      
      const requestBody = JSON.stringify({ email, password });
      console.log('Request body:', requestBody); // Log the stringified request
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: requestBody
      });

      console.log('Response status:', response.status); // Log the response status
      console.log('Response headers:', {
        type: response.headers.get('content-type'),
        length: response.headers.get('content-length')
      });

      const data = await response.json();
      console.log('Response data:', { ...data, password: '[REDACTED]' }); // Log response data (excluding password)

      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      if (data.twoFactorRequired && data.userId) {
        setUserIdForOtp(data.userId);
        setShowOtpForm(true);
        toast({
          title: "2FA Required",
          description: "Please enter the 6-digit code from your authenticator app.",
        });
        setIsLoading(false); // Stop loading for password step, OTP step will start
      } else {
        toast({
          title: "Login Successful!",
          description: data.message || "Welcome back!",
        });
        window.location.href = returnUrl; // Redirect to the return URL
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false); 
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userIdForOtp || otp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter a valid 6-digit OTP.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/2fa-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdForOtp, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }

      toast({
        title: "Login Successful!",
        description: "Welcome back!",
      });
      window.location.href = returnUrl; // Redirect to the return URL after 2FA
      return;

      toast({
        title: "Login Successful!",
        description: data.message || "2FA verification successful. Welcome back!",
      });
      window.location.href = '/dashboard'; // Use full redirect
    } catch (error: any) {
      toast({
        title: "OTP Verification Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showOtpForm) {
    return (
      <form onSubmit={handleOtpSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="otp">Two-Factor Authentication Code</Label>
          <Input
            id="otp"
            type="text" 
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} 
            required
            className="text-base tracking-wider text-center"
            disabled={isLoading}
            maxLength={6}
            pattern="\d{6}" 
          />
           <p className="text-xs text-muted-foreground">Enter the code from your authenticator app.</p>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Verify Code</>}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="w-full mt-2" 
          onClick={() => {
            setShowOtpForm(false); 
            setUserIdForOtp(null); 
            setOtp('');
            // Keep isLoading false if we are just switching back
          }}
          disabled={isLoading}
        >
          Back to Login
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmitPassword} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="text-base"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="text-base"
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : <><LogIn className="mr-2 h-4 w-4" /> Sign In</>}
      </Button>
    </form>
  );
}
