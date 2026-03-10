/**
 * tiles.js — Realistic Mahjong Tile Renderer
 * Ivory body with rounded corners + green back panel.
 * Real mahjong tiles: ivory/white front & sides, green only on the back.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getTileUV, generateStandardAtlas, generateCatAtlas } from './tileTextures.js';
import { TILE_W, TILE_H, TILE_D, CYLINDER_RADIUS, COLS, ROWS, ANGLE_STEP } from './layout.js';

const VW = TILE_W * 0.95;
const VH = TILE_H * 0.92;
const VD = TILE_D;
const CORNER_RADIUS = 0.06;
const CORNER_SEGMENTS = 3;

// Real mahjong colors
const IVORY_COLOR = new THREE.Color('#F2EAD6');    // warm ivory (body + front)
const GREEN_COLOR = new THREE.Color('#1B6B3A');    // classic mahjong green (back only)

export class TileRenderer {
  constructor(scene, tiles) {
    this.scene = scene;
    this.tiles = tiles;
    this.isCatTheme = false;
    this.ringAngles = new Array(ROWS).fill(0);

    // Atlases
    this.standardAtlasData = generateStandardAtlas();
    this.catAtlasData = generateCatAtlas();

    this.standardTexture = new THREE.CanvasTexture(this.standardAtlasData.canvas);
    this.standardTexture.colorSpace = THREE.SRGBColorSpace;
    this.standardTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.standardTexture.magFilter = THREE.LinearFilter;
    this.standardTexture.generateMipmaps = true;

    this.catTexture = new THREE.CanvasTexture(this.catAtlasData.canvas);
    this.catTexture.colorSpace = THREE.SRGBColorSpace;
    this.catTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.catTexture.magFilter = THREE.LinearFilter;
    this.catTexture.generateMipmaps = true;

    // ─── Rounded ivory body (front + sides + top/bottom) ───
    this.bodyGeometry = new RoundedBoxGeometry(VW, VH, VD, CORNER_SEGMENTS, CORNER_RADIUS);
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: IVORY_COLOR,
      roughness: 0.25,
      metalness: 0.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      sheen: 0.1,
      sheenColor: new THREE.Color('#FFF8F0'),
      sheenRoughness: 0.4,
      envMapIntensity: 0.6,
    });

    // ─── Green back panel (thin plane on the inner/back face) ───
    const greenW = VW - CORNER_RADIUS * 3;
    const greenH = VH - CORNER_RADIUS * 3;
    this.greenGeometry = new THREE.PlaneGeometry(greenW, greenH);
    this.greenMaterial = new THREE.MeshPhysicalMaterial({
      color: GREEN_COLOR,
      roughness: 0.35,
      metalness: 0.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.3,
    });

    // InstancedMeshes
    this.count = tiles.length;

    this.bodyMesh = new THREE.InstancedMesh(this.bodyGeometry, this.bodyMaterial, this.count);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;

    this.greenMesh = new THREE.InstancedMesh(this.greenGeometry, this.greenMaterial, this.count);
    this.greenMesh.castShadow = false;
    this.greenMesh.receiveShadow = false;

    // Per-instance color for highlighting
    const colors = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
    }
    this.bodyMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

    // Expose for raycasting
    this.mesh = this.bodyMesh;

    // Face planes (tile symbols on front)
    this.facePlanes = [];
    this.createFacePlanes();

    this.updateAllTransforms();

    this.scene.add(this.bodyMesh);
    this.scene.add(this.greenMesh);

    this.animations = [];
  }

  createFacePlanes() {
    this.facePlanes.forEach(p => {
      this.scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    });
    this.facePlanes = [];

    const texture = this.isCatTheme ? this.catTexture : this.standardTexture;

    this.tiles.forEach((tile) => {
      if (tile.removed) return;

      const uv = getTileUV(tile.typeKey);
      const planeGeo = new THREE.PlaneGeometry(VW * 0.72, VH * 0.72);

      const uvAttr = planeGeo.attributes.uv;
      for (let j = 0; j < uvAttr.count; j++) {
        const u = uvAttr.getX(j);
        const v = uvAttr.getY(j);
        uvAttr.setXY(j,
          uv.offsetX + u * uv.scaleX,
          uv.offsetY + v * uv.scaleY
        );
      }

      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: true,
      });

      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.userData.tileId = tile.id;
      plane.userData.tileRow = tile.row;
      plane.userData.tileCol = tile.col;

      this.facePlanes.push(plane);
      this.scene.add(plane);
    });
  }

  updateAllTransforms() {
    const bodyDummy = new THREE.Object3D();
    const greenDummy = new THREE.Object3D();
    const totalHeight = ROWS * (TILE_H + 0.02);
    const yOffset = -totalHeight / 2;

    this.tiles.forEach((tile, i) => {
      if (tile.removed) {
        bodyDummy.position.set(0, -100, 0);
        bodyDummy.scale.set(0.001, 0.001, 0.001);
        bodyDummy.updateMatrix();
        this.bodyMesh.setMatrixAt(i, bodyDummy.matrix);
        this.greenMesh.setMatrixAt(i, bodyDummy.matrix);
        const plane = this.facePlanes.find(p => p.userData.tileId === tile.id);
        if (plane) plane.visible = false;
        return;
      }

      const ringAngle = this.ringAngles[tile.row] || 0;
      const baseAngle = tile.col * ANGLE_STEP;
      const finalAngle = baseAngle + ringAngle;
      const y = yOffset + tile.row * (TILE_H + 0.02);

      const outX = Math.cos(finalAngle);
      const outZ = Math.sin(finalAngle);

      // Orient tile facing outward
      const outward = new THREE.Vector3(outX, 0, outZ);
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(up, outward).normalize();
      const rotMatrix = new THREE.Matrix4().makeBasis(right, up, outward);

      // Body on cylinder surface
      bodyDummy.position.set(outX * CYLINDER_RADIUS, y, outZ * CYLINDER_RADIUS);
      bodyDummy.scale.set(1, 1, 1);
      bodyDummy.quaternion.setFromRotationMatrix(rotMatrix);
      bodyDummy.updateMatrix();
      this.bodyMesh.setMatrixAt(i, bodyDummy.matrix);

      // Green back panel (on the INNER face, facing inward — i.e. -Z local = toward center)
      const backOffset = VD / 2 + 0.002;
      greenDummy.position.set(
        outX * (CYLINDER_RADIUS - backOffset),
        y,
        outZ * (CYLINDER_RADIUS - backOffset)
      );
      greenDummy.scale.set(1, 1, 1);
      // Rotate 180° around Y to face inward
      const inward = outward.clone().negate();
      const rightIn = new THREE.Vector3().crossVectors(up, inward).normalize();
      const inRotMatrix = new THREE.Matrix4().makeBasis(rightIn, up, inward);
      greenDummy.quaternion.setFromRotationMatrix(inRotMatrix);
      greenDummy.updateMatrix();
      this.greenMesh.setMatrixAt(i, greenDummy.matrix);

      // Face plane (symbols on the outer/front face)
      const plane = this.facePlanes.find(p => p.userData.tileId === tile.id);
      if (plane) {
        plane.visible = true;
        const faceOffset = VD / 2 + 0.006;
        plane.position.set(
          outX * (CYLINDER_RADIUS + faceOffset),
          y,
          outZ * (CYLINDER_RADIUS + faceOffset)
        );
        plane.quaternion.setFromRotationMatrix(rotMatrix);
      }
    });

    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.greenMesh.instanceMatrix.needsUpdate = true;
  }

  setRingAngle(rowIndex, angle) {
    this.ringAngles[rowIndex] = angle;
    this.updateAllTransforms();
  }

  snapRingAngle(rowIndex) {
    const current = this.ringAngles[rowIndex];
    const snapped = Math.round(current / ANGLE_STEP) * ANGLE_STEP;
    this.animations.push({
      type: 'snap', rowIndex,
      startAngle: current, endAngle: snapped,
      startTime: performance.now(), duration: 200,
    });
    return Math.round(current / ANGLE_STEP);
  }

  getSnappedOffset(rowIndex) {
    const angle = this.ringAngles[rowIndex];
    return ((Math.round(angle / ANGLE_STEP) % COLS) + COLS) % COLS;
  }

  highlightColumn(colIndex, highlight = true) {
    this.tiles.forEach((tile, i) => {
      if (tile.removed) return;
      const ringOffset = this.getSnappedOffset(tile.row);
      const visualCol = ((tile.col + ringOffset) % COLS + COLS) % COLS;
      if (visualCol === colIndex) {
        this.bodyMesh.setColorAt(i, highlight ? new THREE.Color('#FFD700') : new THREE.Color('#FFFFFF'));
      }
    });
    this.bodyMesh.instanceColor.needsUpdate = true;
  }

  removeColumn(tiles) {
    tiles.forEach(tile => {
      const idx = this.tiles.findIndex(t => t.id === tile.id);
      if (idx === -1) return;
      const ringAngle = this.ringAngles[tile.row] || 0;
      const finalAngle = tile.col * ANGLE_STEP + ringAngle;
      const totalHeight = ROWS * (TILE_H + 0.02);
      const yOffset = -totalHeight / 2;

      this.animations.push({
        type: 'remove', tileIdx: idx,
        angle: finalAngle,
        y: yOffset + tile.row * (TILE_H + 0.02),
        startTime: performance.now(), duration: 600,
      });

      const plane = this.facePlanes.find(p => p.userData.tileId === tile.id);
      if (plane) {
        this.animations.push({
          type: 'removePlane', plane,
          startTime: performance.now(), duration: 600,
        });
      }
    });

    if (tiles.length > 0) {
      const midTile = tiles[Math.floor(tiles.length / 2)];
      const angle = midTile.col * ANGLE_STEP + (this.ringAngles[midTile.row] || 0);
      const totalHeight = ROWS * (TILE_H + 0.02);
      const yOffset = -totalHeight / 2;
      return new THREE.Vector3(
        Math.cos(angle) * CYLINDER_RADIUS,
        yOffset + midTile.row * (TILE_H + 0.02),
        Math.sin(angle) * CYLINDER_RADIUS
      );
    }
    return null;
  }

  refreshFaces() { this.createFacePlanes(); this.updateAllTransforms(); }

  toggleTheme() {
    this.isCatTheme = !this.isCatTheme;
    this.refreshFaces();
    return this.isCatTheme;
  }

  update() {
    const now = performance.now();
    let needsUpdate = false;
    const dummy = new THREE.Object3D();

    for (let a = this.animations.length - 1; a >= 0; a--) {
      const anim = this.animations[a];
      const t = Math.min((now - anim.startTime) / anim.duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      if (anim.type === 'snap') {
        this.ringAngles[anim.rowIndex] = anim.startAngle + (anim.endAngle - anim.startAngle) * ease;
        needsUpdate = true;
        if (t >= 1) this.ringAngles[anim.rowIndex] = anim.endAngle;
      }

      if (anim.type === 'remove') {
        const outX = Math.cos(anim.angle);
        const outZ = Math.sin(anim.angle);
        const flyDist = 3.0 * ease;
        const scale = 1 - ease;

        dummy.position.set(outX * (CYLINDER_RADIUS + flyDist), anim.y + ease, outZ * (CYLINDER_RADIUS + flyDist));
        dummy.scale.set(scale, scale, scale);
        const outward = new THREE.Vector3(outX, 0, outZ);
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(up, outward).normalize();
        dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, outward));
        dummy.updateMatrix();

        this.bodyMesh.setMatrixAt(anim.tileIdx, dummy.matrix);
        this.greenMesh.setMatrixAt(anim.tileIdx, dummy.matrix);
        needsUpdate = true;

        if (t >= 1) {
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          this.bodyMesh.setMatrixAt(anim.tileIdx, dummy.matrix);
          this.greenMesh.setMatrixAt(anim.tileIdx, dummy.matrix);
        }
      }

      if (anim.type === 'removePlane') {
        anim.plane.scale.set(1 - ease, 1 - ease, 1);
        anim.plane.material.opacity = 1 - ease;
        if (t >= 1) {
          this.scene.remove(anim.plane);
          anim.plane.geometry.dispose();
          anim.plane.material.dispose();
          const pIdx = this.facePlanes.indexOf(anim.plane);
          if (pIdx !== -1) this.facePlanes.splice(pIdx, 1);
        }
      }

      if (t >= 1) this.animations.splice(a, 1);
    }

    if (needsUpdate) {
      this.updateAllTransforms();
      this.bodyMesh.instanceMatrix.needsUpdate = true;
      this.greenMesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    this.scene.remove(this.bodyMesh);
    this.scene.remove(this.greenMesh);
    this.bodyGeometry.dispose();
    this.greenGeometry.dispose();
    this.bodyMaterial.dispose();
    this.greenMaterial.dispose();
    this.standardTexture.dispose();
    this.catTexture.dispose();
    this.facePlanes.forEach(p => {
      this.scene.remove(p); p.geometry.dispose(); p.material.dispose();
    });
  }
}
