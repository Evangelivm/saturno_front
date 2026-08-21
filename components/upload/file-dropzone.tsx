'use client';

import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle } from 'lucide-react';

interface FileDropzoneProps {
  label: string;
  accept: Record<string, string[]>;
  onDrop: (files: File[]) => void;
  uploaded: boolean;
}

export function FileDropzone({ label, accept, onDrop, uploaded }: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles: 1,
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-150
        ${isDragActive ? 'border-brand bg-brand/5 scale-[1.02] shadow-md' : 'border-border bg-muted/40 hover:border-brand/50 hover:bg-brand/5'}
        ${uploaded ? 'border-success bg-success/5' : ''}
      `}
    >
      <input {...getInputProps()} />

      {uploaded ? (
        <div className="flex flex-col items-center text-success">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm">Subido correctamente</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-muted-foreground">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Upload className="w-6 h-6" />
          </div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm">Arrastra o haz clic</p>
        </div>
      )}
    </div>
  );
}
