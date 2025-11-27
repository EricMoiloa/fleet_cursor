'use client';

import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    useSidebar
} from '@/components/ui/sidebar';
import type { UserRole, HeaderUser } from '@/lib/types';
import { DashboardHeader } from './header';
import { SidebarNav } from './sidebar-nav';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useAuth } from '@/lib/auth';
import { useMemo } from 'react';

function SidebarToggle() {
    const { toggleSidebar, state } = useSidebar();
    const Icon = state === 'collapsed' ? ChevronRight : ChevronLeft;
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 bg-card text-foreground rounded-full h-8 w-8 hover:bg-card border"
        >
            <Icon className="h-4 w-4" />
        </Button>
    );
}

export function DashboardLayout({
                                    role,
                                    children,
                                }: {
    role: UserRole;
    children: React.ReactNode;
}) {
    const { user } = useAuth(); // ApiUser | null

    const userName = user?.name ?? '—';
    const userEmail = user?.email ?? '—';
    const currentRole: UserRole =
        (user?.role?.name as UserRole | undefined) ?? role;

    const roleSlug = useMemo(
        () => currentRole.toLowerCase().replace(/ /g, '-'),
        [currentRole]
    );

    // Adapt user shape for existing header component
    const headerUser: HeaderUser = {
        id: String(user?.id ?? ''),                // ✅ cast to string
        name: userName,
        email: userEmail,
        role: currentRole,
        avatarUrl: user?.avatar_url ?? undefined, // optional
    };

    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-10 w-10 text-sidebar-primary bg-primary/10 hover:bg-primary/20"
                        >
                            <Link href={`/${roleSlug}/dashboard`}>
                                <Icons.logo className="h-6 w-6" />
                            </Link>
                        </Button>
                        <h2 className="text-lg font-semibold text-sidebar-foreground font-headline group-data-[collapsible=icon]:hidden">
                            Lesotho Fleet Management
                        </h2>
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarNav role={currentRole} />
                </SidebarContent>

                <SidebarFooter className="flex-col !items-start p-2 gap-2">
                    <div className="w-full p-2 rounded-lg flex items-center gap-3 bg-sidebar-accent/5 group-data-[collapsible=icon]:!bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-auto">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user?.avatar_url ?? ''} alt={userName} />
                            <AvatarFallback>{userName ? userName.charAt(0) : 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="group-data-[collapsible=icon]:hidden">
                            <p className="font-semibold text-sm text-sidebar-foreground">{userName}</p>
                            <p className="text-xs text-sidebar-foreground/70">{userEmail}</p>
                        </div>
                    </div>
                </SidebarFooter>

                <SidebarToggle />
            </Sidebar>

            <SidebarInset>
                <DashboardHeader user={headerUser} />
                <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
