import React, { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string; // e.g., '.txt,.pdf'
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, acceptedFileTypes }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="my-4">
      <label htmlFor="file-upload-button" className="block text-sm font-medium text-gray-700 mb-1">
        Or upload a file (.txt, .epub, .pdf):
      </label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedFileTypes || '.txt,.epub,.pdf'}
        className="hidden" // Hide the default input
        id="file-upload-input"
      />
      <button
        id="file-upload-button"
        type="button"
        onClick={handleClick}
        className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Choose File
      </button>
    </div>
  );
};

export default FileUpload;
