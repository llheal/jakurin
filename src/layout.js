/**
 * layout.js — Cylindrical Ring Puzzle Layout
 * Tiles are arranged on a cylinder: each row is an independently rotatable ring.
 * When a vertical column has all identical tiles, that column is eliminated.
 */

import { TILE_TYPE_KEYS } from './tileTextures.js';

// Tile dimensions in world units
export const TILE_W = 1.0;
export const TILE_H = 1.3;
export const TILE_D = 0.4;

// Cylinder parameters
export const CYLINDER_RADIUS = 3.2;
export const COLS = 16;           // tiles per ring (columns around circumference)
export const ROWS = 8;            // number of rings (rows stacked vertically)
export const ANGLE_STEP = (Math.PI * 2) / COLS;

// How many tile types to use (fewer types = easier to align columns)
const NUM_TYPES = 10;

/**
 * Generate cylindrical ring layout
 * All rings are fully filled — no gaps.
 */
export function generateLayout() {
  const tiles = [];
  let id = 0;

  const totalHeight = ROWS * (TILE_H + 0.02);
  const yOffset = -totalHeight / 2;

  // Pick diverse tile types from different suits
  const usedTypes = [
    'MAN_1', 'MAN_5', 'MAN_9',        // Characters (red)
    'PIN_2', 'PIN_6',                   // Circles (colorful)
    'SOU_3', 'SOU_7',                   // Bamboo (green)
    'WIND_E', 'DRAGON_R', 'DRAGON_G',  // Winds & Dragons
  ].slice(0, NUM_TYPES);

  // Build a "row template" — every row has the EXACT same distribution of types.
  // This guarantees every type exists in every row, so column matches are always possible.
  // 10 types × 16 cols → 1 of each type + 6 extras distributed evenly
  function buildRowTypes() {
    const row = [];
    // First: 1 of each type
    for (const t of usedTypes) row.push(t);
    // Fill remaining slots by cycling through the types
    let fillIdx = 0;
    while (row.length < COLS) {
      row.push(usedTypes[fillIdx % usedTypes.length]);
      fillIdx++;
    }
    // Shuffle (Fisher-Yates)
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [row[i], row[j]] = [row[j], row[i]];
    }
    return row;
  }

  for (let row = 0; row < ROWS; row++) {
    const rowTypes = buildRowTypes();
    for (let col = 0; col < COLS; col++) {
      const angle = col * ANGLE_STEP;
      const x = Math.cos(angle) * CYLINDER_RADIUS;
      const z = Math.sin(angle) * CYLINDER_RADIUS;
      const y = yOffset + row * (TILE_H + 0.02);

      tiles.push({
        id: id++,
        typeKey: rowTypes[col],
        row,
        col,
        ringOffset: 0,
        angle,
        radius: CYLINDER_RADIUS,
        x,
        y,
        z,
        removed: false,
        selected: false,
      });
    }
  }

  return tiles;
}

/**
 * Get the effective visual column after ring rotation
 */
export function getVisualCol(tile, ringOffsets) {
  const offset = ringOffsets[tile.row] || 0;
  return ((tile.col + offset) % COLS + COLS) % COLS;
}

/**
 * Get the visual angle for a tile based on its ring's rotation offset
 */
export function getVisualAngle(tile, ringOffsets) {
  const visualCol = getVisualCol(tile, ringOffsets);
  return visualCol * ANGLE_STEP;
}

/**
 * Get world position for a tile based on ring rotation
 */
export function getTileWorldPos(tile, ringOffsets) {
  const angle = getVisualAngle(tile, ringOffsets);
  const totalHeight = ROWS * (TILE_H + 0.02);
  const yOffset = -totalHeight / 2;
  return {
    x: Math.cos(angle) * CYLINDER_RADIUS,
    y: yOffset + tile.row * (TILE_H + 0.06),
    z: Math.sin(angle) * CYLINDER_RADIUS,
    angle,
  };
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
