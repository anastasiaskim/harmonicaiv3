
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './button';

describe('Button', () => {
  it('renders with the default variant and size', () => {
    render(<Button>Default</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Default' });
    expect(buttonElement).toHaveClass('bg-primary');
    expect(buttonElement).toHaveClass('h-9');
  });

  it('renders with a different variant', () => {
    render(<Button variant="destructive">Destructive</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Destructive' });
    expect(buttonElement).toHaveClass('bg-destructive');
  });

  it('renders with a different size', () => {
    render(<Button size="lg">Large</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Large' });
    expect(buttonElement).toHaveClass('h-10');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Custom' });
    expect(buttonElement).toHaveClass('custom-class');
  });

  it('is disabled when the disabled prop is passed', () => {
    render(<Button disabled>Disabled</Button>);
    const buttonElement = screen.getByRole('button', { name: 'Disabled' });
    expect(buttonElement).toBeDisabled();
  });
});
