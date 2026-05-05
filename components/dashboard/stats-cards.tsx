
'use client';

import React from 'react';
import { 
  MessageSquare, 
  Users, 
  Zap, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MousePointerClick
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Stat {
  title: string;
  value: string | number;
  description: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

interface StatsCardsProps {
  stats: Stat[];
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg hover:border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {stat.title}
            </CardTitle>
            <div className={cn("p-2 rounded-lg", stat.color)}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="flex items-center gap-1 mt-1">
              <div className={cn(
                "flex items-center text-xs font-medium",
                stat.trend === 'up' ? "text-emerald-500" : "text-rose-500"
              )}>
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {Math.abs(stat.change)}%
              </div>
              <p className="text-[10px] text-muted-foreground font-light">
                {stat.description}
              </p>
            </div>
            
            {/* Subtle background chart effect */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20">
              <div 
                className={cn(
                  "h-full transition-all duration-1000",
                  stat.trend === 'up' ? "bg-emerald-500/50" : "bg-rose-500/50"
                )}
                style={{ width: `${Math.abs(stat.change)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Default export with a set of default stats for demonstration
export default function DashboardStats() {
  const defaultStats: Stat[] = [
    {
      title: "Total Messages",
      value: "45,231",
      description: "from last month",
      change: 12.5,
      trend: 'up',
      icon: MessageSquare,
      color: "bg-blue-500/10 text-blue-500"
    },
    {
      title: "Active Contacts",
      value: "12,402",
      description: "active users today",
      change: 4.3,
      trend: 'up',
      icon: Users,
      color: "bg-purple-500/10 text-purple-500"
    },
    {
      title: "Auto-Replies",
      value: "89.2%",
      description: "success rate",
      change: -2.1,
      trend: 'down',
      icon: Zap,
      color: "bg-amber-500/10 text-amber-500"
    },
    {
      title: "API Usage",
      value: "72%",
      description: "of monthly limit",
      change: 18.2,
      trend: 'up',
      icon: BarChart3,
      color: "bg-rose-500/10 text-rose-500"
    }
  ];

  return <StatsCards stats={defaultStats} />;
}
