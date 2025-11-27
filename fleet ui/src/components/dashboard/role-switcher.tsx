'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/lib/types';
import { useMemo } from 'react';

export function RoleSwitcher({ currentRole }: { currentRole: UserRole }) {
    // single-option list; no mockUsers
    const options = useMemo<UserRole[]>(() => [currentRole], [currentRole]);

    return (
        <Select defaultValue={currentRole}>
            <SelectTrigger className="w-auto border-0 bg-transparent text-foreground shadow-none hover:bg-accent/10 focus:ring-0 sm:w-48">
                <SelectValue placeholder="Switch Role" />
            </SelectTrigger>
            <SelectContent>
                {options.map((role) => (
                    <SelectItem key={role} value={role}>
                        {role}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
