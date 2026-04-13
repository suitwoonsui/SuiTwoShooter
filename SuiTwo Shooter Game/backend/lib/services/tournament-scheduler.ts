export class TournamentScheduler {
  static scheduleDistribution(
    _tournamentId: string,
    _objectId: string,
    _endTimeMs: number,
    _name?: string
  ) {
    // No-op in serverless by default. Real scheduling should be done via platform jobs/cron.
  }
}

