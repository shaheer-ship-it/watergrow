export interface PlantRecord {
  room_id: string;
  p1_water: number;
  p2_water: number;
}

export type UserRole = 'p1' | 'p2';

export type AppView = 'ONBOARDING' | 'JOIN' | 'ROLE' | 'GAME';