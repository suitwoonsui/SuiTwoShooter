/**
 * Compatibility shim.
 *
 * The platform now owns game-pass flows; this keeps legacy routes compiling.
 */
export function getGamePassService() {
  return {
    async hasValidPass(_address: string): Promise<boolean> {
      return true;
    },

    async getAvailableTicketIds(_address: string): Promise<{ success: boolean; ticketIds?: number[]; error?: string }> {
      return { success: true, ticketIds: [] };
    },

    async getGamePassStatus(_address: string): Promise<{ success: boolean; hasPass?: boolean; ticketCount?: number; error?: string }> {
      return { success: true, hasPass: true, ticketCount: 0 };
    },
  };
}

