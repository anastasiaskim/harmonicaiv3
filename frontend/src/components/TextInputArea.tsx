import React from 'react';

interface TextInputAreaProps {
  text: string;
  onTextChange: (text: string) => void;
  placeholder?: string;
}

const TextInputArea: React.FC<TextInputAreaProps> = ({ text, onTextChange, placeholder }) => {
  return (
    <div className="w-full">
      <textarea
        className="w-full h-64 p-4 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={placeholder || 'Paste your text here to convert it into an audiobook...'}
      />
    </div>
  );
};

export default TextInputArea;
