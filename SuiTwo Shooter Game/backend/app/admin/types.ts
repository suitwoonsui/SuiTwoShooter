// ==========================================
// Admin Page Types
// ==========================================

export type Tab =
  | 'items'
  | 'badges'
  | 'insignia'
  | 'migration'
  | 'tournaments'
  | 'milestones'
  | 'stats'
  | 'game-pass'
  | 'game-config'
  | 'vaults'
  | 'stockroom'
  | 'sound-test';
export type MigrationSubType = 'inventory' | 'stats' | 'game-pass' | 'tournament' | 'milestones';
export type TournamentWizardStep = 'name' | 'category' | 'schedule' | 'entry' | 'rewards' | 'review';

export interface AdminStyles {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgSuccess: string;
  bgError: string;
  bgWarning: string;
  bgInfo: string;
  text: string;
  textSecondary: string;
  textError: string;
  textSuccess: string;
  border: string;
  borderSuccess: string;
  borderError: string;
  buttonPrimary: string;
  buttonDisabled: string;
  buttonSuccess: string;
  buttonDanger: string;
  inputBg: string;
  success: string;
  danger: string;
  heading: string;
  /** For native date/time inputs: 'dark' makes calendar/clock icons light in dark mode */
  colorScheme?: 'light' | 'dark';
  button: {
    padding: string;
    backgroundColor: string;
    color: string;
    border: string;
    borderRadius: string;
    cursor: string;
    fontWeight: string;
    fontSize: string;
  };
}

