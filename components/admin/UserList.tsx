
'use client';

import React from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Mail, 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  UserCog,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'manager' | 'support';
  status: 'active' | 'suspended' | 'pending';
  photo?: string;
  lastLogin?: Date | string;
  createdAt: Date | string;
}

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, status: User['status']) => void;
}

export function UserList({
  users,
  onEdit,
  onDelete,
  onToggleStatus
}: UserListProps) {
  const [search, setSearch] = React.useState('');

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20"><ShieldAlert className="h-3 w-3 mr-1" /> Admin</Badge>;
      case 'manager':
        return <Badge variant="default" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"><ShieldCheck className="h-3 w-3 mr-1" /> Manager</Badge>;
      case 'support':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"><Shield className="h-3 w-3 mr-1" /> Support</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="rounded-full"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="rounded-full"><XCircle className="h-3 w-3 mr-1" /> Suspended</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="rounded-full">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.photo} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <UserCog className="mr-2 h-4 w-4" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(user.id, user.status === 'active' ? 'suspended' : 'active')}>
                          {user.status === 'active' ? (
                            <><Lock className="mr-2 h-4 w-4" /> Suspend Account</>
                          ) : (
                            <><Unlock className="mr-2 h-4 w-4" /> Activate Account</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(user.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
