
'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  MoreVertical, 
  Plus, 
  Search, 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Edit2,
  Trash2,
  Copy
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface Automation {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  type: 'flow' | 'keyword' | 'ai';
  lastRun?: Date | string;
  successRate?: number;
  totalRuns: number;
  createdAt: Date | string;
}

interface AutomationListProps {
  automations: Automation[];
  onToggleStatus: (id: number, status: boolean) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
}

export function AutomationList({
  automations,
  onToggleStatus,
  onEdit,
  onDelete,
  onCreate
}: AutomationListProps) {
  const [search, setSearch] = React.useState('');

  const filtered = automations.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">Manage your automated workflows and AI responders.</p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search automations..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((automation) => (
          <Card key={automation.id} className="group overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {automation.type === 'flow' && <Zap className="h-5 w-5" />}
                  {automation.type === 'ai' && <CheckCircle2 className="h-5 w-5" />}
                  {automation.type === 'keyword' && <Clock className="h-5 w-5" />}
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={automation.status === 'active'} 
                    onCheckedChange={(val) => onToggleStatus(automation.id, val)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEdit(automation.id)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit Workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(automation.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardTitle className="mt-4 line-clamp-1">{automation.name}</CardTitle>
              <CardDescription className="line-clamp-2 h-10">
                {automation.description || "No description provided."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Runs</p>
                  <p className="text-lg font-bold">{automation.totalRuns.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Success Rate</p>
                  <p className="text-lg font-bold text-green-500">{automation.successRate || 0}%</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last run: {automation.lastRun ? format(new Date(automation.lastRun), 'MMM d, HH:mm') : 'Never'}
                </div>
                <Badge variant={automation.status === 'active' ? 'success' : 'secondary'} className="capitalize">
                  {automation.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <Zap className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No automations found</h3>
          <p className="text-muted-foreground mb-6">Start by creating your first automated workflow.</p>
          <Button onClick={onCreate}>Create Automation</Button>
        </div>
      )}
    </div>
  );
}
