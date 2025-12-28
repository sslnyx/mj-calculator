
// Basic Mahjong Scoring Utilities

export type Wind = 'East' | 'South' | 'West' | 'North';

export interface Player {
  id: number;
  name: string;
  score: number;
  wind: Wind;
  avatarColor: string;
}

export interface HandRecord {
  id: string;
  round: string; // e.g., "East 1"
  winnerId: number;
  loserId?: number | null; // null if Tsumo
  type: 'Ron' | 'Tsumo' | 'Draw';
  han: number;
  fu: number;
  points: number; // The base points or payment amount
  timestamp: number;
}

// Simplified scoring table (Han/Fu -> Base Points)
// This is a rough approximation for the demo.
export const calculatePoints = (han: number, fu: number, isDealer: boolean, type: 'Ron' | 'Tsumo'): number => {
  // Basic Mangan+ logic
  let basicPoints = 0;
  
  if (han >= 13) basicPoints = 8000; // Yakuman
  else if (han >= 11) basicPoints = 6000; // Sanbaiman
  else if (han >= 8) basicPoints = 4000; // Baiman
  else if (han >= 6) basicPoints = 3000; // Haneman
  else if (han >= 5) basicPoints = 2000; // Mangan
  else {
    // Normal calculation: fu * 2^(2+han)
    // Capped at 2000 (Mangan)
    basicPoints = fu * Math.pow(2, 2 + han);
    if (basicPoints > 2000) basicPoints = 2000;
  }

  // Adjust for Dealer/Non-Dealer
  // This usually returns the "payment" amount from others
  // For simplicity in this demo, we'll return the total win value
  if (type === 'Ron') {
    return isDealer ? Math.ceil(basicPoints * 6 / 100) * 100 : Math.ceil(basicPoints * 4 / 100) * 100;
  } else {
    // Tsumo total value
    return isDealer ? Math.ceil(basicPoints * 6 / 100) * 100 : Math.ceil(basicPoints * 4 / 100) * 100;
  }
};

export const WINDS: Wind[] = ['East', 'South', 'West', 'North'];

export const PLAYER_COLORS = [
  '#FF0055', // Neon Red/Pink
  '#00CCFF', // Cyan
  '#FFDD00', // Yellow
  '#33FF33', // Green
];

