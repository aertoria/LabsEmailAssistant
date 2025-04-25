import { useState } from 'react';
import { User } from '@shared/schema';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserMenuProps {
  user: any; // Change from User to any to allow mock users
  onSignOut?: () => void; // Add optional sign out callback
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  // No longer use useAuth

  const getUserInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handleSignOut = async () => {
    if (onSignOut) {
      await onSignOut();
    } else {
      // Fallback: just redirect to login
      window.location.href = '/';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center focus:outline-none">
        <Avatar className="w-8 h-8 bg-blue-500 text-white">
          <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden md:block ml-2 text-sm text-gray-800">{user.name || user.email || user.username}</span>
        <ChevronDown className="text-gray-600 h-4 w-4 ml-1" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-900">{user.name || "User"}</p>
          <p className="text-xs text-gray-500 truncate">{user.email || user.username}</p>
        </div>
        <DropdownMenuItem>Account settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
