'use client';

import React from 'react';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Filter, User, Tag, Layers, Server } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ChatFiltersProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filters: {
    funnelStageId: number | null;
    tagId: number | null;
    agentId: number | null;
    instanceId: number | null;
  };
  setFilters: (filters: any) => void;
  instances: any[];
}

export function ChatFilters({
  activeTab,
  setActiveTab,
  filters,
  setFilters,
  instances
}: ChatFiltersProps) {
  const t = useTranslations('Dashboard');

  return (
    <div className="flex flex-col gap-3 p-4 border-b bg-card/50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="all" className="text-xs">{t('tab_all')}</TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">{t('tab_unread')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-2">
        <Select 
          value={filters.instanceId?.toString() || 'all'} 
          onValueChange={(v) => setFilters({ ...filters, instanceId: v === 'all' ? null : parseInt(v) })}
        >
          <SelectTrigger className="h-8 text-[10px] bg-background">
            <Server className="mr-2 h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder={t('instance_placeholder') || 'Instance'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_instances') || 'All Channels'}</SelectItem>
            {Array.isArray(instances) && instances.map((ins) => (
              <SelectItem key={ins.dbId} value={ins.dbId.toString()}>
                {ins.instanceName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.agentId?.toString() || 'all'} 
          onValueChange={(v) => setFilters({ ...filters, agentId: v === 'all' ? null : v })}
        >
          <SelectTrigger className="h-8 text-[10px] bg-background">
            <User className="mr-2 h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder={t('agent_placeholder') || 'Agent'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_agents') || 'All Agents'}</SelectItem>
            {/* Agents are populated via context in parent */}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
