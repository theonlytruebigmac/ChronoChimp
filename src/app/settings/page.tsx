"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Shield, Globe, Mail, User, KeyRound, Upload, Palette, Settings2Icon, Server, Send, PlusCircle, Trash2, Copy, RefreshCw, AlertTriangle, QrCode, CheckCircle, Loader2, CalendarDays } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle as TwoFaDialogTitle, DialogDescription as TwoFaDialogDescription, DialogFooter as TwoFaDialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isValid } from "date-fns";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, updateUserProfile, updateUserPassword, fetchUserApiKeys, createUserApiKey, revokeUserApiKey, testSmtpConnection, type ProfileUpdateData, type PasswordUpdateData, type UserProfile, type SmtpTestData, type ApiKeyCreationData } from '@/lib/api/profile';
import type { ApiKey } from '@/app/api/me/api_keys/route';
import { Skeleton } from '@/components/ui/skeleton';
import QRCode from 'qrcode';


export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialProfileState: Partial<UserProfile> = { 
    name: '', 
    email: '', 
    avatarUrl: '',
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    isTwoFactorEnabled: false,
    smtpHost: '',
    smtpPort: undefined, 
    smtpEncryption: 'starttls', 
    smtpUsername: '',
    // smtpPassword: '', // Not pre-filled
    smtpSendFrom: '',
  };
  const [profileData, setProfileData] = useState<Partial<UserProfile>>(initialProfileState);
  const [passwordData, setPasswordData] = useState<PasswordUpdateData>({ currentPassword: '', newPassword: '' });
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyExpiresInDays, setNewApiKeyExpiresInDays] = useState<string>('');
  const [generatedApiKey, setGeneratedApiKey] = useState<ApiKey | null>(null);
  const [isGenerateKeyDialogOpen, setIsGenerateKeyDialogOpen] = useState(false);

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(''); 
  const [smtpEncryption, setSmtpEncryption] = useState('starttls');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSendFrom, setSmtpSendFrom] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  const [is2FASetupDialogOpen, setIs2FASetupDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [twoFactorSecretForDialog, setTwoFactorSecretForDialog] = useState(''); 
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: userProfile, isLoading: isLoadingProfile, isError: isProfileError, error: profileError, refetch: refetchProfile } = useQuery<UserProfile, Error>({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    enabled: mounted,
  });

  // Add this effect to handle the success logic that was previously in onSuccess
  useEffect(() => {
    if (userProfile) {
      setProfileData({ 
        name: userProfile.name, 
        email: userProfile.email, 
        avatarUrl: userProfile.avatarUrl || '',
        emailNotificationsEnabled: userProfile.emailNotificationsEnabled !== undefined ? userProfile.emailNotificationsEnabled : true,
        inAppNotificationsEnabled: userProfile.inAppNotificationsEnabled !== undefined ? userProfile.inAppNotificationsEnabled : true,
        isTwoFactorEnabled: userProfile.isTwoFactorEnabled !== undefined ? userProfile.isTwoFactorEnabled : false,
      });
      setProfilePreview(userProfile.avatarUrl || "https://placehold.co/100x100.png");
      setSmtpHost(userProfile.smtpHost || '');
      setSmtpPort(userProfile.smtpPort ? String(userProfile.smtpPort) : '');
      setSmtpEncryption(userProfile.smtpEncryption || 'starttls');
      setSmtpUsername(userProfile.smtpUsername || '');
      setSmtpSendFrom(userProfile.smtpSendFrom || '');
    }
  }, [userProfile]);

  const { data: apiKeys = [], isLoading: isLoadingApiKeys, isError: isApiKeysError, error: apiKeysError, refetch: refetchApiKeys } = useQuery<ApiKey[], Error>({
    queryKey: ['userApiKeys'],
    queryFn: fetchUserApiKeys,
    enabled: mounted,
  });

  const profileUpdateMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) => updateUserProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['userProfile'], updatedProfile); 
      queryClient.invalidateQueries({ queryKey: ['userProfile']}); 
      if (updatedProfile) {
         setProfileData(prev => ({ 
            ...prev,
            name: updatedProfile.name, 
            email: updatedProfile.email, 
            avatarUrl: updatedProfile.avatarUrl,
            emailNotificationsEnabled: updatedProfile.emailNotificationsEnabled,
            inAppNotificationsEnabled: updatedProfile.inAppNotificationsEnabled,
            isTwoFactorEnabled: updatedProfile.isTwoFactorEnabled,
        }));
        if(updatedProfile.avatarUrl) setProfilePreview(updatedProfile.avatarUrl);
        // Update SMTP state if they were part of this update
        if (updatedProfile.smtpHost !== undefined) setSmtpHost(updatedProfile.smtpHost || '');
        if (updatedProfile.smtpPort !== undefined) setSmtpPort(updatedProfile.smtpPort ? String(updatedProfile.smtpPort) : '');
        if (updatedProfile.smtpEncryption !== undefined) setSmtpEncryption(updatedProfile.smtpEncryption || 'starttls');
        if (updatedProfile.smtpUsername !== undefined) setSmtpUsername(updatedProfile.smtpUsername || '');
        if (updatedProfile.smtpSendFrom !== undefined) setSmtpSendFrom(updatedProfile.smtpSendFrom || '');
      }
      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      toast({ 
        title: "Error Updating Profile", 
        description: error.message || "An unexpected error occurred",
        variant: "destructive" 
      });
    },
    onSettled: () => {
        setIsSavingSmtp(false); 
    }
  });

  const passwordUpdateMutation = useMutation({
    mutationFn: (data: PasswordUpdateData) => updateUserPassword(data),
    onSuccess: (response) => {
      toast({ title: "Password Updated", description: response.message });
      setPasswordData({ currentPassword: '', newPassword: '' });
      setConfirmNewPassword('');
    },
    onError: (error: Error) => {
      toast({ title: "Error Updating Password", description: error.message, variant: "destructive" });
    }
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (data: ApiKeyCreationData) => createUserApiKey(data),
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ['userApiKeys'] });
      setGeneratedApiKey(newKey); 
      setIsGenerateKeyDialogOpen(false);
      setNewApiKeyName('');
      setNewApiKeyExpiresInDays('');
      toast({ title: "API Key Generated!", description: "Your new API key has been generated. Make sure to copy it now." });
    },
    onError: (error: Error) => {
      toast({ title: "Error Generating API Key", description: error.message, variant: "destructive" });
    }
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: (apiKeyId: string) => revokeUserApiKey(apiKeyId),
    onSuccess: (data, apiKeyId) => {
      queryClient.invalidateQueries({ queryKey: ['userApiKeys'] });
      toast({ title: "API Key Revoked", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Error Revoking API Key", description: error.message, variant: "destructive" });
    }
  });

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setProfilePreview(dataUri);
        setProfileData(prev => ({...prev, avatarUrl: dataUri}));
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFileName(null);
    }
  };

  const handleSaveChanges = () => {
    if (!profileData.name || !profileData.email) {
        toast({title: "Missing Fields", description: "Name and Email are required for profile.", variant: "destructive"});
        return;
    }
    
    // Create a simpler data structure - the backend and API pre-processing 
    // will handle validation and conversion of empty values
    const dataToUpdate: ProfileUpdateData = {
        name: profileData.name,
        email: profileData.email,
        avatarUrl: profileData.avatarUrl,
        emailNotificationsEnabled: profileData.emailNotificationsEnabled,
        inAppNotificationsEnabled: profileData.inAppNotificationsEnabled,
        isTwoFactorEnabled: profileData.isTwoFactorEnabled,
        smtpHost: smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
        smtpEncryption: smtpEncryption,
        smtpUsername: smtpUsername,
        smtpPassword: smtpPassword,
        smtpSendFrom: smtpSendFrom
    };
    
    console.log('Saving profile data:', dataToUpdate);
    profileUpdateMutation.mutate(dataToUpdate);
  };

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !confirmNewPassword) {
      toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
     if (passwordData.newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters long.", variant: "destructive" });
      return;
    }
    passwordUpdateMutation.mutate(passwordData);
  };

  const handleGenerateNewApiKey = () => {
    if (!newApiKeyName.trim()) {
      toast({ title: "API Key Name Required", description: "Please provide a name for your API key.", variant: "destructive" });
      return;
    }
    const expiresIn = newApiKeyExpiresInDays ? parseInt(newApiKeyExpiresInDays, 10) : null;
    if (newApiKeyExpiresInDays && (isNaN(expiresIn as number) || (expiresIn as number) <= 0)) {
      toast({ title: "Invalid Expiration", description: "Expiration must be a positive number of days.", variant: "destructive" });
      return;
    }
    createApiKeyMutation.mutate({ name: newApiKeyName, expiresInDays: expiresIn });
  };

  const handleRevokeApiKey = (keyId: string) => {
    revokeApiKeyMutation.mutate(keyId);
  };
  
  const copyToClipboard = (text: string | undefined) => {
    if (!text) {
      toast({ title: "Error", description: "No API Key to copy.", variant: "destructive" });
      return;
    }

    console.log(`Attempting to copy text (length: ${text.length})`);

    // Try three different clipboard approaches in sequence
    tryClipboardAPI(text)
      .catch(() => tryExecCommand(text))
      .catch(() => tryRangeSelection(text))
      .catch((error) => {
        console.error("All clipboard methods failed:", error);
        showManualCopyInstructions();
      });
  };

  const tryClipboardAPI = async (text: string): Promise<void> => {
    if (!navigator.clipboard) {
      throw new Error("Clipboard API not available");
    }
    
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: "API Key copied to clipboard." });
    } catch (err) {
      console.error("Clipboard API failed:", err);
      throw err; // Let the next method try
    }
  };

  const tryExecCommand = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Make it minimally visible to help with mobile devices
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast({ title: "Copied!", description: "API Key copied using fallback method." });
          resolve();
        } else {
          reject(new Error("execCommand failed"));
        }
      } catch (err) {
        console.error("execCommand clipboard method failed:", err);
        reject(err);
      }
    });
  };

  const tryRangeSelection = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const range = document.createRange();
        const selection = window.getSelection();
        
        // Create a temporary span with the text
        const span = document.createElement('span');
        span.textContent = text;
        span.style.position = 'fixed';
        span.style.top = '0';
        span.style.clip = 'rect(0, 0, 0, 0)';
        span.style.whiteSpace = 'pre'; // Preserve whitespace
        
        document.body.appendChild(span);
        
        range.selectNodeContents(span);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        const successful = document.execCommand('copy');
        document.body.removeChild(span);
        
        if (successful) {
          toast({ title: "Copied!", description: "API Key copied using range selection." });
          resolve();
        } else {
          reject(new Error("Range selection copy failed"));
        }
      } catch (err) {
        console.error("Range selection clipboard method failed:", err);
        reject(err);
      }
    });
  };

  const showManualCopyInstructions = () => {
    toast({
      title: "Automatic Copy Failed",
      description: "Please click the API key field to select it, then use your device's copy function.",
      variant: "destructive",
      duration: 5000
    });
  };

  const handleSaveSmtpSettings = () => {
    setIsSavingSmtp(true);
    
    // Create a simpler data structure - the backend and API pre-processing 
    // will handle validation and conversion of empty values
    const smtpDataToSave: ProfileUpdateData = {
      smtpHost: smtpHost,
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
      smtpEncryption: smtpEncryption,
      smtpUsername: smtpUsername,
      smtpPassword: smtpPassword,
      smtpSendFrom: smtpSendFrom
    };
    
    // Log the data being sent to help troubleshoot
    console.log('Saving SMTP settings:', smtpDataToSave);
    
    profileUpdateMutation.mutate(smtpDataToSave);
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    const portNumber = parseInt(smtpPort, 10);
    if (smtpPort && (isNaN(portNumber) || portNumber <= 0)) {
      toast({ title: "Invalid SMTP Port", description: "Port must be a positive number.", variant: "destructive"});
      setIsTestingSmtp(false);
      return;
    }
    if (!smtpHost || !smtpSendFrom) {
      toast({ title: "Missing Fields", description: "SMTP Host and Send From Email are required for testing.", variant: "destructive"});
      setIsTestingSmtp(false);
      return;
    }

    const smtpDataForTest: SmtpTestData = {
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? portNumber : null,
        smtpEncryption: smtpEncryption || null,
        smtpUsername: smtpUsername || null,
        smtpPassword: smtpPassword || null,
        smtpSendFrom: smtpSendFrom || null,
    };

    try {
      const result = await testSmtpConnection(smtpDataForTest);
      if (result.success) {
        toast({ title: "SMTP Test Successful", description: `${result.message} (Host: ${smtpHost}, Port: ${smtpPort}, From: ${smtpSendFrom})` });
      } else {
        toast({ title: "SMTP Test Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error Testing SMTP", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleNotificationToggle = (type: 'emailNotificationsEnabled' | 'inAppNotificationsEnabled', enabled: boolean) => {
    setProfileData(prev => ({...prev, [type]: enabled }));
    const readableType = type === 'emailNotificationsEnabled' ? 'Email notifications' : 'In-app notifications';
    toast({
      title: `${readableType} preference updated`,
      description: `This change will be saved when you click "Save Profile".`,
      duration: 3000,
    });
  };

  const initiate2FASetup = async () => {
    try {
      const response = await fetch('/api/me/2fa/setup-initiate', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate 2FA setup.');
      }
      const { secret, otpAuthUrl } = await response.json();
      setTwoFactorSecretForDialog(secret);

      // Use the correct options type for QRCode.toDataURL
      // and properly await the promise
      const qrDataUrl = await QRCode.toDataURL(otpAuthUrl);
      setQrCodeDataUrl(qrDataUrl);
      
      setIs2FASetupDialogOpen(true);
    } catch (err: any) {
      console.error("Failed to initiate 2FA setup:", err);
      toast({ title: "Error", description: err.message || "Could not initiate 2FA setup.", variant: "destructive"});
      setProfileData(prev => ({ ...prev, isTwoFactorEnabled: false })); 
    }
  };

  const handleVerifyAndEnable2FA = async () => {
    setIsVerifyingOtp(true);
    try {
      const response = await fetch('/api/me/2fa/setup-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode, secret: twoFactorSecretForDialog }), 
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed.');
      }
      
      await queryClient.invalidateQueries({queryKey: ['userProfile']});
      await queryClient.refetchQueries({queryKey: ['userProfile']}); // Refetch to get updated 2FA status from DB

      toast({ title: "2FA Enabled", description: data.message || "Two-Factor Authentication has been successfully enabled." });
      setIs2FASetupDialogOpen(false);
      setOtpCode('');
      setTwoFactorSecretForDialog('');
      // ProfileData will be updated by onSuccess of fetchUserProfile via refetch
    } catch (err: any) {
      toast({ title: "Invalid OTP", description: err.message || "Please enter a valid 6-digit OTP.", variant: "destructive" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleDisable2FA = () => {
    // Staging the disable locally, actual disable happens on "Save Profile"
    setProfileData(prev => ({ ...prev, isTwoFactorEnabled: false }));
    toast({
      title: "2FA Staged for Disabling",
      description: 'Click "Save Profile" at the top to persist this change and clear your 2FA secret.',
    });
  };

  const handle2FAToggle = (enabled: boolean) => {
    if (enabled) {
      initiate2FASetup();
    } else {
       handleDisable2FA(); 
    }
  };

  const formatDateSafe = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    if (!mounted) return '...'; // Prevent server/client mismatch for dates
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        if (dateString.includes('T')) return format(date, 'MMM d, yyyy HH:mm');
        return format(date, 'MMM d, yyyy');
      }
    } catch (e) { /* ignore */ }
    return dateString;
  };


  if (!mounted || isLoadingProfile || isLoadingApiKeys) { 
    return (
        <div className="space-y-8 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-36 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" /> 
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-7 w-1/2 mb-1 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-0 pt-0">
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="profile-info-skeleton">
                    <AccordionTrigger className="text-lg font-medium hover:no-underline">
                      <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-5 w-40" /></div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <Skeleton className="h-24 w-24 rounded-full mb-4" />
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="security-skeleton">
                    <AccordionTrigger className="text-lg font-medium hover:no-underline">
                      <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-5 w-24" /></div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                       <div className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-1">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                          <Skeleton className="h-6 w-11 rounded-full" /> 
                        </div>
                      <Skeleton className="h-40 w-full" />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="api-keys-skeleton">
                    <AccordionTrigger className="text-lg font-medium hover:no-underline">
                      <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-5 w-28" /></div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="theme-skeleton">
                    <AccordionTrigger className="text-lg font-medium hover:no-underline">
                      <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-5 w-20" /></div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <Skeleton className="h-10 w-full sm:w-[280px]" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-7 w-1/2 mb-1 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-0 pt-0">
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="notifications-skeleton">
                    <AccordionTrigger className="text-lg font-medium hover:no-underline">
                      <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-5 w-32" /></div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="smtp-skeleton">
                    <AccordionTrigger className="text-lg font-medium hover:no-underline">
                      <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-5 w-36" /></div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
        </div>
    );
  }

  if (isProfileError) {
    return (
      <div className="space-y-6 text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Failed to load profile settings</h2>
        <p className="text-muted-foreground">{profileError?.message || "An unexpected error occurred."}</p>
        <Button onClick={() => refetchProfile()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button onClick={handleSaveChanges} disabled={profileUpdateMutation.isPending}>
          {profileUpdateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Profile...</> : "Save Profile"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Profile & Security
          </CardTitle>
          <CardDescription>Manage your profile information, security settings, API keys, and interface theme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 pt-0"> 
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="profile-info">
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Profile Information</div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profilePreview || undefined} alt="Profile Preview" data-ai-hint="avatar person"/>
                    <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                  </Avatar>
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="profilePictureButton">Update Profile Picture</Label>
                    <Input
                      id="profilePicture"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        id="profilePictureButton"
                        aria-label="Choose profile picture"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Image
                      </Button>
                      <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                        {selectedFileName || "No file chosen"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Recommended: Square image, JPG or PNG.</p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="Your Name" value={profileData.name || ''} onChange={(e) => setProfileData(p => ({...p, name: e.target.value}))} />
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={profileData.email || ''} onChange={(e) => setProfileData(p => ({...p, email: e.target.value}))} />
                  <p className="text-xs text-muted-foreground">Update your email address here.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security">
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />Security</div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="2fa" className="font-medium">Two-Factor Authentication (2FA)</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account.
                    </p>
                  </div>
                  <Switch 
                    id="2fa" 
                    aria-label="Toggle Two-Factor Authentication"
                    checked={profileData.isTwoFactorEnabled || false}
                    onCheckedChange={handle2FAToggle}
                    disabled={profileUpdateMutation.isPending || isVerifyingOtp}
                  />
                </div>
                
                <div className="space-y-4 rounded-lg border p-4 mt-4">
                  <h3 className="font-medium flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground"/> Change Password</h3>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      placeholder="Enter current password" 
                      value={passwordData.currentPassword || ''}
                      onChange={(e) => setPasswordData(p => ({...p, currentPassword: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Enter new password (min. 6 chars)" 
                      value={passwordData.newPassword || ''}
                      onChange={(e) => setPasswordData(p => ({...p, newPassword: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmNewPassword" 
                      type="password" 
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleChangePassword} variant="outline" disabled={passwordUpdateMutation.isPending}>
                    {passwordUpdateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating Password...</> : "Change Password"}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="api-keys">
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" />API Keys</div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Manage API keys for external integrations.</p>
                  <AlertDialog 
                    open={isGenerateKeyDialogOpen} 
                    onOpenChange={(open: boolean) => {
                      setIsGenerateKeyDialogOpen(open);
                      if (!open) {
                        setNewApiKeyName(''); 
                        setNewApiKeyExpiresInDays('');
                      }
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" onClick={() => { setNewApiKeyName(''); setNewApiKeyExpiresInDays(''); setGeneratedApiKey(null); setIsGenerateKeyDialogOpen(true); }} disabled={createApiKeyMutation.isPending}>
                         {createApiKeyMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><PlusCircle className="mr-2 h-4 w-4" /> Generate New API Key</>}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Generate New API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Enter a descriptive name and optional expiration for your new API key.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="apiKeyName">Key Name <span className="text-destructive">*</span></Label>
                        <Input 
                          id="apiKeyName" 
                          value={newApiKeyName} 
                          onChange={(e) => setNewApiKeyName(e.target.value)} 
                          placeholder="e.g., My Production App" 
                          required
                        />
                      </div>
                       <div className="space-y-2">
                        <Label htmlFor="apiKeyExpiresInDays">Expiration (in days, optional)</Label>
                        <Input 
                          id="apiKeyExpiresInDays"
                          type="number"
                          value={newApiKeyExpiresInDays} 
                          onChange={(e) => setNewApiKeyExpiresInDays(e.target.value)} 
                          placeholder="e.g., 30 or 365" 
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGenerateNewApiKey} disabled={!newApiKeyName.trim() || createApiKeyMutation.isPending}>
                          {createApiKeyMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : "Generate Key"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {generatedApiKey && (
                  <AlertDialog defaultOpen onOpenChange={() => setGeneratedApiKey(null)}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>New API Key Generated!</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please copy your new API key. You won't be able to see it again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4 mt-2 p-3 bg-muted rounded-md border">
                        <p className="text-sm font-semibold">Name: {generatedApiKey.name}</p>
                        
                        {/* Key display and copy section */}
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <textarea
                                readOnly
                                value={generatedApiKey.fullKey || "Error: Key not available"}
                                className="w-full min-h-[80px] p-2 font-mono text-sm border rounded resize-none"
                                onClick={(e) => {
                                  e.currentTarget.select();
                                  // Also try to copy on click as another fallback
                                  try { 
                                    document.execCommand('copy');
                                    toast({ title: "Copied!", description: "API Key copied to clipboard." });
                                  } catch (err) {
                                    // Silent failure - let the user manually copy
                                  }
                                }}
                              />
                              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-muted px-1 rounded-sm">
                                Click to select all
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="self-start" 
                              onClick={() => copyToClipboard(generatedApiKey.fullKey)}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Copy API Key</span>
                            </Button>
                          </div>
                          
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <p className="font-medium mb-1">If copy button doesn't work:</p>
                            <ol className="list-decimal list-inside space-y-1">
                              <li>Click the text area above to select all text</li>
                              <li>Use keyboard shortcut: {navigator.platform.includes('Mac') ? '⌘+C' : 'Ctrl+C'}</li>
                              <li>Or right-click and select "Copy"</li>
                            </ol>
                          </div>
                        </div>
                        
                        {generatedApiKey.expiresAt && (
                            <p className="text-xs text-muted-foreground">Expires: {formatDateSafe(generatedApiKey.expiresAt)}</p>
                        )}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setGeneratedApiKey(null)}>Done</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {isLoadingApiKeys && <Skeleton className="h-20 w-full" />}
                {isApiKeysError && !isLoadingApiKeys && (
                    <div className="text-destructive text-center py-4 border border-dashed border-destructive/50 rounded-md">
                        <p>Error loading API keys: {apiKeysError?.message}</p>
                        <Button variant="link" onClick={() => refetchApiKeys()} className="text-destructive">Retry</Button>
                    </div>
                )}
                {!isLoadingApiKeys && !isApiKeysError && apiKeys.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key Preview</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell className="font-mono">{key.keyPrefix}...{key.last4}</TableCell>
                          <TableCell>{formatDateSafe(key.createdAt)}</TableCell>
                          <TableCell>{key.expiresAt ? formatDateSafe(key.expiresAt) : 'Never'}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={revokeApiKeyMutation.isPending && revokeApiKeyMutation.variables === key.id}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Revoke API Key</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently revoke the API key "{key.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRevokeApiKey(key.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={revokeApiKeyMutation.isPending && revokeApiKeyMutation.variables === key.id}>
                                    {revokeApiKeyMutation.isPending && revokeApiKeyMutation.variables === key.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Revoking...</> : "Revoke Key"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  !isLoadingApiKeys && !isApiKeysError && (
                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                        No API keys generated yet.
                    </p>
                  )
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="theme">
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                 <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-muted-foreground" />Theme</div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                {mounted ? (
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="theme" className="w-full sm:w-[280px]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Skeleton className="h-10 w-full sm:w-[280px] rounded-md" />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2Icon className="h-5 w-5 text-muted-foreground" />
            Additional Settings
          </CardTitle>
          <CardDescription>Manage notification preferences and SMTP configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 pt-0">
           <Accordion type="multiple" className="w-full">
            <AccordionItem value="notifications">
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" />Notifications</div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="emailNotifications" className="font-medium">Email Notifications for Task Updates</Label>
                    <p className="text-sm text-muted-foreground">Enable to receive email updates for task activities.</p>
                  </div>
                  <Switch 
                    id="emailNotifications" 
                    checked={profileData.emailNotificationsEnabled || false}
                    onCheckedChange={(checked: boolean) => handleNotificationToggle('emailNotificationsEnabled', checked)}
                    aria-label="Toggle email notifications"
                    disabled={profileUpdateMutation.isPending}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
                 <div>
                    <Label htmlFor="inAppNotifications" className="font-medium">In-App Notifications for Due Dates</Label>
                    <p className="text-sm text-muted-foreground">Enable to receive in-app reminders for task due dates.</p>
                  </div>
                  <Switch 
                    id="inAppNotifications" 
                    checked={profileData.inAppNotificationsEnabled || false}
                    onCheckedChange={(checked: boolean) => handleNotificationToggle('inAppNotificationsEnabled', checked)}
                    aria-label="Toggle in-app push notifications"
                    disabled={profileUpdateMutation.isPending}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="smtp-settings">
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />SMTP Settings</div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Configure your custom SMTP server for sending email notifications.</p>
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input 
                    id="smtpHost" 
                    placeholder="e.g., smtp.example.com" 
                    value={smtpHost} 
                    onChange={(e) => setSmtpHost(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input 
                      id="smtpPort" 
                      type="number" 
                      placeholder="e.g., 587" 
                      value={smtpPort} 
                      onChange={(e) => setSmtpPort(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpEncryption">Encryption</Label>
                    <Select value={smtpEncryption} onValueChange={setSmtpEncryption}>
                      <SelectTrigger id="smtpEncryption">
                        <SelectValue placeholder="Select encryption" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ssl">SSL/TLS</SelectItem>
                        <SelectItem value="starttls">STARTTLS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username</Label>
                  <Input 
                    id="smtpUsername" 
                    placeholder="Your SMTP username" 
                    value={smtpUsername} 
                    onChange={(e) => setSmtpUsername(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input 
                    id="smtpPassword" 
                    type="password" 
                    placeholder="Your SMTP password" 
                    value={smtpPassword} 
                    onChange={(e) => setSmtpPassword(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpSendFrom">Send From Email Address</Label>
                  <Input 
                    id="smtpSendFrom" 
                    type="email"
                    placeholder="e.g., no-reply@example.com" 
                    value={smtpSendFrom} 
                    onChange={(e) => setSmtpSendFrom(e.target.value)} 
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button onClick={handleSaveSmtpSettings} variant="outline" className="w-full sm:w-auto" disabled={isSavingSmtp || profileUpdateMutation.isPending}>
                     {isSavingSmtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving SMTP...</> : <><Server className="mr-2 h-4 w-4" /> Save SMTP Settings</>}
                  </Button>
                  <Button onClick={handleTestSmtp} variant="default" className="w-full sm:w-auto" disabled={isTestingSmtp}>
                    {isTestingSmtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</> : <><Send className="mr-2 h-4 w-4" /> Test SMTP</>}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      
      <Dialog open={is2FASetupDialogOpen} onOpenChange={(open: boolean) => {
          if (!open) {
            setIs2FASetupDialogOpen(false);
            setOtpCode(''); 
            setTwoFactorSecretForDialog(''); 
            // If user cancels 2FA setup dialog, revert the local isTwoFactorEnabled state
            // if it was optimistically set, by refetching profile.
            const currentProfile2FAState = queryClient.getQueryData<UserProfile>(['userProfile'])?.isTwoFactorEnabled;
            if (profileData.isTwoFactorEnabled !== currentProfile2FAState) {
                 refetchProfile(); 
            }
          }
        }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <TwoFaDialogTitle className="flex items-center"><QrCode className="mr-2 h-5 w-5"/>Setup Two-Factor Authentication</TwoFaDialogTitle>
            <TwoFaDialogDescription>
              Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).
              Then, enter the 6-digit code from your app to verify.
            </TwoFaDialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {qrCodeDataUrl ? (
              <div className="flex flex-col items-center gap-4">
                <img src={qrCodeDataUrl} alt="2FA QR Code" data-ai-hint="qr code" className="border rounded-lg p-1 bg-white" />
                <div className="text-center">
                  <Label htmlFor="twoFactorSecretForDialog">Or, enter this key manually:</Label>
                  <Input
                    id="twoFactorSecretForDialog"
                    type="text"
                    readOnly
                    value={twoFactorSecretForDialog}
                    className="font-mono text-sm mt-1 text-center tracking-wider"
                  />
                </div>
              </div>
            ) : (
              <Skeleton className="w-48 h-48 mx-auto" />
            )}
            <div className="space-y-2">
              <Label htmlFor="otpCode">Verification Code</Label>
              <Input
                id="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>
          </div>
          <TwoFaDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIs2FASetupDialogOpen(false); 
                setOtpCode('');
                setTwoFactorSecretForDialog('');
                // Re-fetch profile to ensure UI reflects the true DB state for isTwoFactorEnabled
                // if user cancels setup after toggling the switch.
                const currentProfile2FAState = queryClient.getQueryData<UserProfile>(['userProfile'])?.isTwoFactorEnabled;
                 if (profileData.isTwoFactorEnabled !== currentProfile2FAState || !currentProfile2FAState) { 
                    refetchProfile(); 
                }
              }}>
              Cancel
            </Button>
            <Button onClick={handleVerifyAndEnable2FA} disabled={isVerifyingOtp || otpCode.length !== 6 || profileUpdateMutation.isPending}>
              {isVerifyingOtp && <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>}
              {profileUpdateMutation.isPending && !isVerifyingOtp && <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving Profile...</>}
              {!isVerifyingOtp && !profileUpdateMutation.isPending && <><CheckCircle className="mr-2 h-4 w-4" />Verify & Enable</>}
            </Button>
          </TwoFaDialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
