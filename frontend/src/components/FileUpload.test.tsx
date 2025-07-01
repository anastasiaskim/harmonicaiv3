/// <reference types="vitest/globals" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import FileUpload from './FileUpload';

describe('FileUpload Component', () => {
  it('should render the select file button initially', () => {
    const handleFileSelect = vi.fn();
    render(<FileUpload onFileSelect={handleFileSelect} />);
    expect(screen.getByRole('button', { name: /select a file/i })).toBeInTheDocument();
  });

  it('should open the file dialog when the button is clicked', () => {
    const handleFileSelect = vi.fn();
    render(<FileUpload onFileSelect={handleFileSelect} />);
    
    const button = screen.getByRole('button', { name: /select a file/i });
    const fileInput = button.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    
    fireEvent.click(button);
    
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('should call onFileSelect and update the UI when a file is selected', async () => {
    const handleFileSelect = vi.fn();
    render(<FileUpload onFileSelect={handleFileSelect} />);
    
    const button = screen.getByRole('button', { name: /select a file/i });
    const fileInput = button.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(handleFileSelect).toHaveBeenCalledWith(testFile);
    });

    expect(await screen.findByText('Selected: test.txt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change file/i })).toBeInTheDocument();
  });

  it('should apply the acceptedFileTypes prop to the file input', () => {
    const handleFileSelect = vi.fn();
    const acceptedTypes = '.txt,.pdf';
    render(<FileUpload onFileSelect={handleFileSelect} acceptedFileTypes={acceptedTypes} />);
    
    const button = screen.getByRole('button', { name: /select a file/i });
    const fileInput = button.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    expect(fileInput.accept).toBe(acceptedTypes);
  });
});