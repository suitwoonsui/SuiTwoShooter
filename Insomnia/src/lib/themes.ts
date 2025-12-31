export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent1: string;
    accent2: string;
    accent3: string;
    text: string;
    textSecondary: string;
    background: string;
    backgroundSecondary: string;
    border: string;
    borderHover: string;
    shadow: string;
    glow: string;
  };
  effects: {
    glowIntensity: number;
    animationSpeed: number;
    backgroundPattern: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    description: 'High energy, addictive, gaming at 3 AM',
    colors: {
      primary: '#0a0a0f',
      secondary: '#1a1b2e',
      accent1: '#00ff9d',
      accent2: '#ff0080',
      accent3: '#ffff00',
      text: '#ffffff',
      textSecondary: '#94a3b8',
      background: '#0a0a0f',
      backgroundSecondary: '#1a1b2e',
      border: '#2d3748',
      borderHover: '#4a5568',
      shadow: 'rgba(0, 255, 157, 0.3)',
      glow: 'rgba(0, 255, 157, 0.6)'
    },
    effects: {
      glowIntensity: 0.8,
      animationSpeed: 1.2,
      backgroundPattern: 'grid'
    }
  },
  {
    id: 'aurora-nights',
    name: 'Aurora Nights',
    description: 'Calming, focused, late-night study session',
    colors: {
      primary: '#0a0a0f',
      secondary: '#0f1a1a',
      accent1: '#4ade80',
      accent2: '#ff6b6b',
      accent3: '#a78bfa',
      text: '#ffffff',
      textSecondary: '#94a3b8',
      background: '#0a0a0f',
      backgroundSecondary: '#0f1a1a',
      border: '#1e3a3a',
      borderHover: '#2d5a5a',
      shadow: 'rgba(74, 222, 128, 0.3)',
      glow: 'rgba(74, 222, 128, 0.5)'
    },
    effects: {
      glowIntensity: 0.5,
      animationSpeed: 0.8,
      backgroundPattern: 'aurora'
    }
  },
  {
    id: 'neon-sunset',
    name: 'Neon Sunset',
    description: 'Warm, inviting, cozy late-night gaming',
    colors: {
      primary: '#0a0a0f',
      secondary: '#1a0a1a',
      accent1: '#ff6b35',
      accent2: '#ff006e',
      accent3: '#39ff14',
      text: '#ffffff',
      textSecondary: '#94a3b8',
      background: '#0a0a0f',
      backgroundSecondary: '#1a0a1a',
      border: '#3a1a1a',
      borderHover: '#5a2a2a',
      shadow: 'rgba(255, 107, 53, 0.3)',
      glow: 'rgba(255, 107, 53, 0.6)'
    },
    effects: {
      glowIntensity: 0.7,
      animationSpeed: 1.0,
      backgroundPattern: 'sunset'
    }
  },
  {
    id: 'cyber-dawn',
    name: 'Cyber Dawn',
    description: 'Futuristic, mysterious, sci-fi late night',
    colors: {
      primary: '#0a0a0f',
      secondary: '#0a1a2e',
      accent1: '#00d4d4',
      accent2: '#8b5cf6',
      accent3: '#3b82f6',
      text: '#ffffff',
      textSecondary: '#94a3b8',
      background: '#0a0a0f',
      backgroundSecondary: '#0a1a2e',
      border: '#1a2a4a',
      borderHover: '#2a3a5a',
      shadow: 'rgba(0, 212, 212, 0.3)',
      glow: 'rgba(0, 212, 212, 0.6)'
    },
    effects: {
      glowIntensity: 0.6,
      animationSpeed: 1.1,
      backgroundPattern: 'cyber'
    }
  }
];

export const defaultTheme = themes[0]; // Midnight Neon
