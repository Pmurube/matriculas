import type { GameMode } from './config.ts';
import type { GameSummary } from './engine.ts';

/** Catálogo de insignias (SPEC §12). Los mismos slugs se siembran en supabase/seed.sql. */
export type AchievementId =
  | 'primera_marcha'
  | 'sin_calarse'
  | 'larga_distancia'
  | 'hora_punta'
  | 'sin_gps'
  | 'matricula_de_honor'
  | 'coleccionista'
  | 'campeon_diario_contrarreloj'
  | 'campeon_mensual_contrarreloj'
  | 'campeon_diario_clasico'
  | 'campeon_historico_clasico';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  kind: 'progress' | 'competitive';
  icon: string;
}

export const DEFAULT_HONOR_THRESHOLD = 100;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primera_marcha', name: 'Primera marcha', description: 'Completa tu primera partida.', kind: 'progress', icon: '1ª' },
  { id: 'sin_calarse', name: 'Sin calarse', description: '10 aciertos consecutivos.', kind: 'progress', icon: '10' },
  { id: 'larga_distancia', name: 'Larga distancia', description: 'Una palabra de 10 letras o más.', kind: 'progress', icon: '↔' },
  { id: 'hora_punta', name: 'Hora punta', description: 'Resuelve 15 matrículas en Contrarreloj.', kind: 'progress', icon: '15' },
  { id: 'sin_gps', name: 'Sin GPS', description: 'Completa Clásico sin pasar.', kind: 'progress', icon: '⌖' },
  { id: 'matricula_de_honor', name: 'Matrícula de honor', description: 'Supera el umbral de puntos configurado.', kind: 'progress', icon: '★' },
  { id: 'coleccionista', name: 'Coleccionista', description: 'Usa A, E, I, O y U en una misma palabra.', kind: 'progress', icon: 'AEIOU' },
  { id: 'campeon_diario_contrarreloj', name: 'Campeón diario Contrarreloj', description: 'Nº 1 del día en Contrarreloj.', kind: 'competitive', icon: 'D' },
  { id: 'campeon_mensual_contrarreloj', name: 'Campeón mensual Contrarreloj', description: 'Nº 1 del mes en Contrarreloj.', kind: 'competitive', icon: 'M' },
  { id: 'campeon_diario_clasico', name: 'Campeón diario Clásico', description: 'Nº 1 del día en Clásico.', kind: 'competitive', icon: 'D' },
  { id: 'campeon_historico_clasico', name: 'Campeón histórico Clásico', description: 'Nº 1 histórico en Clásico.', kind: 'competitive', icon: 'H' },
];

/** Insignias de progreso que se desbloquean con una partida concreta (cliente y servidor). */
export function evaluateGameAchievements(
  mode: GameMode,
  s: GameSummary,
  honorThreshold: number = DEFAULT_HONOR_THRESHOLD,
): AchievementId[] {
  const out: AchievementId[] = ['primera_marcha'];
  if (s.bestCombo >= 10) out.push('sin_calarse');
  if (s.longestWordLength >= 10) out.push('larga_distancia');
  if (mode === 'contrarreloj' && s.solved >= 15) out.push('hora_punta');
  if (mode === 'clasico' && s.passed === 0 && s.solved === 10) out.push('sin_gps');
  if (s.score > honorThreshold) out.push('matricula_de_honor');
  if (s.hasAllVowelsWord) out.push('coleccionista');
  return out;
}
