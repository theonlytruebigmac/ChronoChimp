'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, XCircle, UserPlus, ShieldCheck, Upload, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { createAdminUser, UserCreationData } from '@/lib/api/users';
import type { UserRole } from '@/app/admin/page';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const userRoles: UserRole[] = ["Admin", "Editor", "Viewer"];

export default function NewUserEditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<UserCreationData>>({
    name: '',
    email: '',
    role: 'Viewer',
    password: '',
    avatarUrl: '',
    isTwoFactorEnabled: false,
  });
  
  const [profilePreview, setProfilePreview] = useState<string | null>("https://placehold.co/100x100.png");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const createUserMutation = useMutation({
    mutationFn: (userData: UserCreationData) => createAdminUser(userData),
    onSuccess: (newUser) => {
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

  const handleSwitchChange = (checked: boolean, name: keyof Pick<UserCreationData, 'isTwoFactorEnabled'>) => {
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
    if (!formData.password || formData.password.trim() === '') {
      toast({title: "Missing Password", description: "Password is required for new users.", variant: "destructive"});
      return;
    }

    const submissionData: UserCreationData = {
      name: formData.name!,
      email: formData.email!,
      role: formData.role || 'Viewer',
      password: formData.password!,
      avatarUrl: formData.avatarUrl || undefined,
      isTwoFactorEnabled: formData.isTwoFactorEnabled || false,
    };

    createUserMutation.mutate(submissionData);
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  const isSubmitting = createUserMutation.isPending;

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
            <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" />
              Add New User
            </CardTitle>
            <CardDescription>
              Enter the details for the new user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePreview || undefined} alt="Profile Preview" data-ai-hint="avatar person"/>
                <AvatarFallback><UserIcon className="h-12 w-12" /></AvatarFallback>
              </Avatar>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="profilePictureButton">Upload Profile Picture</Label>
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
              <Select 
                name="role" 
                value={formData.role} 
                onValueChange={handleRoleChange}
              >
                <SelectTrigger id="role" className="text-base">
                  <SelectValue>{formData.role}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
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
                placeholder="Enter password (required)"
                className="text-base"
                required
              />
              <p className="text-xs text-muted-foreground">
                Password is required for new users.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isTwoFactorEnabled" className="font-medium text-base flex items-center">
                  <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground"/> Two-Factor Authentication
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable 2FA for this user. They will need to set it up on first login.
                </p>
              </div>
              <Switch
                id="isTwoFactorEnabled"
                checked={formData.isTwoFactorEnabled || false}
                onCheckedChange={(checked) => handleSwitchChange(checked, 'isTwoFactorEnabled')}
                aria-label="Toggle Two-Factor Authentication for user"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 justify-end gap-2 mt-6">
            <Button variant="outline" type="button" onClick={handleCancel} disabled={isSubmitting}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
