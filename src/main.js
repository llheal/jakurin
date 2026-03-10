/**
 * main.js — Vita Mahjong Entry Point
 * Ring Rotation Puzzle: rotate rings to align columns, matched columns are eliminated.
 */

import { SceneManager } from './scene.js';
import { TileRenderer } from './tiles.js';
import { generateLayout, COLS, ROWS, ANGLE_STEP } from './layout.js';
import { GameState } from './gameLogic.js';
import { ParticleSystem } from './vfx.js';
import { InputHandler } from './input.js';
import { UIController } from './ui/ui.js';
import { playTapSound, playMatchSound, playShuffleSound, playEliminateSound, playSlideSound, startGrindSound, stopGrindSound, hapticTap, hapticMatch, initAudio, startBGM, stopBGM } from './audio.js';
import { initLiff, shareResult } from './liff.js';
import * as THREE from 'three';

class VitaMahjong {
  constructor() {
    this.sceneManager = null;
    this.tileRenderer = null;
    this.gameState = null;
    this.particles = null;
    this.input = null;
    this.ui = null;
    this.rafId = null;
    this.tiles = [];
  }

  async init() {
    // Init LIFF (non-blocking)
    initLiff();

    // Init audio on first interaction
    initAudio();

    // Setup UI
    this.ui = new UIController();
    this.ui.onStart = () => this.startGame();
    this.ui.onThemeToggle = () => this.toggleTheme();
    this.ui.onHint = () => this.showHint();
    this.ui.onShuffle = () => this.doShuffle();
    this.ui.onReplay = () => this.restartGame();
    this.ui.onShare = () => this.shareGame();
    this.ui.onRestart = () => this.restartGame();

    // Setup 3D scene
    const container = document.getElementById('canvas-container');
    this.sceneManager = new SceneManager(container);

    // Particle system
    this.particles = new ParticleSystem(this.sceneManager.scene);

    // Generate initial layout for menu background
    this.tiles = generateLayout();
    this.tileRenderer = new TileRenderer(this.sceneManager.scene, this.tiles);

    // Enable auto-rotate on menu
    this.sceneManager.controls.autoRotate = true;
    this.sceneManager.controls.autoRotateSpeed = 1.5;

    // Start render loop
    this.animate();
  }

  startGame() {
    // Generate new layout
    this.tiles = generateLayout();

    // Rebuild tile renderer
    if (this.tileRenderer) this.tileRenderer.dispose();
    this.tileRenderer = new TileRenderer(this.sceneManager.scene, this.tiles);

    // Apply theme
    if (this.ui.isCatTheme) {
      this.tileRenderer.isCatTheme = true;
      this.tileRenderer.refreshFaces();
    }

    // Setup game state
    this.gameState = new GameState();
    this.gameState.init(this.tiles);

    // Wire up game callbacks
    this.gameState.onColumnMatch = (colIndex, matchedTiles) => {
      playMatchSound();
      playEliminateSound();
      hapticMatch();

      // Highlight column briefly, then shatter
      this.tileRenderer.highlightColumn(colIndex, true);

      setTimeout(() => {
        const positions = this.tileRenderer.removeColumn(matchedTiles);
        positions.forEach(pos => this.particles.burst(pos));
        this.tileRenderer.highlightColumn(colIndex, false);
        // Screen shake!
        this.sceneManager.screenShake(0.35);
      }, 300);
    };

    this.gameState.onWin = (stats) => {
      stopBGM();
      this.ui.showWin(stats);
    };

    this.gameState.onScoreUpdate = (score) => {
      // Score is reflected in HUD via getRemainingCount
    };

    this.gameState.onRingRotate = (rowIndex, offset) => {
      playTapSound();
    };

    // Start background music
    startBGM();

    // Setup ring rotation input
    if (this.input) this.input.dispose();
    this.input = new InputHandler(
      this.sceneManager.camera,
      this.sceneManager.getCanvas(),
      // onRingDrag: smooth rotation during drag
      (rowIndex, angleDelta) => {
        const currentAngle = this.tileRenderer.ringAngles[rowIndex] || 0;
        this.tileRenderer.setRingAngle(rowIndex, currentAngle + angleDelta);
        // Start grinding sound on first drag movement
        startGrindSound();
      },
      // onRingDragEnd: snap to column and check matches
      (rowIndex) => {
        stopGrindSound();
        hapticTap();
        const colOffset = this.tileRenderer.snapRingAngle(rowIndex);

        // After snap animation, check matches
        setTimeout(() => {
          const snappedOffset = this.tileRenderer.getSnappedOffset(rowIndex);
          this.gameState.setRingOffset(rowIndex, snappedOffset);
          this.gameState.finalizeRingRotation(rowIndex);
        }, 250);
      }
    );

    // Add the hit cylinder to the scene for raycasting
    this.sceneManager.scene.add(this.input.hitCylinder);

    // Disable auto-rotate for gameplay
    this.sceneManager.controls.autoRotate = false;

    // Reset camera for cylinder view
    this.sceneManager.camera.position.set(18, 1, 0);
    this.sceneManager.controls.target.set(0, 0, 0);

    // Show HUD
    this.ui.showGame();
    this.ui.hideModal(this.ui.modalWin);
    this.ui.hideModal(this.ui.modalDeadlock);
  }

  toggleTheme() {
    if (this.tileRenderer) {
      this.tileRenderer.toggleTheme();
    }
  }

  showHint() {
    if (!this.gameState) return;

    // First try: exact 1-ring-rotation hint
    const exactHint = this.gameState.findHint();
    if (exactHint) {
      this.tileRenderer.highlightColumn(exactHint.col, true);
      playTapSound();
      setTimeout(() => this.tileRenderer.highlightColumn(exactHint.col, false), 2500);
      return;
    }

    // Fallback: find the column closest to matching (most same-type tiles)
    const bestCol = this.gameState.findBestColumn();
    if (bestCol !== null) {
      this.tileRenderer.highlightColumn(bestCol, true);
      playTapSound();
      setTimeout(() => this.tileRenderer.highlightColumn(bestCol, false), 2500);
    }
  }

  doShuffle() {
    if (this.gameState) {
      this.gameState.shuffle();
      playShuffleSound();
      // Reset ring angles
      this.tileRenderer.ringAngles.fill(0);
      this.tileRenderer.refreshFaces();
      this.tileRenderer.updateAllTransforms();
    }
  }

  restartGame() {
    this.ui.hideModal(this.ui.modalWin);
    this.ui.hideModal(this.ui.modalDeadlock);
    this.startGame();
  }

  async shareGame() {
    if (this.gameState) {
      await shareResult(this.gameState.getTimeString(), this.gameState.moveCount);
    }
  }

  animate() {
    this.rafId = requestAnimationFrame(() => this.animate());

    const dt = this.sceneManager.getDelta();

    // Update game state
    if (this.gameState) {
      this.gameState.update();
      this.ui.updateHUD(
        this.gameState.getRemainingCount(),
        this.gameState.getTimeString()
      );
    }

    // Update animations
    if (this.tileRenderer) this.tileRenderer.update();
    if (this.particles) this.particles.update(dt);

    // Render
    this.sceneManager.render();
  }
}

// Boot
const app = new VitaMahjong();
app.init().catch(err => console.error('Failed to initialize:', err));
