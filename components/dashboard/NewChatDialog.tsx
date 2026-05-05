'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
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
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  instances: any[];
}

export function NewChatDialog({ isOpen, onClose, instances }: NewChatDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [instanceId, setInstanceId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !instanceId) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Logic to check or create chat
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      router.push(`/dashboard/chat/${cleanNumber}?instanceId=${instanceId}`);
      onClose();
      setPhoneNumber('');
    } catch (error) {
      toast.error('Failed to start chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Enter a phone number with country code to start a new WhatsApp chat.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="instance">WhatsApp Channel</Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(instances) && instances.map((ins) => (
                  <SelectItem key={ins.dbId} value={ins.dbId.toString()}>
                    {ins.instanceName}
                  </SelectItem>
                ))}
                {(!Array.isArray(instances) || instances.length === 0) && (
                  <SelectItem value="none" disabled>No active channels</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input 
              id="phone" 
              placeholder="e.g. 1234567890" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !Array.isArray(instances) || instances.length === 0}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Start Chat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
