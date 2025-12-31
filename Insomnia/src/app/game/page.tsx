import React, { Suspense } from 'react';
import { GamePageClient } from './GamePageClient';

export default function GamePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading game...</p>
        </div>
      </main>
    }>
      <GamePageClient />
    </Suspense>
  );
}




