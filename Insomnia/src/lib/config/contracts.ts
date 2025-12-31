/**
 * Smart contract configuration for Insomnia Game
 * Centralized contract addresses and module information
 */

export interface ContractConfig {
  packageId: string;
  modules: {
    gameCore: string;
    scoreSystem: string;
    adminSystem: string;
    gamePass: string;
  };
  systemIds: {
    scoreSystem: string;
    adminSystem: string;
    gamePassSystem: string;
    clock: string;
  };
  gameOwnerAddress: string;
}

// Environment-based contract configuration
export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || '0x63c1384f291b8c7ecf69f08a8d41d8fdfa37c490619de7cae107f446cb78a6fb',
  modules: {
    gameCore: 'game_core',
    scoreSystem: 'score_system',
    adminSystem: 'admin_system',
    gamePass: 'game_pass'
  },
  systemIds: {
    scoreSystem: process.env.NEXT_PUBLIC_SCORE_SYSTEM_ID || '0xf829db9e54b991e8774a082d6313f59378b4ed8b75436c72579514e1fdb51cb3',
    adminSystem: process.env.NEXT_PUBLIC_ADMIN_SYSTEM_ID || '0x0b39e540b65f7e19451374f3057b2de7bf670fe4c7e4daab51c15dbee072a985',
    gamePassSystem: process.env.NEXT_PUBLIC_GAME_PASS_SYSTEM_ID || '0xc92f65c25693faa9dfdf7867f28b33f8cbef98952a12ffd833c03bdd7000e807',
    clock: process.env.NEXT_PUBLIC_CLOCK_ID || '0x6'
  },
  gameOwnerAddress: process.env.NEXT_PUBLIC_GAME_OWNER_ADDRESS || '0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02'
};

export function getContractConfig(): ContractConfig {
  return DEFAULT_CONTRACT_CONFIG;
}

export function getPackageId(): string {
  return DEFAULT_CONTRACT_CONFIG.packageId;
}

export function getModuleName(module: keyof ContractConfig['modules']): string {
  return DEFAULT_CONTRACT_CONFIG.modules[module];
}

export function getSystemId(system: keyof ContractConfig['systemIds']): string {
  return DEFAULT_CONTRACT_CONFIG.systemIds[system];
}

export function getGameOwnerAddress(): string {
  return DEFAULT_CONTRACT_CONFIG.gameOwnerAddress;
}
