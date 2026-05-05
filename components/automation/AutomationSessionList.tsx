
'use client';

import React from 'react';
import { 
  History, 
  Activity, 
  User, 
  Clock, 
  MoreVertical, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface AutomationSession {
  id: string;
  automationId: number;
  automationName: string;
  contactName: string;
  contactJid: string;
  contactPhoto?: string;
  status: 'completed' | 'running' | 'failed' | 'waiting';
  startTime: Date | string;
  endTime?: Date | string;
  lastStep?: string;
  stepsCount: number;
}

interface AutomationSessionListProps {
  sessions: AutomationSession[];
  onViewDetails: (id: string) => void;
}

export function AutomationSessionList({
  sessions,
  onViewDetails
}: AutomationSessionListProps) {
  const getStatusBadge = (status: AutomationSession['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'running':
        return <Badge variant="default" className="gap-1 animate-pulse"><Activity className="h-3 w-3" /> Running</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'waiting':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Waiting</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recent Sessions</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs">View All History</Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contact</TableHead>
            <TableHead>Automation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                No active or recent sessions found.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.contactPhoto} />
                      <AvatarFallback>{session.contactName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{session.contactName}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {session.contactJid}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{session.automationName}</span>
                    <span className="text-[10px] text-muted-foreground">ID: {session.automationId}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(session.status)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium">{session.lastStep || 'Starting...'}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${Math.min((session.stepsCount / 10) * 100, 100)}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{session.stepsCount} steps</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xs">{formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}</span>
                    {session.endTime && (
                      <span className="text-[10px] text-muted-foreground italic">Duration: 12s</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onViewDetails(session.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}