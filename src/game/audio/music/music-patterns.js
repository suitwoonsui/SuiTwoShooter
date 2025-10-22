// ==========================================
// MUSIC PATTERNS - ALL THEME DEFINITIONS AND PATTERNS
// ==========================================

class MusicPatterns {
  constructor() {
    this.patterns = {
      // THEME 1: ATMOSPHERIC EXPLORATION - Mysterious & Spacious
      theme1Melody: [
        { note: 'D3', duration: 2.0 },
        { note: 'F3', duration: 1.5 },
        { note: 'Bb3', duration: 2.5 },
        { note: 'D4', duration: 1.8 },
        { note: 'Bb3', duration: 1.0 },
        { note: 'F3', duration: 2.2 },
        { note: 'D3', duration: 1.5 },
        { note: 'C3', duration: 2.8 },
        { note: 'Bb2', duration: 1.8 },
        { note: 'D3', duration: 1.2 },
        { note: 'F3', duration: 2.0 },
        { note: 'Bb3', duration: 1.5 },
        { note: 'D4', duration: 2.2 },
        { note: 'Bb3', duration: 1.0 },
        { note: 'F3', duration: 2.5 },
        { note: 'D3', duration: 1.8 }
      ],
      
      theme1Bass: [
        { note: 'D1', duration: 4.0 },
        { note: 'Bb1', duration: 3.5 },
        { note: 'F2', duration: 4.5 },
        { note: 'D1', duration: 3.8 }
      ],
      
      theme1Harmony: [
        { note: 'F3', duration: 2.5 },
        { note: 'Bb3', duration: 2.0 },
        { note: 'D4', duration: 3.0 },
        { note: 'Bb3', duration: 2.2 },
        { note: 'F3', duration: 2.8 },
        { note: 'D4', duration: 2.0 },
        { note: 'F3', duration: 3.2 },
        { note: 'Bb3', duration: 1.5 }
      ],
      
      // Default patterns (used by Theme 1, but will be preserved)
      melody: [
        { note: 'D3', duration: 2.0 },
        { note: 'F3', duration: 1.5 },
        { note: 'Bb3', duration: 2.5 },
        { note: 'D4', duration: 1.8 },
        { note: 'Bb3', duration: 1.0 },
        { note: 'F3', duration: 2.2 },
        { note: 'D3', duration: 1.5 },
        { note: 'C3', duration: 2.8 },
        { note: 'Bb2', duration: 1.8 },
        { note: 'D3', duration: 1.2 },
        { note: 'F3', duration: 2.0 },
        { note: 'Bb3', duration: 1.5 },
        { note: 'D4', duration: 2.2 },
        { note: 'Bb3', duration: 1.0 },
        { note: 'F3', duration: 2.5 },
        { note: 'D3', duration: 1.8 }
      ],
      
      bass: [
        { note: 'D1', duration: 4.0 },
        { note: 'Bb1', duration: 3.5 },
        { note: 'F2', duration: 4.5 },
        { note: 'D1', duration: 3.8 }
      ],
      
      harmony: [
        { note: 'F3', duration: 2.5 },
        { note: 'Bb3', duration: 2.0 },
        { note: 'D4', duration: 3.0 },
        { note: 'Bb3', duration: 2.2 },
        { note: 'F3', duration: 2.8 },
        { note: 'D4', duration: 2.0 },
        { note: 'F3', duration: 3.2 },
        { note: 'Bb3', duration: 1.5 }
      ],
      
      // THEME 2: DRIVING ACTION - Rhythmic & Energetic
      theme2Melody: [
        { note: 'E4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'B4', duration: 0.4 },
        { note: 'E5', duration: 0.2 },
        { note: 'B4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'E4', duration: 0.2 },
        { note: 'D4', duration: 0.3 },
        { note: 'E4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'B4', duration: 0.4 },
        { note: 'D5', duration: 0.2 },
        { note: 'B4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'E4', duration: 0.2 },
        { note: 'D4', duration: 0.3 }
      ],
      theme2Bass: [
        { note: 'E2', duration: 0.4 },
        { note: 'E2', duration: 0.4 },
        { note: 'A2', duration: 0.4 },
        { note: 'A2', duration: 0.4 },
        { note: 'B2', duration: 0.4 },
        { note: 'B2', duration: 0.4 },
        { note: 'E2', duration: 0.4 },
        { note: 'E2', duration: 0.4 }
      ],
      theme2Harmony: [
        { note: 'G3', duration: 0.4 },
        { note: 'B3', duration: 0.4 },
        { note: 'E4', duration: 0.4 },
        { note: 'G3', duration: 0.4 },
        { note: 'A3', duration: 0.4 },
        { note: 'C4', duration: 0.4 },
        { note: 'E4', duration: 0.4 },
        { note: 'A3', duration: 0.4 }
      ],
      
      // THEME 3: MINIMALIST TENSION - Sparse & Unsettling
      theme3Melody: [
        { note: 'E3', duration: 2.0 },
        { note: 'A3', duration: 3.0 },
        { note: 'C4', duration: 1.5 },
        { note: 'G3', duration: 2.5 },
        { note: 'D3', duration: 3.5 },
        { note: 'E3', duration: 1.0 },
        { note: 'Bb3', duration: 2.8 },
        { note: 'C3', duration: 2.2 }
      ],
      theme3Bass: [
        { note: 'E1', duration: 4.0 },
        { note: 'A1', duration: 6.0 },
        { note: 'C2', duration: 5.0 },
        { note: 'E1', duration: 4.5 }
      ],
      theme3Harmony: [
        { note: 'G3', duration: 3.0 },
        { note: 'Bb3', duration: 4.0 },
        { note: 'D4', duration: 2.5 },
        { note: 'F3', duration: 3.5 }
      ],
      
      // THEME 4: RETRO SCI-FI - Classic Space Game Feel
      theme4Melody: [
        { note: 'C4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'G4', duration: 0.3 },
        { note: 'C5', duration: 0.3 },
        { note: 'G4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'C4', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'C4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'G4', duration: 0.3 },
        { note: 'A4', duration: 0.3 },
        { note: 'G4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'C4', duration: 0.3 },
        { note: 'A3', duration: 0.3 }
      ],
      theme4Bass: [
        { note: 'C2', duration: 0.6 },
        { note: 'C2', duration: 0.6 },
        { note: 'F2', duration: 0.6 },
        { note: 'F2', duration: 0.6 },
        { note: 'G2', duration: 0.6 },
        { note: 'G2', duration: 0.6 },
        { note: 'C2', duration: 0.6 },
        { note: 'C2', duration: 0.6 }
      ],
      theme4Harmony: [
        { note: 'E4', duration: 0.6 },
        { note: 'G4', duration: 0.6 },
        { note: 'C5', duration: 0.6 },
        { note: 'E4', duration: 0.6 },
        { note: 'F4', duration: 0.6 },
        { note: 'A4', duration: 0.6 },
        { note: 'C5', duration: 0.6 },
        { note: 'F4', duration: 0.6 }
      ],

      // THEME 5: ACTION PACKED - Fast, Intense, Adrenaline
      theme5Melody: [
        { note: 'E4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'A4', duration: 0.2 },
        { note: 'C5', duration: 0.2 },
        { note: 'A4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'E4', duration: 0.2 },
        { note: 'D4', duration: 0.2 },
        { note: 'C4', duration: 0.2 },
        { note: 'E4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'A4', duration: 0.2 },
        { note: 'C5', duration: 0.2 },
        { note: 'A4', duration: 0.2 },
        { note: 'G4', duration: 0.2 },
        { note: 'E4', duration: 0.2 },
        { note: 'D4', duration: 0.2 }
      ],
      theme5Bass: [
        { note: 'E1', duration: 0.4 },
        { note: 'E1', duration: 0.4 },
        { note: 'A1', duration: 0.4 },
        { note: 'A1', duration: 0.4 },
        { note: 'C2', duration: 0.4 },
        { note: 'C2', duration: 0.4 },
        { note: 'E1', duration: 0.4 },
        { note: 'E1', duration: 0.4 },
        { note: 'A1', duration: 0.4 },
        { note: 'A1', duration: 0.4 },
        { note: 'C2', duration: 0.4 },
        { note: 'C2', duration: 0.4 },
        { note: 'E1', duration: 0.4 },
        { note: 'E1', duration: 0.4 },
        { note: 'A1', duration: 0.4 },
        { note: 'A1', duration: 0.4 }
      ],
      theme5Harmony: [
        { note: 'G3', duration: 0.4 },
        { note: 'B3', duration: 0.4 },
        { note: 'E4', duration: 0.4 },
        { note: 'G3', duration: 0.4 },
        { note: 'A3', duration: 0.4 },
        { note: 'C4', duration: 0.4 },
        { note: 'E4', duration: 0.4 },
        { note: 'A3', duration: 0.4 },
        { note: 'G3', duration: 0.4 },
        { note: 'B3', duration: 0.4 },
        { note: 'E4', duration: 0.4 },
        { note: 'G3', duration: 0.4 },
        { note: 'A3', duration: 0.4 },
        { note: 'C4', duration: 0.4 },
        { note: 'E4', duration: 0.4 },
        { note: 'A3', duration: 0.4 }
      ],

      // THEME 6: MILITARISTIC - Marching Rhythm, Commanding
      theme6Melody: [
        { note: 'C4', duration: 0.5 },
        { note: 'C4', duration: 0.5 },
        { note: 'E4', duration: 0.5 },
        { note: 'G4', duration: 0.5 },
        { note: 'C5', duration: 0.5 },
        { note: 'G4', duration: 0.5 },
        { note: 'E4', duration: 0.5 },
        { note: 'C4', duration: 0.5 },
        { note: 'A3', duration: 0.5 },
        { note: 'A3', duration: 0.5 },
        { note: 'C4', duration: 0.5 },
        { note: 'E4', duration: 0.5 },
        { note: 'G4', duration: 0.5 },
        { note: 'E4', duration: 0.5 },
        { note: 'C4', duration: 0.5 },
        { note: 'A3', duration: 0.5 }
      ],
      theme6Bass: [
        { note: 'C1', duration: 1.0 },
        { note: 'C1', duration: 1.0 },
        { note: 'F1', duration: 1.0 },
        { note: 'F1', duration: 1.0 },
        { note: 'G1', duration: 1.0 },
        { note: 'G1', duration: 1.0 },
        { note: 'C1', duration: 1.0 },
        { note: 'C1', duration: 1.0 }
      ],
      theme6Harmony: [
        { note: 'E3', duration: 1.0 },
        { note: 'G3', duration: 1.0 },
        { note: 'C4', duration: 1.0 },
        { note: 'E3', duration: 1.0 },
        { note: 'F3', duration: 1.0 },
        { note: 'A3', duration: 1.0 },
        { note: 'C4', duration: 1.0 },
        { note: 'F3', duration: 1.0 }
      ],

      // THEME 7: HIGH ENERGY - Very Fast, Driving, Relentless
      theme7Melody: [
        { note: 'E4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'C5', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'E4', duration: 0.15 },
        { note: 'D4', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'E4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'C5', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'E4', duration: 0.15 },
        { note: 'D4', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'E4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'C5', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'E4', duration: 0.15 },
        { note: 'D4', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'E4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'C5', duration: 0.15 },
        { note: 'A4', duration: 0.15 },
        { note: 'G4', duration: 0.15 }
      ],
      theme7Bass: [
        { note: 'E1', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'A1', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'E1', duration: 0.3 },
        { note: 'E1', duration: 0.3 }
      ],
      theme7Harmony: [
        { note: 'G3', duration: 0.3 },
        { note: 'B3', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'C4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'B3', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'C4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'B3', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'C4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'B3', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'G3', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'C4', duration: 0.3 },
        { note: 'E4', duration: 0.3 },
        { note: 'A3', duration: 0.3 },
        { note: 'G3', duration: 0.3 }
      ],

      // THEME 8: AGGRESSIVE - Heavy, Powerful, Dominating
      theme8Melody: [
        { note: 'E3', duration: 0.25 },
        { note: 'G3', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'C4', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'G3', duration: 0.25 },
        { note: 'E3', duration: 0.25 },
        { note: 'D3', duration: 0.25 },
        { note: 'C3', duration: 0.25 },
        { note: 'E3', duration: 0.25 },
        { note: 'G3', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'C4', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'G3', duration: 0.25 },
        { note: 'E3', duration: 0.25 },
        { note: 'D3', duration: 0.25 },
        { note: 'C3', duration: 0.25 },
        { note: 'E3', duration: 0.25 },
        { note: 'G3', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'C4', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'G3', duration: 0.25 },
        { note: 'E3', duration: 0.25 },
        { note: 'D3', duration: 0.25 },
        { note: 'C3', duration: 0.25 },
        { note: 'E3', duration: 0.25 },
        { note: 'G3', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'C4', duration: 0.25 },
        { note: 'A3', duration: 0.25 },
        { note: 'G3', duration: 0.25 }
      ],
      theme8Bass: [
        { note: 'E0', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'A0', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'C1', duration: 0.5 },
        { note: 'E0', duration: 0.5 },
        { note: 'E0', duration: 0.5 }
      ],
      theme8Harmony: [
        { note: 'G2', duration: 0.5 },
        { note: 'B2', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'G2', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'C3', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'G2', duration: 0.5 },
        { note: 'B2', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'G2', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'C3', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'G2', duration: 0.5 },
        { note: 'B2', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'G2', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'C3', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'G2', duration: 0.5 },
        { note: 'B2', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'G2', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'C3', duration: 0.5 },
        { note: 'E3', duration: 0.5 },
        { note: 'A2', duration: 0.5 },
        { note: 'G2', duration: 0.5 }
      ],
      
      // MENU THEMES - Soothing and Gentle
      
      // THEME 9: GENTLE AMBIENT - Soft, flowing, peaceful
      theme9Melody: [
        { note: 'F4', duration: 1.2 },
        { note: 'A4', duration: 1.0 },
        { note: 'C5', duration: 1.5 },
        { note: 'F5', duration: 1.0 },
        { note: 'C5', duration: 0.8 },
        { note: 'A4', duration: 1.2 },
        { note: 'F4', duration: 1.0 },
        { note: 'E4', duration: 1.5 },
        { note: 'F4', duration: 1.0 },
        { note: 'A4', duration: 1.2 },
        { note: 'C5', duration: 1.0 },
        { note: 'F5', duration: 1.5 },
        { note: 'C5', duration: 1.0 },
        { note: 'A4', duration: 0.8 },
        { note: 'F4', duration: 1.2 },
        { note: 'E4', duration: 1.0 }
      ],
      theme9Bass: [
        { note: 'F2', duration: 2.0 },
        { note: 'C3', duration: 2.0 },
        { note: 'F2', duration: 2.0 },
        { note: 'C3', duration: 2.0 }
      ],
      theme9Harmony: [
        { note: 'A2', duration: 2.0 },
        { note: 'C3', duration: 2.0 },
        { note: 'F3', duration: 2.0 },
        { note: 'A2', duration: 2.0 }
      ],
      
      // THEME 10: PEACEFUL MELODY - Warm, comforting, gentle
      theme10Melody: [
        { note: 'G4', duration: 1.0 },
        { note: 'B4', duration: 0.8 },
        { note: 'D5', duration: 1.2 },
        { note: 'G5', duration: 0.8 },
        { note: 'D5', duration: 1.0 },
        { note: 'B4', duration: 0.8 },
        { note: 'G4', duration: 1.0 },
        { note: 'F4', duration: 1.2 },
        { note: 'G4', duration: 0.8 },
        { note: 'B4', duration: 1.0 },
        { note: 'D5', duration: 0.8 },
        { note: 'G5', duration: 1.2 },
        { note: 'D5', duration: 0.8 },
        { note: 'B4', duration: 1.0 },
        { note: 'G4', duration: 0.8 },
        { note: 'F4', duration: 1.0 }
      ],
      theme10Bass: [
        { note: 'G2', duration: 1.5 },
        { note: 'D3', duration: 1.5 },
        { note: 'G2', duration: 1.5 },
        { note: 'D3', duration: 1.5 }
      ],
      theme10Harmony: [
        { note: 'B2', duration: 1.5 },
        { note: 'D3', duration: 1.5 },
        { note: 'G3', duration: 1.5 },
        { note: 'B2', duration: 1.5 }
      ],
      
      // THEME 11: SOFT HARMONY - Delicate, ethereal, dreamy
      theme11Melody: [
        { note: 'E4', duration: 1.5 },
        { note: 'G4', duration: 1.0 },
        { note: 'B4', duration: 1.8 },
        { note: 'E5', duration: 1.0 },
        { note: 'B4', duration: 1.2 },
        { note: 'G4', duration: 1.0 },
        { note: 'E4', duration: 1.5 },
        { note: 'D4', duration: 1.8 },
        { note: 'E4', duration: 1.0 },
        { note: 'G4', duration: 1.2 },
        { note: 'B4', duration: 1.0 },
        { note: 'E5', duration: 1.8 },
        { note: 'B4', duration: 1.0 },
        { note: 'G4', duration: 1.2 },
        { note: 'E4', duration: 1.0 },
        { note: 'D4', duration: 1.5 }
      ],
      theme11Bass: [
        { note: 'E2', duration: 2.5 },
        { note: 'B2', duration: 2.5 },
        { note: 'E2', duration: 2.5 },
        { note: 'B2', duration: 2.5 }
      ],
      theme11Harmony: [
        { note: 'G2', duration: 2.5 },
        { note: 'B2', duration: 2.5 },
        { note: 'E3', duration: 2.5 },
        { note: 'G2', duration: 2.5 }
      ],
      
      // THEME 12: TRANQUIL SPACE - Mysterious, floating, serene
      theme12Melody: [
        { note: 'D4', duration: 1.8 },
        { note: 'F4', duration: 1.2 },
        { note: 'Bb4', duration: 2.0 },
        { note: 'D5', duration: 1.2 },
        { note: 'Bb4', duration: 1.5 },
        { note: 'F4', duration: 1.2 },
        { note: 'D4', duration: 1.8 },
        { note: 'C4', duration: 2.0 },
        { note: 'D4', duration: 1.2 },
        { note: 'F4', duration: 1.5 },
        { note: 'Bb4', duration: 1.2 },
        { note: 'D5', duration: 2.0 },
        { note: 'Bb4', duration: 1.2 },
        { note: 'F4', duration: 1.5 },
        { note: 'D4', duration: 1.2 },
        { note: 'C4', duration: 1.8 }
      ],
      theme12Bass: [
        { note: 'D2', duration: 3.0 },
        { note: 'Bb2', duration: 3.0 },
        { note: 'D2', duration: 3.0 },
        { note: 'Bb2', duration: 3.0 }
      ],
      theme12Harmony: [
        { note: 'F3', duration: 3.0 },
        { note: 'Bb3', duration: 3.0 },
        { note: 'D4', duration: 3.0 },
        { note: 'F3', duration: 3.0 }
      ],
      
      // BOSS MUSIC PATTERNS
      bossMelody: [
        { note: 'F3', duration: 0.15 },
        { note: 'G3', duration: 0.15 },
        { note: 'Bb3', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'Bb3', duration: 0.15 },
        { note: 'G3', duration: 0.15 },
        { note: 'F3', duration: 0.15 },
        { note: 'Eb3', duration: 0.15 },
        { note: 'D3', duration: 0.15 },
        { note: 'C3', duration: 0.15 },
        { note: 'Bb2', duration: 0.15 },
        { note: 'C3', duration: 0.15 },
        { note: 'D3', duration: 0.15 },
        { note: 'Eb3', duration: 0.15 },
        { note: 'F3', duration: 0.15 },
        { note: 'G3', duration: 0.15 }
      ],
      
      // Boss bass - deep, ominous (Raised One Octave)
      bossBass: [
        { note: 'F1', duration: 0.3 },
        { note: 'F1', duration: 0.3 },
        { note: 'Bb1', duration: 0.3 },
        { note: 'Bb1', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'C2', duration: 0.3 },
        { note: 'F1', duration: 0.3 },
        { note: 'F1', duration: 0.3 }
      ],
      
      // Boss harmony - dissonant, threatening (Raised One Octave)
      bossHarmony: [
        { note: 'Ab3', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'Eb4', duration: 0.15 },
        { note: 'Ab3', duration: 0.15 },
        { note: 'Bb3', duration: 0.15 },
        { note: 'D4', duration: 0.15 },
        { note: 'F4', duration: 0.15 },
        { note: 'Bb3', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'Eb4', duration: 0.15 },
        { note: 'G4', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'Ab3', duration: 0.15 },
        { note: 'C4', duration: 0.15 },
        { note: 'Eb4', duration: 0.15 },
        { note: 'Ab3', duration: 0.15 }
      ]
    };
  }
  
  // Get theme patterns by theme number
  getTheme(themeNumber) {
    const themeMap = {
      1: { melody: 'theme1Melody', bass: 'theme1Bass', harmony: 'theme1Harmony' },
      2: { melody: 'theme2Melody', bass: 'theme2Bass', harmony: 'theme2Harmony' },
      3: { melody: 'theme3Melody', bass: 'theme3Bass', harmony: 'theme3Harmony' },
      4: { melody: 'theme4Melody', bass: 'theme4Bass', harmony: 'theme4Harmony' },
      5: { melody: 'theme5Melody', bass: 'theme5Bass', harmony: 'theme5Harmony' },
      6: { melody: 'theme6Melody', bass: 'theme6Bass', harmony: 'theme6Harmony' },
      7: { melody: 'theme7Melody', bass: 'theme7Bass', harmony: 'theme7Harmony' },
      8: { melody: 'theme8Melody', bass: 'theme8Bass', harmony: 'theme8Harmony' },
      9: { melody: 'theme9Melody', bass: 'theme9Bass', harmony: 'theme9Harmony' },
      10: { melody: 'theme10Melody', bass: 'theme10Bass', harmony: 'theme10Harmony' },
      11: { melody: 'theme11Melody', bass: 'theme11Bass', harmony: 'theme11Harmony' },
      12: { melody: 'theme12Melody', bass: 'theme12Bass', harmony: 'theme12Harmony' }
    };
    
    return themeMap[themeNumber];
  }
  
  // Get pattern by name
  getPattern(patternName) {
    return this.patterns[patternName];
  }
  
  // Convert note name to frequency
  noteToFrequency(note) {
    const notes = {
      // Low octaves (boss music)
      'F0': 21.83, 'Bb0': 29.14, 'C1': 32.70, 'D1': 36.71, 'Eb1': 38.89, 'F1': 43.65, 'G1': 49.00, 'Bb1': 58.27, 'C2': 65.41, 'D2': 73.42, 'Eb2': 77.78, 'F2': 87.31, 'G2': 98.00, 'Ab2': 103.83, 'Bb2': 116.54,
      // Mid octaves
      'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'F3': 174.61, 'G3': 196.00, 'Ab3': 207.65, 'Bb3': 233.08,
      // Standard octaves
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
      'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25,
      'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99
    };
    return notes[note] || 440;
  }
}
