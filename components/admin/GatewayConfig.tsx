
'use client';

import React from 'react';
import { 
  Settings, 
  Smartphone, 
  ShieldCheck, 
  Globe, 
  Key, 
  Save, 
  RefreshCcw, 
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { cn } from "@/lib/utils";
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
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface GatewayConfig {
  id: string;
  instanceName: string;
  instanceId: string;
  provider: 'evolution' | 'meta' | 'twilio';
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  baseUrl?: string;
  phoneNumber?: string;
  isActive: boolean;
}

interface GatewayConfigProps {
  configs: GatewayConfig[];
  onSave: (config: Partial<GatewayConfig>) => void;
  onTest: (id: string) => Promise<boolean>;
  onRefresh: (id: string) => void;
}

export function GatewayConfig({
  configs,
  onSave,
  onTest,
  onRefresh
}: GatewayConfigProps) {
  const [activeTab, setActiveTab] = React.useState<string>(configs[0]?.id || 'new');
  const [isTesting, setIsTesting] = React.useState<string | null>(null);

  const currentConfig = configs.find(c => c.id === activeTab) || {
    id: 'new',
    instanceName: '',
    provider: 'evolution',
    apiKey: '',
    baseUrl: '',
    isActive: true,
    status: 'disconnected'
  } as GatewayConfig;

  const handleTest = async (id: string) => {
    setIsTesting(id);
    await onTest(id);
    setIsTesting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Gateways</h1>
          <p className="text-muted-foreground">Configure your WhatsApp instances and API providers.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instances</CardTitle>
              <CardDescription>Select an instance to configure.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {configs.map((config) => (
                  <button
                    key={config.id}
                    onClick={() => setActiveTab(config.id)}
                    className={cn(
                      "flex items-center justify-between px-6 py-4 text-left transition-colors border-l-4",
                      activeTab === config.id 
                        ? "bg-primary/5 border-primary" 
                        : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        config.status === 'connected' ? "bg-green-500" : "bg-rose-500"
                      )} />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{config.instanceName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{config.provider}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5">{config.status}</Badge>
                  </button>
                ))}
                <button
                  onClick={() => setActiveTab('new')}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 text-left transition-colors border-l-4",
                    activeTab === 'new' ? "bg-primary/5 border-primary" : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Connect New Gateway</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card className="border-border/60">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>{activeTab === 'new' ? 'New Configuration' : currentConfig.instanceName}</CardTitle>
                  <CardDescription>Setup your WhatsApp API connection details.</CardDescription>
                </div>
                {activeTab !== 'new' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onRefresh(activeTab)}>
                      <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleTest(activeTab)}
                      disabled={isTesting === activeTab}
                    >
                      {isTesting === activeTab ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instanceName">Friendly Name</Label>
                  <Input id="instanceName" placeholder="e.g. Sales Team" defaultValue={currentConfig.instanceName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider Type</Label>
                  <Select defaultValue={currentConfig.provider}>
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evolution">Evolution API</SelectItem>
                      <SelectItem value="meta">Meta Cloud API</SelectItem>
                      <SelectItem value="twilio">Twilio Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base API URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="baseUrl" className="pl-9" placeholder="https://api.yourdomain.com" defaultValue={currentConfig.baseUrl} />
                </div>
                <p className="text-[10px] text-muted-foreground italic">Required for Evolution and Twilio providers.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key / Secret</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="apiKey" type="password" className="pl-9" placeholder="Enter your provider API key" defaultValue={currentConfig.apiKey} />
                </div>
              </div>

              {currentConfig.status === 'error' && (
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Connection Failed</AlertTitle>
                  <AlertDescription className="text-xs">
                    Could not reach the gateway. Please check your API key and Base URL.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/10">
                <div className="space-y-0.5">
                  <Label className="text-base">Active Gateway</Label>
                  <p className="text-sm text-muted-foreground font-light">Toggle this instance to start/stop processing messages.</p>
                </div>
                <Switch defaultChecked={currentConfig.isActive} />
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 flex justify-between">
              <Button variant="ghost" className="gap-2 text-xs">
                <Info className="h-4 w-4" />
                View Provider Documentation
              </Button>
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                {activeTab === 'new' ? 'Connect Gateway' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
