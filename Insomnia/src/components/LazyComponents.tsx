'use client';

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// Lazy-loaded components for better performance
export const LazyLeaderboard = lazy(() => 
  import('./Leaderboard').then(module => ({ default: module.Leaderboard }))
);

export const LazyGamePassPurchase = lazy(() => 
  import('./GamePassPurchase').then(module => ({ default: module.GamePassPurchase }))
);

export const LazyGameOverModal = lazy(() => 
  import('./GameOverModal').then(module => ({ default: module.GameOverModal }))
);

// Lazy-loaded modal components
export const LazyProfileModal = lazy(() => 
  import('./modals/ProfileModal').then(module => ({ default: module.ProfileModal }))
);

export const LazyStatisticsModal = lazy(() => 
  import('./modals/StatisticsModal').then(module => ({ default: module.StatisticsModal }))
);

export const LazyLeaderboardModal = lazy(() => 
  import('./modals/LeaderboardModal').then(module => ({ default: module.LeaderboardModal }))
);

export const LazySettingsModal = lazy(() => 
  import('./modals/SettingsModal').then(module => ({ default: module.SettingsModal }))
);

// Wrapper components with Suspense
export const LeaderboardWithSuspense: React.FC<React.ComponentProps<typeof LazyLeaderboard>> = (props) => (
  <Suspense fallback={<LoadingSpinner size="md" text="Loading leaderboard..." />}>
    <LazyLeaderboard {...props} />
  </Suspense>
);

export const GamePassPurchaseWithSuspense: React.FC<React.ComponentProps<typeof LazyGamePassPurchase>> = (props) => (
  <Suspense fallback={<LoadingSpinner size="sm" text="Loading..." />}>
    <LazyGamePassPurchase {...props} />
  </Suspense>
);

export const GameOverModalWithSuspense: React.FC<React.ComponentProps<typeof LazyGameOverModal>> = (props) => (
  <Suspense fallback={<LoadingSpinner size="lg" text="Loading..." />}>
    <LazyGameOverModal {...props} />
  </Suspense>
);

// Modal wrapper components with Suspense
export const ProfileModalWithSuspense: React.FC<React.ComponentProps<typeof LazyProfileModal>> = (props) => (
  <Suspense fallback={<LoadingSpinner size="md" text="Loading profile..." />}>
    <LazyProfileModal {...props} />
  </Suspense>
);

export const StatisticsModalWithSuspense: React.FC<React.ComponentProps<typeof LazyStatisticsModal>> = (props) => (
  <Suspense fallback={<LoadingSpinner size="md" text="Loading statistics..." />}>
    <LazyStatisticsModal {...props} />
  </Suspense>
);

export const LeaderboardModalWithSuspense: React.FC<React.ComponentProps<typeof LazyLeaderboardModal>> = (props) => (
  <Suspense fallback={<LoadingSpinner size="md" text="Loading leaderboard..." />}>
    <LazyLeaderboardModal {...props} />
  </Suspense>
);

export const SettingsModalWithSuspense: React.FC<React.ComponentProps<typeof LazySettingsModal>> = (props) => (
  <Suspense fallback={<LoadingSpinner size="sm" text="Loading settings..." />}>
    <LazySettingsModal {...props} />
  </Suspense>
);
