"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

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
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

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
      const requestBody = JSON.stringify({ email, password });      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: requestBody
      });

      const data = await response.json();

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
        description: data.message || "Welcome back!",
      });
      window.location.href = returnUrl; // Redirect to the return URL after 2FA
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

  const handleRecoverySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userIdForOtp || !recoveryCode) {
      toast({ 
        title: "Invalid Recovery Code", 
        description: "Please enter a valid backup code.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsRecovering(true);

    try {
      const response = await fetch('/api/auth/2fa-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdForOtp, backupCode: recoveryCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Recovery failed.');
      }

      toast({
        title: "Recovery Successful!",
        description: data.message || "Welcome back!",
      });
      
      // Close the recovery dialog and redirect
      setShowRecoveryDialog(false);
      window.location.href = returnUrl;
    } catch (error: any) {
      toast({
        title: "Recovery Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
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
        
        <div className="flex flex-col space-y-2">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full" 
            onClick={() => {
              setShowOtpForm(false); 
              setUserIdForOtp(null); 
              setOtp('');
            }}
            disabled={isLoading}
          >
            Back to Login
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            onClick={() => setShowRecoveryDialog(true)}
            disabled={isLoading}
          >
            <KeyRound className="mr-2 h-4 w-4" /> Use Recovery Code
          </Button>
        </div>
        
        {/* Recovery Dialog */}
        <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Use Recovery Code</DialogTitle>
              <DialogDescription>
                If you can't access your authenticator app, enter one of your backup codes.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRecoverySubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="recoveryCode">Backup Code</Label>
                <Input
                  id="recoveryCode"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.trim())}
                  placeholder="Enter your backup code"
                  className="text-base tracking-wider"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Each backup code can only be used once. You should have received these when you set up 2FA.
                </p>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRecoveryDialog(false)}
                  disabled={isRecovering}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isRecovering || !recoveryCode}
                >
                  {isRecovering ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Recover Account"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
      <Button 
        type="button" 
        variant="outline" 
        className="w-full mt-2" 
        onClick={() => setShowRecoveryDialog(true)}
        disabled={isLoading}
      >
        <KeyRound className="mr-2 h-4 w-4" /> Use Recovery Code
      </Button>

      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recovery Code Login</DialogTitle>
            <DialogDescription>
              Enter your recovery code to log in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recoveryCode">Recovery Code</Label>
              <Input
                id="recoveryCode"
                type="text"
                placeholder="Enter your recovery code"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                required
                className="text-base"
                disabled={isRecovering}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isRecovering}>
              {isRecovering ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recovering...</> : <><KeyRound className="mr-2 h-4 w-4" /> Recover Account</>}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}
