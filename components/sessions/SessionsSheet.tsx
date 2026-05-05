"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { Clock, Bot, Zap, User, Activity } from "lucide-react";

interface SessionsSheetProps {
  isOpen?: boolean;
  onClose?: (open: boolean) => void;
  data?: any[];
  type?: 'automation' | 'ai' | 'all';
}

export function SessionsSheet({ isOpen: externalOpen, onClose, data = [], type = 'all' }: SessionsSheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? onClose : setInternalOpen;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Activity className="h-4 w-4" />
            {type === 'automation' ? 'Automation Sessions' : 'AI Sessions'}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Active Sessions
          </SheetTitle>
          <SheetDescription>
            Monitor live AI and Automation interactions.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border border-dashed rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">No active sessions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((session, i) => (
                <div key={i} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {session.type === 'ai' ? <Bot className="h-4 w-4 text-blue-500" /> : <Zap className="h-4 w-4 text-amber-500" />}
                      <span className="font-medium text-sm capitalize">{session.type || 'Session'}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {session.status || 'Active'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    Contact: {session.remoteJid || 'Unknown'}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Started: {new Date().toLocaleTimeString()}</span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {session.agentName || 'System'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
