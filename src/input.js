/**
 * input.js — Ring Rotation Input Handler
 * Detects horizontal swipe on each ring to rotate it.
 * Camera orbit is handled by OrbitControls (vertical drag / pinch zoom).
 */

import * as THREE from 'three';
import { ROWS, COLS, TILE_H, CYLINDER_RADIUS, ANGLE_STEP } from './layout.js';

export class InputHandler {
  constructor(camera, canvas, onRingDrag, onRingDragEnd) {
    this.camera = camera;
    this.canvas = canvas;
    this.onRingDrag = onRingDrag;       // callback(rowIndex, angleDelta)
    this.onRingDragEnd = onRingDragEnd; // callback(rowIndex)
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.enabled = true;

    // Ring drag state
    this.isDragging = false;
    this.dragRow = -1;
    this.dragStartX = 0;
    this.dragLastX = 0;
    this.dragStartTime = 0;

    // Cylinder hit detection mesh (invisible)
    this.hitCylinder = this.createHitCylinder();

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
  }

  createHitCylinder() {
    const totalHeight = ROWS * (TILE_H + 0.02);
    const geo = new THREE.CylinderGeometry(
      CYLINDER_RADIUS + 0.3, CYLINDER_RADIUS + 0.3,
      totalHeight + 1, 32, ROWS
    );
    const mat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0;
    return mesh;
  }

  /**
   * Determine which row was hit based on Y coordinate
   */
  getRowFromY(worldY) {
    const totalHeight = ROWS * (TILE_H + 0.02);
    const yOffset = -totalHeight / 2;
    const localY = worldY - yOffset;
    const row = Math.floor(localY / (TILE_H + 0.02));
    return Math.max(0, Math.min(ROWS - 1, row));
  }

  _onPointerDown(e) {
    if (!this.enabled) return;

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.hitCylinder);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      this.dragRow = this.getRowFromY(hitPoint.y);
      this.dragStartX = e.clientX;
      this.dragLastX = e.clientX;
      this.dragStartTime = performance.now();
      this.isDragging = false; // Not dragging yet, need movement threshold
    }
  }

  _onPointerMove(e) {
    if (this.dragRow < 0) return;

    const dx = e.clientX - this.dragStartX;

    // Movement threshold to start dragging (distinguish from orbit)
    if (!this.isDragging && Math.abs(dx) > 8) {
      this.isDragging = true;
      // Prevent orbit controls from taking over
      e.stopPropagation();
    }

    if (this.isDragging) {
      e.preventDefault();
      e.stopPropagation();

      const moveDx = e.clientX - this.dragLastX;
      this.dragLastX = e.clientX;

      // Convert pixel movement to angle
      // More pixels for slower, more controlled rotation
      const sensitivity = 0.005;
      const angleDelta = moveDx * sensitivity;

      this.onRingDrag?.(this.dragRow, angleDelta);
    }
  }

  _onPointerUp(e) {
    if (this.isDragging && this.dragRow >= 0) {
      this.onRingDragEnd?.(this.dragRow);
    }
    this.isDragging = false;
    this.dragRow = -1;
  }

  /**
   * Whether a ring drag is currently happening (to suppress orbit controls)
   */
  isDraggingRing() {
    return this.isDragging;
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointercancel', this._onPointerUp);
    this.hitCylinder.geometry.dispose();
    this.hitCylinder.material.dispose();
  }
}
