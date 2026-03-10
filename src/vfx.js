/**
 * vfx.js — Particle Effects for column elimination
 * Shattering debris + sparkle particles + flash
 */

import * as THREE from 'three';

const SPARKLE_PER_BURST = 30;
const DEBRIS_PER_BURST = 18;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];

    // Sparkle material
    this.sparkleMat = new THREE.PointsMaterial({
      size: 0.1,
      map: this.createSparkleTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    // Debris material (opaque shards)
    this.debrisMat = new THREE.PointsMaterial({
      size: 0.12,
      map: this.createDebrisTexture(),
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: true,
      vertexColors: true,
    });
  }

  createSparkleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.15, 'rgba(255, 240, 180, 0.9)');
    grad.addColorStop(0.4, 'rgba(255, 200, 80, 0.4)');
    grad.addColorStop(1, 'rgba(255, 180, 50, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  createDebrisTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    // Angular shard shape
    ctx.fillStyle = '#F5EDD8';
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(20, 2);
    ctx.lineTo(28, 16);
    ctx.lineTo(24, 28);
    ctx.lineTo(8, 26);
    ctx.closePath();
    ctx.fill();
    // Edge shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Spawn a dramatic shattering burst at the given world position
   */
  burst(position) {
    // ═══ SPARKLE PARTICLES ═══
    this._spawnSparkles(position);
    // ═══ DEBRIS SHARDS ═══
    this._spawnDebris(position);
    // ═══ FLASH LIGHT ═══
    this._spawnFlash(position);
  }

  _spawnSparkles(pos) {
    const count = SPARKLE_PER_BURST;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];
    const lifetimes = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = pos.y + (Math.random() - 0.5) * 2;
      positions[i3 + 2] = pos.z + (Math.random() - 0.5) * 0.5;

      // Gold-white sparkle colors
      const t = Math.random();
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.8 + t * 0.2;
      colors[i3 + 2] = 0.3 + t * 0.5;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        Math.random() * 3.5 + 1.0,
        (Math.random() - 0.5) * 3.5
      ));
      lifetimes.push(0.6 + Math.random() * 0.8);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = this.sparkleMat.clone();
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.bursts.push({
      type: 'sparkle', points, geometry: geo, material: mat,
      velocities, lifetimes, age: 0, maxAge: Math.max(...lifetimes),
    });
  }

  _spawnDebris(pos) {
    const count = DEBRIS_PER_BURST;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];
    const rotSpeeds = [];
    const lifetimes = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = pos.x + (Math.random() - 0.5) * 0.8;
      positions[i3 + 1] = pos.y + (Math.random() - 0.5) * 3;
      positions[i3 + 2] = pos.z + (Math.random() - 0.5) * 0.8;

      // Ivory/green shard colors
      const isGreen = Math.random() < 0.3;
      if (isGreen) {
        colors[i3] = 0.1; colors[i3 + 1] = 0.42; colors[i3 + 2] = 0.23;
      } else {
        const v = 0.88 + Math.random() * 0.12;
        colors[i3] = v; colors[i3 + 1] = v * 0.93; colors[i3 + 2] = v * 0.82;
      }

      // Fast outward velocity (explosive)
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.random() - 0.3) * 4.0,
        Math.sin(angle) * speed
      ));
      rotSpeeds.push(Math.random() * 10);
      lifetimes.push(0.8 + Math.random() * 0.6);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = this.debrisMat.clone();
    mat.size = 0.08 + Math.random() * 0.1;
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.bursts.push({
      type: 'debris', points, geometry: geo, material: mat,
      velocities, rotSpeeds, lifetimes, age: 0, maxAge: Math.max(...lifetimes),
    });
  }

  _spawnFlash(pos) {
    // Bright flash
    const flash = new THREE.PointLight(0xFFD700, 5, 8);
    flash.position.copy(pos);
    this.scene.add(flash);

    // White core flash
    const whiteFlash = new THREE.PointLight(0xFFFFFF, 3, 4);
    whiteFlash.position.copy(pos);
    this.scene.add(whiteFlash);

    // Quick decay
    let intensity = 5;
    const decay = () => {
      intensity *= 0.85;
      flash.intensity = intensity;
      whiteFlash.intensity = intensity * 0.6;
      if (intensity > 0.05) {
        requestAnimationFrame(decay);
      } else {
        this.scene.remove(flash);
        this.scene.remove(whiteFlash);
        flash.dispose();
        whiteFlash.dispose();
      }
    };
    requestAnimationFrame(decay);
  }

  /**
   * Update all active particle bursts
   */
  update(dt) {
    for (let b = this.bursts.length - 1; b >= 0; b--) {
      const burst = this.bursts[b];
      burst.age += dt;

      if (burst.age >= burst.maxAge) {
        this.scene.remove(burst.points);
        burst.geometry.dispose();
        burst.material.dispose();
        this.bursts.splice(b, 1);
        continue;
      }

      const posAttr = burst.geometry.getAttribute('position');
      const posArr = posAttr.array;
      const count = posArr.length / 3;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const vel = burst.velocities[i];
        const life = burst.lifetimes[i];
        const t = Math.min(burst.age / life, 1);

        posArr[i3] += vel.x * dt;
        posArr[i3 + 1] += vel.y * dt - 3.0 * dt * burst.age; // gravity
        posArr[i3 + 2] += vel.z * dt;

        // Air resistance
        vel.multiplyScalar(burst.type === 'debris' ? 0.96 : 0.98);
      }

      posAttr.needsUpdate = true;

      // Fade out
      const overallT = burst.age / burst.maxAge;
      burst.material.opacity = 1 - overallT * overallT;

      if (burst.type === 'debris') {
        // Debris gets smaller as it flies
        burst.material.size = (0.08 + Math.random() * 0.06) * (1 - overallT * 0.7);
      } else {
        burst.material.size = 0.1 * (1 - overallT * 0.3);
      }
    }
  }

  dispose() {
    this.bursts.forEach(burst => {
      this.scene.remove(burst.points);
      burst.geometry.dispose();
      burst.material.dispose();
    });
    this.bursts = [];
  }
}
