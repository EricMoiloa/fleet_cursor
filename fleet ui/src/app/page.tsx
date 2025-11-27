// src/app/page.tsx (your login screen)
'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(email, password);          // redirect happens inside login()
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <main className="flex w-full flex-col items-center justify-center">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <Icons.logo className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold font-headline text-primary">
                Lesotho Fleet Management
              </CardTitle>
              <CardDescription>Intelligent Fleet Management System</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? 'Signing in…' : 'Login'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
  );
}
