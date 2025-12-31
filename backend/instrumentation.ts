// ==========================================
// NEXT.JS INSTRUMENTATION
// ==========================================
// This file is automatically loaded by Next.js on server startup
// Used to initialize background services like the tournament scheduler

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 [INSTRUMENTATION] Initializing server-side services...');

    // Initialize tournament scheduler
    try {
      const { TournamentScheduler } = await import('./lib/services/tournament-scheduler');
      
      // Small delay to ensure other services are ready
      setTimeout(async () => {
        await TournamentScheduler.initialize();
        console.log('✅ [INSTRUMENTATION] Tournament scheduler initialized');
      }, 5000); // 5 second delay for server startup
    } catch (error) {
      console.error('❌ [INSTRUMENTATION] Failed to initialize tournament scheduler:', error);
    }
  }
}
