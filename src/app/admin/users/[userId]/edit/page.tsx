
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, XCircle, UserCog, RefreshCw, AlertTriangle, UserPlus, ShieldCheck, Upload, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminUser, updateAdminUser, createAdminUser, UserUpdateData, UserCreationData } from '@/lib/api/users';
import type { UserRole, MockUser as User } from '@/app/admin/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const userRoles: UserRole[] = ["Admin", "Editor", "Viewer"];

export default function UserEditPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNewUserMode = userId === 'new';

  const [formData, setFormData] = useState<Partial<User & { password?: string }>>({
    name: '',
    email: '',
    role: 'Viewer', // Default to 'Viewer' initially. useEffect will override for existing users.
    password: '',
    avatarUrl: '',
    isTwoFactorEnabled: false,
  });
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);


  const { data: fetchedUser, isLoading: isLoadingUser, isError: isFetchError, error: fetchErrorDetail, refetch } = useQuery<User, Error>({
    queryKey: ['adminUser', userId],
    queryFn: () => fetchAdminUser(userId),
    enabled: !isNewUserMode && !!userId,
  });

  useEffect(() => {
    if (isNewUserMode) {
      setFormData({ 
        name: '',
        email: '',
        role: 'Viewer',
        password: '',
        avatarUrl: '',
        isTwoFactorEnabled: false,
      });
      setProfilePreview("https://placehold.co/100x100.png");
      setSelectedFileName(null);
    } else if (fetchedUser) {
      setFormData({
        id: fetchedUser.id,
        name: fetchedUser.name,
        email: fetchedUser.email,
        role: fetchedUser.role,
        avatarUrl: fetchedUser.avatarUrl || '',
        isTwoFactorEnabled: !!fetchedUser.isTwoFactorEnabled,
        joinedDate: fetchedUser.joinedDate,
        password: '', 
      });
      setProfilePreview(fetchedUser.avatarUrl || "https://placehold.co/100x100.png");
      setSelectedFileName(null);
    }
  }, [fetchedUser, isNewUserMode]);

  const updateUserMutation = useMutation({
    mutationFn: (userData: UserUpdateData) => updateAdminUser(userId, userData),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.setQueryData(['adminUser', userId], updatedUser);
      toast({
        title: "User Updated",
        description: `User "${updatedUser.name}" has been successfully updated.`,
      });
      router.push('/admin');
    },
    onError: (err: Error) => {
      if (err.message && (err.message.includes("Email address already in use") || err.message.includes("users.email"))) {
        toast({
          title: "Error Updating User",
          description: "This email address is already in use by another account. Please choose a different email.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Updating User",
          description: err.message || "Could not save user. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: UserCreationData) => createAdminUser(userData),
    onSuccess: (newUser: User) => {
        queryClient.invalidateQueries({queryKey: ['adminUsers']});
        toast({
            title: "User Created",
            description: `User "${newUser.name}" has been successfully created.`,
        });
        router.push('/admin');
    },
    onError: (err: Error) => {
      if (err.message && (err.message.includes("Email address already in use") || err.message.includes("users.email"))) {
         toast({
            title: "Error Creating User",
            description: "This email address is already in use. Please choose a different email.",
            variant: "destructive",
        });
      } else {
        toast({
            title: "Error Creating User",
            description: err.message || "Could not create user. Please try again.",
            variant: "destructive",
        });
      }
    }
  });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean, name: keyof Pick<User, 'isTwoFactorEnabled'>) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as UserRole }));
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setProfilePreview(dataUri);
        setFormData(prev => ({...prev, avatarUrl: dataUri}));
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFileName(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.email) {
        toast({title: "Missing Fields", description: "Name and Email are required.", variant: "destructive"});
        return;
    }
    if (isNewUserMode && (!formData.password || formData.password.trim() === '')) {
        toast({title: "Missing Password", description: "Password is required for new users.", variant: "destructive"});
        return;
    }

    const submissionData: UserCreationData = {
        name: formData.name,
        email: formData.email,
        role: formData.role || 'Viewer',
        avatarUrl: formData.avatarUrl || undefined,
        isTwoFactorEnabled: formData.isTwoFactorEnabled || false,
    };

    if (formData.password && formData.password.trim() !== '') {
        submissionData.password = formData.password;
    }

    if (isNewUserMode) {
        if (!submissionData.password) {
             toast({title: "Missing Password", description: "Password is required for new users.", variant: "destructive"});
             return;
        }
        createUserMutation.mutate(submissionData);
    } else {
        const updatePayload: UserUpdateData = { ...submissionData };
        if (!submissionData.password) {
            delete updatePayload.password;
        }
        updateUserMutation.mutate(updatePayload);
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };


  if (isLoadingUser && !isNewUserMode) {
    return (
        <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-48 rounded-md" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-36 rounded-md" />
                </div>
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2 rounded-md" />
                    <Skeleton className="h-5 w-1/2 rounded-md" />
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <Skeleton className="h-24 w-24 rounded-full mb-4" /> 
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="space-y-1.5">
                            <Skeleton className="h-5 w-1/4 rounded-md" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                    ))}
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-1">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" />
                    </div>
                </CardContent>
                 <CardFooter className="border-t px-6 py-4 justify-end gap-2 mt-6">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-36 rounded-md" />
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (isFetchError && !isNewUserMode) {
    return (
      <div className="space-y-6 text-center p-8 max-w-2xl mx-auto">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive">Failed to load user data</h2>
        <p className="text-muted-foreground text-lg mt-2">
            {fetchErrorDetail?.message || "An unexpected error occurred while trying to fetch user details."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
            Please check your connection or try again later.
        </p>
        <div className="flex gap-2 justify-center mt-6">
            <Button onClick={() => router.push('/admin')} variant="outline" className="text-base py-2 px-4">
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Admin
            </Button>
            <Button onClick={() => refetch()} className="text-base py-2 px-4">
                <RefreshCw className="mr-2 h-5 w-5" /> Retry
            </Button>
        </div>
      </div>
    );
  }

  const pageTitle = isNewUserMode ? "Add New User" : `Edit User: ${fetchedUser?.name || formData.name || '...'}`;
  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  let saveButtonText: string;
  if (isSubmitting) {
    saveButtonText = isNewUserMode ? "Creating..." : "Saving...";
  } else {
    saveButtonText = isNewUserMode ? "Create User" : "Save Changes";
  }

  const PageIcon = isNewUserMode ? UserPlus : UserCog;


  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting}>
            <XCircle className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" onClick={() => handleSubmit()} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" /> {saveButtonText}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
                <PageIcon className="h-6 w-6 text-primary" />
                {pageTitle}
            </CardTitle>
            <CardDescription>
                {isNewUserMode ? "Enter the details for the new user." : "Modify the user's details below."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePreview || undefined} alt="Profile Preview" data-ai-hint="avatar person"/>
                <AvatarFallback><UserIcon className="h-12 w-12" /></AvatarFallback>
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

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-base">Full Name</Label>
              <Input id="name" name="name" value={formData.name || ''} onChange={handleInputChange} required className="text-base" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-base">Email Address</Label>
              <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} required className="text-base" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-base">Role</Label>
              <Select name="role" value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger id="role" className="text-base">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password || ''}
                onChange={handleInputChange}
                placeholder={isNewUserMode ? "Enter password (required)" : "Leave blank to keep current password"}
                className="text-base"
                required={isNewUserMode}
              />
              <p className="text-xs text-muted-foreground">
                {isNewUserMode ? "Password is required for new users." : "Only fill this if you want to change the user's password."}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <Label htmlFor="isTwoFactorEnabled" className="font-medium text-base flex items-center">
                        <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground"/> Two-Factor Authentication
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Admins can enable/disable 2FA for users. Disabling also clears the user's 2FA secret.
                    </p>
                </div>
                <Switch
                    id="isTwoFactorEnabled"
                    checked={formData.isTwoFactorEnabled || false}
                    onCheckedChange={(checked) => handleSwitchChange(checked, 'isTwoFactorEnabled')}
                    aria-label="Toggle Two-Factor Authentication for user"
                />
            </div>

            {!isNewUserMode && formData.joinedDate && (
                <div className="space-y-1.5">
                    <Label className="text-base">Joined Date</Label>
                    <p className="text-sm text-muted-foreground">
                        {new Date(formData.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            )}

          </CardContent>
          <CardFooter className="border-t px-6 py-4 justify-end gap-2 mt-6">
            <Button variant="outline" type="button" onClick={handleCancel} disabled={isSubmitting}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" /> {saveButtonText}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
