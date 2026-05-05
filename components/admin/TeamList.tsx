
'use client';

import React from 'react';
import { 
  Users2, 
  Plus, 
  Search, 
  MoreVertical, 
  Settings, 
  ExternalLink,
  MessageSquare,
  BarChart3,
  Users
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar-group'; // Assuming a custom avatar group or shadcn extension
import { Avatar as SingleAvatar, AvatarFallback as SingleFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface TeamMember {
  id: string;
  name: string;
  photo?: string;
  role: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  activeChats: number;
  totalMessages: number;
  performance: number;
  createdAt: Date | string;
}

interface TeamListProps {
  teams: Team[];
  onCreate: () => void;
  onManage: (id: string) => void;
}

export function TeamList({
  teams,
  onCreate,
  onManage
}: TeamListProps) {
  const [search, setSearch] = React.useState('');

  const filtered = teams.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">Manage your support teams and assignment rules.</p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search teams..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((team) => (
          <Card key={team.id} className="overflow-hidden border-border/60">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  <CardDescription>{team.description || "No description provided."}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onManage(team.id)}>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Team Members</p>
                  <div className="flex -space-x-2 overflow-hidden py-1">
                    {team.members.slice(0, 5).map((member) => (
                      <SingleAvatar key={member.id} className="inline-block border-2 border-background ring-0 h-8 w-8">
                        <AvatarImage src={member.photo} />
                        <SingleFallback>{member.name[0]}</SingleFallback>
                      </SingleAvatar>
                    ))}
                    {team.members.length > 5 && (
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-[10px] font-bold">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Efficiency</p>
                  <p className="text-lg font-bold text-primary">{team.performance}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Active Chats</p>
                    <p className="text-sm font-bold">{team.activeChats}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Total Messages</p>
                    <p className="text-sm font-bold">{team.totalMessages.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Workload Distribution</span>
                  <span className="font-medium">{team.performance}% capacity</span>
                </div>
                <Progress value={team.performance} className="h-1.5" />
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 py-3">
              <Button variant="ghost" className="w-full text-xs gap-2" onClick={() => onManage(team.id)}>
                View Team Analytics
                <ExternalLink className="h-3 w-3" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Users2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No teams found</h3>
          <p className="text-muted-foreground mb-4">Start by grouping your agents into teams.</p>
          <Button onClick={onCreate}>Create Your First Team</Button>
        </div>
      )}
    </div>
  );
}