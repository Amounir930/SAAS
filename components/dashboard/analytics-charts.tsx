"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Bar, BarChart, Line, LineChart, ResponsiveContainer, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { TrendingUp, Users, MessageCircle, Clock, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function TrafficHeatmap({ data }: { data: any[] }) {
  return (
    <Card className="lg:col-span-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4" /> Message Traffic (Last 90 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 10}} 
                interval={Math.floor(data.length / 10)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function FunnelLineChart({ data }: { data: any[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{fontSize: 12}} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.2})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function FunnelRadarChart({ data }: { data: any[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" /> Funnel Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid opacity={0.2} />
              <PolarAngleAxis dataKey="name" tick={{fontSize: 10}} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
              <Radar
                name="Contacts"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentList({ data }: { data: any[] }) {
  return (
    <Card className="lg:col-span-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" /> Agent Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No agent data available yet.</p>
          ) : (
            data.map((agent, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="text-xs">{agent.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <div className="flex gap-1 mt-1">
                      {Object.entries(agent.funnels).map(([stage, count]: [any, any]) => (
                        <Badge key={stage} variant="outline" className="text-[10px] py-0 h-4 px-1 font-normal">
                          {stage}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{agent.total}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Chats</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}