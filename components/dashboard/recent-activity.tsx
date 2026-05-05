
'use client';

import React from 'react';
import { 
  MessageSquare, 
  UserPlus, 
  Zap, 
  AlertTriangle, 
  RefreshCcw, 
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  type: 'message' | 'automation' | 'user' | 'system' | 'gateway';
  title: string;
  description: string;
  time: Date | string;
  user?: {
    name: string;
    photo?: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface RecentActivityProps {
  activities: ActivityItem[];
  onViewAll?: () => void;
}

export function RecentActivity({ activities, onViewAll }: RecentActivityProps) {
  const getIcon = (type: ActivityItem['type'], status?: ActivityItem['status']) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'automation': return <Zap className="h-4 w-4" />;
      case 'user': return <UserPlus className="h-4 w-4" />;
      case 'gateway': return <RefreshCcw className="h-4 w-4" />;
      case 'system':
        if (status === 'error') return <AlertTriangle className="h-4 w-4" />;
        return <CheckCircle2 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'success': return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case 'warning': return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case 'error': return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl">Recent Activity</CardTitle>
          <CardDescription>Stay updated with the latest events.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1">
          View All <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground italic">
              No recent activity to show.
            </div>
          ) : (
            activities.map((activity, i) => (
              <div key={activity.id} className="relative flex items-start gap-4">
                {/* Timeline line */}
                {i !== activities.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-[-20px] w-0.5 bg-muted-foreground/10" />
                )}
                
                <div className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
                  getStatusColor(activity.status)
                )}>
                  {getIcon(activity.type, activity.status)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold leading-none">{activity.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {activity.description}
                  </p>
                  
                  {activity.user && (
                    <div className="flex items-center gap-2 mt-2 pt-1">
                      <Avatar className="h-5 w-5 border">
                        <AvatarImage src={activity.user.photo} />
                        <AvatarFallback className="text-[8px]">{activity.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground italic">by {activity.user.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
