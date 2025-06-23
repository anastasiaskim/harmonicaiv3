
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders with the default variant', () => {
    render(<Badge>Default</Badge>);
    const badgeElement = screen.getByText('Default');
    expect(badgeElement).toHaveClass('bg-primary');
  });

  it('renders with the secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badgeElement = screen.getByText('Secondary');
    expect(badgeElement).toHaveClass('bg-secondary');
  });

  it('renders with the destructive variant', () => {
    render(<Badge variant="destructive">Destructive</Badge>);
    const badgeElement = screen.getByText('Destructive');
    expect(badgeElement).toHaveClass('bg-destructive');
  });

  it('renders with the outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badgeElement = screen.getByText('Outline');
    expect(badgeElement).toHaveClass('text-foreground');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badgeElement = screen.getByText('Custom');
    expect(badgeElement).toHaveClass('custom-class');
  });
});
