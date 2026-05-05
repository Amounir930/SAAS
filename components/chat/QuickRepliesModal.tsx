"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import { QuickReply } from "./types";

interface QuickRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
  replies: QuickReply[];
}

export function QuickRepliesModal({ isOpen, onClose, onSelect, replies }: QuickRepliesModalProps) {
  const [search, setSearch] = useState("");

  const filtered = replies.filter(r => 
    (r.shortcut?.toLowerCase() || '').includes(search.toLowerCase()) || 
    r.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Quick Replies
          </DialogTitle>
          <DialogDescription>
            Select a saved response to send instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search shortcuts..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground italic text-sm">
              No replies found matching your search.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => {
                    onSelect(reply.content);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-primary text-sm">/{reply.shortcut}</span>
                    <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{reply.content}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
