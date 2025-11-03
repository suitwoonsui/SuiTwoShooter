'use client';

import React from 'react';
import { Palette } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  return (
    <button className="p-2 rounded-lg bg-[var(--color-background)] hover:bg-[var(--color-background)]/80 transition-colors">
      <Palette className="w-4 h-4 text-[var(--color-text-secondary)]" />
    </button>
  );
};