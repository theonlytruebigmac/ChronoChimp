'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function NewUserPage() {
  const router = useRouter();
  
  // This is a redirection page that will send users to the proper edit route
  useEffect(() => {
    // Redirect to the edit page with 'new' as the ID parameter
    router.push('/admin/users/new/edit');
  }, [router]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
          </Link>
        </Button>
      </div>
      
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Add New User
          </CardTitle>
          <CardDescription>
            Redirecting to user creation form...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/admin/users/new/edit">
              Click here if you are not redirected automatically
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
