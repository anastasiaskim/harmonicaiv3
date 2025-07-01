import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, acceptedFileTypes }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={acceptedFileTypes}
      />
      <Button onClick={handleButtonClick} variant="outline">
        {selectedFile ? 'Change File' : 'Select a File'}
      </Button>
      {selectedFile && (
        <p className="text-sm text-gray-500">Selected: {selectedFile.name}</p>
      )}
    </div>
  );
};

export default FileUpload;
