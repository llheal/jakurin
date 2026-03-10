/**
 * scene.js — Three.js Scene, Camera, Renderer, Post-Processing, and Controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1A1A2E');
    this._shakeIntensity = 0;

    // Camera — fixed wide view of vertical cylinder
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(18, 1, 0);
    this.camera.lookAt(0, 0, 0);

    // Environment map for PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
    this.scene.environment = envMap;
    envScene.dispose();
    pmremGenerator.dispose();

    // Lights
    this.setupLights();

    // Floor / background plane
    this.setupFloor();

    // Post-processing
    this.setupPostProcessing();

    // Controls
    this.setupControls();

    // Resize
    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  setupLights() {
    // Warm ambient
    const ambient = new THREE.AmbientLight(0xFFF8F0, 0.5);
    this.scene.add(ambient);

    // Main directional light
    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.9);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.002;
    dirLight.shadow.radius = 4;
    this.scene.add(dirLight);

    // Hemisphere light for softer fill
    const hemiLight = new THREE.HemisphereLight(0xB0C4DE, 0x3D2B1F, 0.35);
    this.scene.add(hemiLight);

    // Subtle rim light from below/behind
    const rimLight = new THREE.DirectionalLight(0xC53D43, 0.15);
    rimLight.position.set(-3, 2, -5);
    this.scene.add(rimLight);
  }

  setupFloor() {
    // Reflective dark floor
    const floorGeo = new THREE.CircleGeometry(20, 64);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x0A0A18,
      roughness: 0.3,
      metalness: 0.4,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Soft glow ring under the cylinder
    const glowGeo = new THREE.RingGeometry(2.5, 5, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x1B6B3A,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -5.9;
    this.scene.add(glow);

    // Floating ambient dust particles
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 30;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.04,
      color: 0xFFD700,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dustParticles = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustParticles);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // SSAO for ambient occlusion
    const ssaoPass = new SSAOPass(
      this.scene,
      this.camera,
      this.container.clientWidth,
      this.container.clientHeight
    );
    ssaoPass.kernelRadius = 0.6;
    ssaoPass.minDistance = 0.001;
    ssaoPass.maxDistance = 0.15;
    ssaoPass.output = SSAOPass.OUTPUT.Default;
    this.ssaoPass = ssaoPass;
    this.composer.addPass(ssaoPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setupControls() {
    // Fixed camera — no orbit controls during gameplay
    // OrbitControls only used for auto-rotate on menu screen
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableRotate = false;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.target.set(0, 0, 0);
    this.controls.autoRotate = false;
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.ssaoPass) {
      this.ssaoPass.setSize(w, h);
    }
  }

  /**
   * Render one frame
   */
  render() {
    this.controls.update();
    this._updateOrbit();

    // Apply screen shake
    if (this._shakeIntensity > 0.001) {
      const offsetX = (Math.random() - 0.5) * this._shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this._shakeIntensity;
      this.camera.position.x += offsetX;
      this.camera.position.y += offsetY;
      this._shakeIntensity *= 0.88; // decay
    }

    // Slowly rotate dust particles for ambient atmosphere
    if (this.dustParticles) {
      this.dustParticles.rotation.y += 0.0003;
    }

    this.composer.render();
  }

  /**
   * Trigger screen shake
   * @param {number} intensity - shake strength (0.1 = subtle, 0.5 = strong)
   */
  screenShake(intensity = 0.3) {
    this._shakeIntensity = intensity;
  }

  /**
   * Smoothly orbit camera to face a specific angle on the cylinder
   * @param {number} targetAngle - target angle in radians (0 = original position)
   */
  orbitTo(targetAngle) {
    this._orbitTarget = targetAngle;
    this._orbitStart = this._orbitAngle || 0;
    this._orbitStartTime = performance.now();
    this._orbitDuration = 800;
  }

  _updateOrbit() {
    if (this._orbitTarget === undefined || this._orbitTarget === null) return;
    const t = Math.min((performance.now() - this._orbitStartTime) / this._orbitDuration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    this._orbitAngle = this._orbitStart + (this._orbitTarget - this._orbitStart) * ease;

    const dist = 18;
    this.camera.position.x = Math.cos(this._orbitAngle) * dist;
    this.camera.position.z = Math.sin(this._orbitAngle) * dist;
    this.camera.lookAt(0, 0, 0);

    if (t >= 1) {
      this._orbitTarget = null;
    }
  }

  getDelta() {
    return this.clock.getDelta();
  }

  getCanvas() {
    return this.renderer.domElement;
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
