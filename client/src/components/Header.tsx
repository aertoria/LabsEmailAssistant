import { useState } from "react";
import { UserMenu } from "./UserMenu";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { User } from "@shared/schema";

interface HeaderProps {
  user: User;
  onSignOut?: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality here
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="bg-white border-b border-gray-300 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900 mr-6">MailSync</h1>
          <div className="hidden md:block">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text" 
                placeholder="Search emails" 
                className="w-96 bg-gray-100 border-transparent rounded-lg py-2 pl-10 pr-4 focus:bg-white focus:border-blue-500 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-3 top-2.5 text-gray-500">
                <Search size={16} />
              </span>
            </form>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center text-sm text-gray-600">
            <span className="flex items-center text-green-500">
              <span className="material-icons text-sm mr-1">sync</span>
              <span>Synced</span>
            </span>
          </div>
          
          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}
