const XP_PER_LEVEL = 100;

export function xpToLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number): number {
  const xpInLevel = xp % XP_PER_LEVEL;
  return Math.round((xpInLevel / XP_PER_LEVEL) * 100);
}

export function xpForNextLevel(xp: number): number {
  const xpInLevel = xp % XP_PER_LEVEL;
  return XP_PER_LEVEL - xpInLevel;
}
