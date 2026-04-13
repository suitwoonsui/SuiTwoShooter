/**
 * Compatibility shim.
 *
 * Rewards are executed via platform services in this architecture.
 */
export function getRewardsService() {
  return {
    async calculateTournamentRewards(
      _prizePoolUsdCents: number,
      _entries: Array<Record<string, unknown>>
    ) {
      return [];
    },
    async distributeRewardsForTournament(_tournamentId: number) {
      return { success: false, error: 'Rewards service not implemented in this deployment' as const, digest: undefined as string | undefined };
    },

    async distributeTournamentRewards(_tournamentId: number, _distributions: unknown[]) {
      return { success: false, error: 'Rewards service not implemented in this deployment' as const, digest: undefined as string | undefined };
    },
  };
}

