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
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${uploaded ? 'border-green-500 bg-green-50' : ''}
      `}
    >
      <input {...getInputProps()} />

      {uploaded ? (
        <div className="flex flex-col items-center text-green-600">
          <CheckCircle className="w-12 h-12 mb-2" />
          <p className="font-medium">{label}</p>
          <p className="text-sm">Subido correctamente</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-gray-600">
          <Upload className="w-12 h-12 mb-2" />
          <p className="font-medium">{label}</p>
          <p className="text-sm">Arrastra o haz clic</p>
        </div>
      )}
    </div>
  );
}
