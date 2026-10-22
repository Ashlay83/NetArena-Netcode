// packages/shared/src/config.ts

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GAME_CONFIG = {
  // Arena Dimensions
  arenaWidth: 1200,
  arenaHeight: 800,

  // Player Settings
  playerRadius: 16,
  playerMaxSpeed: 220, // World units per second
  playerMaxHealth: 100,
  respawnTimeSeconds: 3,
  invulnerabilitySeconds: 1.5,

  // Weapon Settings (Hitscan)
  weaponRange: 700,
  weaponCooldownSeconds: 0.4,
  weaponDamage: 25,

  // Match Limits
  targetKills: 20,
  maxMatchDurationSeconds: 300,

  // Simulation Timestep
  tickRate: 60,
  fixedDt: 1 / 60,

  // Static Obstacles (6-10 layout)
  obstacles: [
    { id: 'obs-1', x: 200, y: 150, width: 100, height: 200 },
    { id: 'obs-2', x: 900, y: 150, width: 100, height: 200 },
    { id: 'obs-3', x: 500, y: 350, width: 200, height: 100 },
    { id: 'obs-4', x: 200, y: 500, width: 100, height: 150 },
    { id: 'obs-5', x: 900, y: 500, width: 100, height: 150 },
    { id: 'obs-6', x: 550, y: 100, width: 100, height: 100 },
  ] as Obstacle[],

  // Default Spawn Points
  spawnPoints: [
    { x: 100, y: 100 },
    { x: 1100, y: 100 },
    { x: 100, y: 700 },
    { x: 1100, y: 700 },
  ],
} as const;