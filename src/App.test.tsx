import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/SideNav.tsx', () => ({
  MobileHeader: () => <div data-testid="mobile-header" />,
  MobileFooter: () => <div data-testid="mobile-footer" />,
  SideNav: () => <nav aria-label="Side navigation" />,
}));

vi.mock('@/components/AnimatedOutlet.tsx', () => ({
  AnimatedOutlet: () => <div>Mock outlet</div>,
}));

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

import App from './App';

describe('App shell accessibility', () => {
  it('renders a skip link that targets the main content landmark', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    const skipLink = screen.getByRole('link', { name: /skip to content/i });
    const main = screen.getByRole('main');

    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });
});
