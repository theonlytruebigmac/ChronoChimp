import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';

interface ImportTasksCsvProps {
  onImportSuccess?: (count: number) => void;
  className?: string;
}

export const ImportTasksCsv: React.FC<ImportTasksCsvProps> = ({ onImportSuccess, className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/tasks/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onImportSuccess?.(data.count);
        alert(`Successfully imported ${data.count} tasks.`);
      } else {
        alert(data.error || 'Import failed.');
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={className}
      >
        <UploadCloud className="mr-2 h-4 w-4" />
        {isUploading ? 'Importing...' : 'Import CSV'}
      </Button>
    </>
  );
};
