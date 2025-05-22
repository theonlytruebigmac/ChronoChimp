
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from 'lucide-react';

interface TimeLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  initialNotes?: string;
  setInitialNotes: (notes: string) => void; // Allow parent to update notes if needed
}

export function TimeLogDialog({ isOpen, onClose, onSave, initialNotes = '', setInitialNotes }: TimeLogDialogProps) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleSave = () => {
    onSave(notes);
    setNotes(''); // Reset notes after saving
    onClose();
  };

  const handleClose = () => {
    setNotes(initialNotes); // Reset to initial if closed without saving
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>
            Add notes for the time you just spent on this task. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 items-center gap-4">
            <Label htmlFor="notes" className="text-left">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setInitialNotes(e.target.value); // Keep parent in sync if typing
              }}
              placeholder="What did you work on?"
              className="col-span-3 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
