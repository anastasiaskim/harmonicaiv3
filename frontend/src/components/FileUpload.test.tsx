import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUpload from './FileUpload';
import { act } from 'react';

describe('FileUpload', () => {
  const mockOnFileSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The button's accessible name is derived from the label due to htmlFor pointing to the button's id
  const buttonAccessibleName = /or upload a file \(.txt, .epub, .pdf\):/i;

  test('renders the file input label and custom button', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);
    expect(screen.getByText(buttonAccessibleName)).toBeInTheDocument(); // This is the label text
    // The button itself will have the text "Choose File" but its accessible name is the label's text
    const button = screen.getByRole('button', { name: buttonAccessibleName });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Choose File'); // Verify visible text
  });

  test('triggers hidden file input click when custom button is clicked', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} />);
    const fileInput = container.querySelector('#file-upload-input') as HTMLInputElement;
    // Query button by its accessible name
    const button = screen.getByRole('button', { name: buttonAccessibleName });

    const clickSpy = vi.spyOn(fileInput!, 'click');
    
    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
  
  test('calls onFileSelect with the file when a file is chosen via the hidden input', async () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} acceptedFileTypes=".txt" />);
    const fileInput = container.querySelector('#file-upload-input') as HTMLInputElement;
    const testFile = new File(['(⌐□_□)'], 'chucknorris.txt', { type: 'text/plain' });

    await act(async () => {
        fireEvent.change(fileInput!, {
          target: { files: [testFile] },
        });
    });

    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    expect(mockOnFileSelect).toHaveBeenCalledWith(testFile);
  });

  test('accepts specified file types', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} acceptedFileTypes=".jpg,.png" />);
    const fileInput = container.querySelector('#file-upload-input') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.jpg,.png');
  });

  test('defaults to .txt,.epub,.pdf if no acceptedFileTypes prop is given', () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} />);
    const fileInput = container.querySelector('#file-upload-input') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.txt,.epub,.pdf');
  });

  test('does not call onFileSelect when file selection is cancelled', async () => {
    const { container } = render(<FileUpload onFileSelect={mockOnFileSelect} />);
    const fileInput = container.querySelector('#file-upload-input') as HTMLInputElement;

    // Simulate a user opening the file dialog but selecting no file
    await act(async () => {
        fireEvent.change(fileInput!, {
          target: { files: [] },
        });
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });
});