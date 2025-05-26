"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Copy, Download, KeyRound, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BackupCodesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupCodesDialog({ isOpen, onClose }: BackupCodesDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesExist, setBackupCodesExist] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [step, setStep] = useState<'check' | 'confirm' | 'view'>('check');
  const [mounted, setMounted] = useState(false);
  const [codesSaved, setCodesSaved] = useState(false);

  // Ensure component is only rendered on client-side to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Add production debugging (can be removed after testing)
  useEffect(() => {
  }, [isOpen, mounted]);

  useEffect(() => {
    return () => {
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkBackupCodes();
    }
  }, [isOpen]);

  // Check if backup codes exist
  const checkBackupCodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/me/2fa/backup-codes');
      if (!response.ok) {
        throw new Error('Failed to check backup codes status');
      }
      
      const data = await response.json();
      setBackupCodesExist(data.backupCodesExist);
      setGeneratedAt(data.generatedAt);
      
      // If backup codes exist, show confirm step, otherwise generate new codes immediately
      if (data.backupCodesExist) {
        setStep('confirm');
      } else {
        // For first-time setup, automatically generate new backup codes
        generateBackupCodes();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check backup codes status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  }, [backupCodesExist]);

  // Generate new backup codes
  const generateBackupCodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/me/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: backupCodesExist }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate backup codes');
      }
      
      const data = await response.json();
      
      // Ensure backup codes exist in response
      if (!data.backupCodes) {
        throw new Error('No backup codes returned from server');
      }
      
      setBackupCodes(data.backupCodes);
      setStep('view');
    } catch (error: any) {
      console.error('[BackupCodesDialog] Error generating backup codes:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate backup codes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    const formattedCodes = backupCodes.join('\n');
    navigator.clipboard.writeText(formattedCodes);
    setCodesSaved(true);
    toast({
      title: "Copied",
      description: "Backup codes copied to clipboard.",
    });
  };

  // Download backup codes as text file
  const downloadBackupCodes = () => {
    const formattedCodes = backupCodes.join('\n');
    const blob = new Blob([formattedCodes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chronochimp-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setCodesSaved(true);
    toast({
      title: "Downloaded",
      description: "Backup codes downloaded as text file.",
    });
  };

  // Reset dialog state when closed
  const handleClose = () => {
    // Allow closing if not in view, no codes exist, or codes have been saved
    if (step !== 'view' || backupCodes.length === 0 || codesSaved) {
      setStep('check');
      setBackupCodes([]);
      setCodesSaved(false);
      onClose();
    } else {
      toast({
        title: "Save Your Backup Codes",
        description: "Please copy or download your backup codes before closing. They won't be shown again.",
        variant: "destructive"
      });
    }
  };

  // Don't render on server-side to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => { 
        if (!open) handleClose(); 
      }}
      modal={true}
    >
      <DialogContent className="sm:max-w-md fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5" />
            {step === 'confirm' ? 'Replace Existing Backup Codes?' : 'Backup Codes'}
          </DialogTitle>
          <DialogDescription>
            {step === 'confirm' ? 
              `You already have backup codes generated on ${new Date(generatedAt!).toLocaleDateString()}. These codes will be invalidated if you generate new ones.` :
              'Backup codes allow you to sign in if you lose access to your authenticator app.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Your existing backup codes will no longer work if you generate new ones. Make sure you have access to your authenticator app before proceeding.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={generateBackupCodes}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate New Codes'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'view' && backupCodes.length > 0 && (
          <div className="space-y-4 py-4">
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Save these codes in a secure place. They will only be shown once and each code can only be used once.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code key={index} className="rounded bg-muted p-2 font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={copyBackupCodes}
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadBackupCodes}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          {step === 'view' && (
            <Button 
              onClick={handleClose} 
              disabled={!codesSaved}
              variant={codesSaved ? "default" : "destructive"}
            >
              {codesSaved ? "Close" : "Save Codes First"}
            </Button>
          )}
          {step === 'check' && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
