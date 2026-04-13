import { getTournamentService as baseGetTournamentService } from '@/lib/services/tournament/core/tournament-service';

export function getTournamentService() {
  const svc: any = baseGetTournamentService() as any;

  if (typeof svc.updateTournamentScore !== 'function') {
    svc.updateTournamentScore = async (..._args: any[]) => {
      return { success: false, error: 'updateTournamentScore not implemented in this deployment' as const };
    };
  }

  return svc;
}

