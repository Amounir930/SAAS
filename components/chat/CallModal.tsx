'use client';

import React from 'react';
import { useCall } from '@/providers/call-provider';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CallConfirmDialog() {
  const call = useCall();
  if (!call || call.status !== 'confirming' || !call.contact) return null;

  return (
    <Dialog open={true} onOpenChange={() => call.dismiss()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center">Start Voice Call</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6 gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={call.contact.avatar} />
            <AvatarFallback className="text-2xl">{call.contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-lg font-bold">{call.contact.name}</h3>
            <p className="text-sm text-muted-foreground">{call.contact.number}</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => call.dismiss()} className="rounded-full px-8">
            Cancel
          </Button>
          <Button onClick={() => call.startCall()} className="rounded-full px-8 bg-green-600 hover:bg-green-700">
            <Phone className="mr-2 h-4 w-4 fill-current" />
            Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FloatingCallCard() {
  const call = useCall();
  if (!call || call.status === 'idle' || call.status === 'confirming') return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-72 bg-card border shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={call.contact?.avatar} />
          <AvatarFallback>{call.contact?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{call.contact?.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {call.status.replace('-', ' ')} {call.status === 'in-progress' && `• ${formatTime(call.elapsed)}`}
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Button 
          variant="secondary" 
          size="icon" 
          className={cn("rounded-full h-10 w-10", call.isMuted && "bg-destructive text-destructive-foreground")}
          onClick={() => call.toggleMute()}
        >
          {call.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        
        <Button 
          variant="destructive" 
          size="icon" 
          className="rounded-full h-10 w-10 bg-red-600 hover:bg-red-700"
          onClick={() => call.hangup()}
        >
          <PhoneOff className="h-4 w-4 fill-current" />
        </Button>

        {(call.status === 'completed' || call.status === 'failed') && (
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => call.dismiss()}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
