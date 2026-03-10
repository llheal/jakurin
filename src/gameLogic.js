/**
 * gameLogic.js — Cylindrical Ring Rotation Puzzle
 * 
 * Mechanic:
 *  - Player swipes to rotate individual rings (horizontal rows) around the cylinder
 *  - When a vertical column has all tiles of the same type, that column is eliminated
 *  - Goal: eliminate all tiles (or as many as possible)
 */

import { COLS, ROWS, getVisualCol } from './layout.js';
import { TILE_TYPE_KEYS } from './tileTextures.js';

export class GameState {
  constructor() {
    this.tiles = [];
    this.ringOffsets = [];    // per-row rotation offset (integer column units)
    this.ringAngles = [];     // per-row smooth rotation angle (for animation)
    this.moveCount = 0;
    this.score = 0;
    this.startTime = 0;
    this.elapsed = 0;
    this.isRunning = false;
    this.totalTiles = 0;

    // Callbacks
    this.onColumnMatch = null;   // callback(colIndex, matchedTiles)
    this.onRingRotate = null;    // callback(rowIndex, newOffset)
    this.onWin = null;           // callback(stats)
    this.onScoreUpdate = null;   // callback(score)
  }

  init(tiles) {
    this.tiles = tiles;
    this.totalTiles = tiles.length;
    this.ringOffsets = new Array(ROWS).fill(0);
    this.ringAngles = new Array(ROWS).fill(0);
    this.moveCount = 0;
    this.score = 0;
    this.startTime = performance.now();
    this.elapsed = 0;
    this.isRunning = true;
  }

  update() {
    if (this.isRunning) {
      this.elapsed = performance.now() - this.startTime;
    }
  }

  getTimeString() {
    const totalSec = Math.floor(this.elapsed / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  getRemainingCount() {
    return this.tiles.filter(t => !t.removed).length;
  }

  /**
   * Rotate a ring by a number of column steps
   * @param {number} rowIndex - which ring to rotate
   * @param {number} steps - +1 = clockwise, -1 = counter-clockwise
   */
  rotateRing(rowIndex, steps) {
    if (!this.isRunning) return;
    if (rowIndex < 0 || rowIndex >= ROWS) return;

    this.ringOffsets[rowIndex] = ((this.ringOffsets[rowIndex] + steps) % COLS + COLS) % COLS;
    this.moveCount++;

    this.onRingRotate?.(rowIndex, this.ringOffsets[rowIndex]);

    // After rotation, check for column matches
    this.checkColumnMatches();
  }

  /**
   * Set ring offset to an exact value (for smooth drag)
   */
  setRingOffset(rowIndex, offset) {
    if (!this.isRunning) return;
    this.ringOffsets[rowIndex] = ((Math.round(offset)) % COLS + COLS) % COLS;
  }

  /**
   * Finalize ring position after drag (snap + check matches)
   */
  finalizeRingRotation(rowIndex) {
    if (!this.isRunning) return;
    this.moveCount++;
    this.onRingRotate?.(rowIndex, this.ringOffsets[rowIndex]);
    this.checkColumnMatches();
  }

  /**
   * Check all columns for matches
   * A column matches when all non-removed tiles in that column are the same type
   */
  checkColumnMatches() {
    let matchFound = false;

    for (let col = 0; col < COLS; col++) {
      // Get all tiles that are currently in this visual column
      const columnTiles = [];
      for (let row = 0; row < ROWS; row++) {
        const tilesInRow = this.tiles.filter(t => t.row === row && !t.removed);
        const match = tilesInRow.find(t => {
          const visualCol = getVisualCol(t, this.ringOffsets);
          return visualCol === col;
        });
        if (match) columnTiles.push(match);
      }

      // Need at least 3 tiles in the column to match
      if (columnTiles.length < 3) continue;

      // Check if all tiles in this column are the same type
      const firstType = columnTiles[0].typeKey;
      const allSame = columnTiles.every(t => t.typeKey === firstType);

      if (allSame) {
        // Column match! Remove all tiles in this column
        columnTiles.forEach(t => { t.removed = true; });
        this.score += columnTiles.length * 10;
        matchFound = true;
        this.onColumnMatch?.(col, columnTiles);
        this.onScoreUpdate?.(this.score);
      }
    }

    // Check win condition
    if (matchFound) {
      const remaining = this.getRemainingCount();
      if (remaining === 0) {
        this.isRunning = false;
        this.onWin?.({
          time: this.getTimeString(),
          moves: this.moveCount,
          score: this.score,
          elapsed: this.elapsed,
        });
      }
    }

    return matchFound;
  }

  /**
   * Shuffle all remaining tiles
   */
  shuffle() {
    const remaining = this.tiles.filter(t => !t.removed);
    const types = remaining.map(t => t.typeKey);
    
    // Shuffle types
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    remaining.forEach((t, i) => { t.typeKey = types[i]; });

    // Reset ring offsets
    this.ringOffsets.fill(0);
  }

  /**
   * Find a hint: which ring to rotate and by how much to create a column match
   */
  findHint() {
    // Try rotating each ring by each possible offset and check for matches
    for (let row = 0; row < ROWS; row++) {
      const originalOffset = this.ringOffsets[row];
      for (let step = 1; step < COLS; step++) {
        this.ringOffsets[row] = ((originalOffset + step) % COLS + COLS) % COLS;
        
        // Check columns
        for (let col = 0; col < COLS; col++) {
          const columnTiles = [];
          for (let r = 0; r < ROWS; r++) {
            const tilesInRow = this.tiles.filter(t => t.row === r && !t.removed);
            const match = tilesInRow.find(t => getVisualCol(t, this.ringOffsets) === col);
            if (match) columnTiles.push(match);
          }
          if (columnTiles.length >= 3) {
            const allSame = columnTiles.every(t => t.typeKey === columnTiles[0].typeKey);
            if (allSame) {
              this.ringOffsets[row] = originalOffset; // restore
              return { row, steps: step, col, tiles: columnTiles };
            }
          }
        }
        
        this.ringOffsets[row] = originalOffset; // restore
      }
    }
    return null;
  }

  /**
   * Find the column closest to a full match (most tiles of same type)
   */
  findBestColumn() {
    let bestCol = null;
    let bestCount = 0;

    for (let col = 0; col < COLS; col++) {
      const columnTiles = [];
      for (let row = 0; row < ROWS; row++) {
        const tilesInRow = this.tiles.filter(t => t.row === row && !t.removed);
        const match = tilesInRow.find(t => getVisualCol(t, this.ringOffsets) === col);
        if (match) columnTiles.push(match);
      }
      if (columnTiles.length < 2) continue;

      // Count most frequent type
      const counts = {};
      columnTiles.forEach(t => { counts[t.typeKey] = (counts[t.typeKey] || 0) + 1; });
      const maxCount = Math.max(...Object.values(counts));
      if (maxCount > bestCount) {
        bestCount = maxCount;
        bestCol = col;
      }
    }

    return bestCol;
  }
}
