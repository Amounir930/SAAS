"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface Template {
  id: string | number;
  name: string;
  category: string;
  language: string;
  components: any[];
}

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (templateName: string) => void;
  templates: Template[];
}

export function TemplateDialog({ isOpen, onClose, onSend, templates }: TemplateDialogProps) {
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const selected = templates.find(t => t.id === selectedId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            WhatsApp Templates
          </DialogTitle>
          <DialogDescription>
            Select a pre-approved Meta template to start a new conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <ScrollArea className="h-[400px] border rounded-lg p-2">
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full text-left p-3 rounded-md transition-all border ${
                    selectedId === template.id 
                      ? 'bg-primary/5 border-primary ring-1 ring-primary' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm truncate pr-2">{template.name}</span>
                    {selectedId === template.id && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[10px] h-4">
                      {template.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {template.language}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="flex flex-col h-[400px]">
            <div className="flex-1 border rounded-lg bg-muted/20 p-4 relative overflow-hidden">
              <div className="text-[10px] uppercase text-muted-foreground font-bold mb-4">Preview</div>
              {selected ? (
                <div className="bg-background p-4 rounded-lg shadow-sm border text-sm max-w-[250px] ml-auto relative chat-bubble-tri">
                   {selected.components.find(c => c.type === 'BODY')?.text || 'No body content'}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic text-xs text-center p-8">
                  Select a template to see how it looks.
                </div>
              )}
              
              <style jsx>{`
                .chat-bubble-tri::after {
                  content: '';
                  position: absolute;
                  right: -8px;
                  top: 0;
                  width: 0;
                  height: 0;
                  border-left: 10px solid white;
                  border-bottom: 10px solid transparent;
                }
              `}</style>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button 
                className="flex-1" 
                disabled={!selectedId}
                onClick={() => {
                  if (selected) onSend(selected.name);
                  onClose();
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
