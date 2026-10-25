import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

/* Polyfill TextEncoder for jsdom + react-router */
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder: TE, TextDecoder: TD } = require('util');
  (global as any).TextEncoder = TE;
  (global as any).TextDecoder = TD;
}

import { MemoryRouter, Routes, Route } from 'react-router-dom';

/* Mock framer-motion */
jest.mock('framer-motion', () => {
  const R = jest.requireActual('react');
  const el = (tag: string) => ({ children, whileHover, ...props }: any) => R.createElement(tag, props, children);
  return { motion: { button: el('button'), a: el('a') } };
});

/* Mock theme */
jest.mock('../utils/store/themeContext', () => ({
  useTheme: () => ({
    mode: 'dark',
    setTheme: jest.fn(),
    theme: { colors: { primary: '#000', secondary: '#000', success: '#000', danger: '#000', warning: '#000', info: '#000' } },
  }),
}));

import { Navbar } from '@/components/commons/Navbar';

describe('Navbar', () => {
  it('sign in / up button navigates to /auth', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Navbar />} />
          <Route path="/auth" element={<div>auth page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /sign in \/ up/i }));

    expect(screen.getByText('auth page')).toBeInTheDocument();
  });
});
