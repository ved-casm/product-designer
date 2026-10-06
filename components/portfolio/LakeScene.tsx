"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  Fog,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Points,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { PROFILE } from "./content";
import { hasWebGL, type WaterTheme } from "./water-shared";

/**
 * A lake at the end of the stream: real planar reflections, layered hills, day/night sky,
 * fireflies and the VV monogram floating over the horizon. Pointer movement ripples the water.
 */

const SKY_GLSL = /* glsl */ `
  uniform float uNight;
  uniform vec3 uSunDir;
  vec3 horizonColor() { return mix(vec3(0.98, 0.86, 0.76), vec3(0.04, 0.09, 0.18), uNight); }
  vec3 skyColor(vec3 d) {
    float h = clamp(d.y, 0.0, 1.0);
    vec3 top = mix(vec3(0.36, 0.62, 0.95), vec3(0.008, 0.012, 0.035), uNight);
    vec3 c = mix(horizonColor(), top, pow(h, 0.5));
    float s = max(dot(d, uSunDir), 0.0);
    vec3 lightCol = mix(vec3(1.0, 0.82, 0.58), vec3(0.78, 0.88, 1.0), uNight);
    c += lightCol * (pow(s, 1400.0) * mix(8.0, 5.0, uNight) + pow(s, 14.0) * mix(0.4, 0.14, uNight));
    return c;
  }
`;

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;
  ${SKY_GLSL}
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    vec3 c = skyColor(d);
    // Stars, fading out towards the horizon and twinkling.
    vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0))) * 140.0;
    vec2 cell = floor(sp);
    float h = hash(cell);
    float star = step(0.9965, h) * smoothstep(0.03, 0.25, d.y);
    float r = length(fract(sp) - 0.5);
    float tw = 0.6 + 0.4 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
    c += vec3(0.85, 0.92, 1.0) * star * smoothstep(0.18, 0.0, r) * tw * uNight * 1.6;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec4 uRipples[8];
  uniform mat4 uTexMat;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec4 vProj;
  varying float vRing;

  float ringAt(vec2 p, out float ringSum) {
    float hgt = 0.0;
    ringSum = 0.0;
    for (int i = 0; i < 8; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (age < 0.0 || age > 6.0 || r.w <= 0.0) continue;
      float dist = length(p - r.xy);
      float front = age * 2.2;
      float env = exp(-pow(dist - front, 2.0) * 1.4) * exp(-age * 0.7) * r.w;
      hgt += sin((dist - front) * 7.0) * env * 0.12;
      ringSum += env;
    }
    return hgt;
  }

  float height(vec2 p, out float ringSum) {
    float t = uTime;
    float h = 0.0;
    h += 0.060 * sin(dot(p, vec2(0.80, 0.60)) * 0.55 + t * 0.9);
    h += 0.045 * sin(dot(p, vec2(-0.40, 0.92)) * 0.85 + t * 1.25);
    h += 0.025 * sin(dot(p, vec2(0.95, -0.30)) * 1.60 + t * 1.9);
    h += 0.014 * sin(dot(p, vec2(-0.70, -0.71)) * 2.70 + t * 2.6);
    return h + ringAt(p, ringSum);
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 p = world.xz;
    float ring;
    float h0 = height(p, ring);
    float dummy;
    float e = 0.08;
    float hx = height(p + vec2(e, 0.0), dummy);
    float hz = height(p + vec2(0.0, e), dummy);
    world.y += h0;
    vNormal = normalize(vec3(h0 - hx, e, h0 - hz));
    vWorld = world.xyz;
    vRing = ring;
    vProj = uTexMat * vec4(world.xyz, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const WATER_FRAG = /* glsl */ `
  uniform sampler2D uReflect;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec4 vProj;
  varying float vRing;
  ${SKY_GLSL}
  void main() {
    // Fine capillary ripples on top of the swell.
    vec2 q = vWorld.xz;
    vec3 fine = vec3(
      sin(q.x * 6.1 + uTime * 2.3) * 0.5 + sin(q.x * 11.7 - q.y * 3.2 + uTime * 3.1) * 0.3,
      0.0,
      cos(q.y * 5.3 - uTime * 2.0) * 0.5 + cos(q.y * 13.1 + q.x * 2.7 - uTime * 2.7) * 0.3
    ) * 0.05;
    vec3 N = normalize(vNormal + fine);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);

    vec2 uv = vProj.xy / vProj.w + N.xz * 0.045;
    vec3 refl = texture2D(uReflect, uv).rgb;

    vec3 deep = mix(vec3(0.02, 0.2, 0.3), vec3(0.0, 0.025, 0.06), uNight);
    vec3 col = mix(deep, refl, clamp(0.25 + fres * 1.4, 0.0, 1.0));

    vec3 R = reflect(-V, N);
    vec3 lightCol = mix(vec3(1.0, 0.85, 0.62), vec3(0.8, 0.9, 1.0), uNight);
    col += lightCol * pow(max(dot(R, uSunDir), 0.0), 520.0) * mix(3.5, 2.6, uNight);

    // Bioluminescent ripples at night, soft foam rings by day.
    col += mix(vec3(0.85, 0.95, 1.0) * 0.25, vec3(0.25, 0.95, 1.0) * 1.2, uNight) * clamp(vRing, 0.0, 1.0);

    float dist = length(vWorld - cameraPosition);
    col = mix(col, horizonColor(), smoothstep(45.0, 160.0, dist));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FIREFLY_VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.3 + aSeed * 12.0) * 0.8;
    p.y += sin(uTime * 0.5 + aSeed * 7.0) * 0.35;
    p.z += cos(uTime * 0.25 + aSeed * 9.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vA = 0.45 + 0.55 * sin(uTime * (1.0 + aSeed) + aSeed * 30.0);
    gl_PointSize = (70.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FIREFLY_FRAG = /* glsl */ `
  uniform float uNight;
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vec3(0.6, 1.0, 0.95), a * a * vA * uNight);
  }
`;

const HILL_DAY = ["#6f879e", "#8ea3b8", "#b3c2d2"];
const HILL_NIGHT = ["#070d18", "#0a1322", "#0e1a2d"];

function noise1(x: number, seed: number) {
  const s = (n: number) => {
    const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return s(i) * (1 - u) + s(i + 1) * u;
}

/** A ridge silhouette standing on the waterline. */
function hill(z: number, height: number, seed: number) {
  const shape = new Shape();
  const W = 260;
  shape.moveTo(-W, 0);
  for (let x = -W; x <= W; x += 2) {
    const n = noise1(x * 0.04, seed) * 0.6 + noise1(x * 0.11, seed + 3) * 0.3 + noise1(x * 0.3, seed + 7) * 0.1;
    shape.lineTo(x, n * height);
  }
  shape.lineTo(W, 0);
  shape.closePath();
  const mesh = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ fog: true }));
  mesh.position.z = z;
  return mesh;
}

type Props = { theme: WaterTheme; style?: CSSProperties; className?: string };

export default function LakeScene({ theme, style, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Build the scene only when the footer approaches - nothing is spent on first load.
  const [near, setNear] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || near) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "80% 0px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !near) return;
    const mobile = window.innerWidth < 768;
    let renderer: WebGLRenderer;
    try {
      if (!hasWebGL()) throw new Error("no webgl");
      renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      // No WebGL: fall back to a painted sky-and-water gradient.
      host.classList.add("lake-fallback");
      return;
    }
    renderer.setPixelRatio(Math.min(mobile ? 1.5 : 1.75, window.devicePixelRatio || 1));
    renderer.outputColorSpace = SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";

    const scene = new Scene();
    scene.fog = new Fog(0xffffff, 40, 170);
    const camera = new PerspectiveCamera(42, 1, 0.1, 1200);
    const camBase = new Vector3(0, 1.7, 9);
    const lookAt = new Vector3(0, 1.1, -20);

    const shared = {
      uNight: { value: themeRef.current === "dark" ? 1 : 0 },
      uSunDir: { value: new Vector3(0.35, 0.06, -1).normalize() },
      uTime: { value: 0 },
    };

    const sky = new Mesh(
      new SphereGeometry(600, 48, 24),
      new ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: shared, side: BackSide, depthWrite: false }),
    );
    scene.add(sky);

    const hills = [hill(-62, 9, 1), hill(-88, 14, 2), hill(-120, 20, 3)];
    hills.forEach((h) => scene.add(h));

    // The VV monogram hovering over the horizon, with a soft halo.
    const logoTex = new TextureLoader().load(PROFILE.logo);
    logoTex.colorSpace = SRGBColorSpace;
    const logoMat = new MeshBasicMaterial({ map: logoTex, transparent: true, fog: false, depthWrite: false });
    const logo = new Mesh(new PlaneGeometry(3.4, 3.2), logoMat);
    logo.position.set(0, 4.6, -30);
    scene.add(logo);
    const haloMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: shared,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uNight; varying vec2 vUv; void main(){ float r = length(vUv-0.5); gl_FragColor = vec4(vec3(0.3,0.85,1.0), smoothstep(0.5,0.0,r)*0.35*uNight); }`,
    });
    const halo = new Mesh(new PlaneGeometry(14, 14), haloMat);
    halo.position.set(0, 4.6, -30.5);
    scene.add(halo);

    // Fireflies (night only).
    const COUNT = mobile ? 40 : 90;
    const fpos = new Float32Array(COUNT * 3);
    const fseed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      fpos[i * 3] = (Math.random() - 0.5) * 46;
      fpos[i * 3 + 1] = 0.4 + Math.random() * 3.2;
      fpos[i * 3 + 2] = -2 - Math.random() * 34;
      fseed[i] = Math.random();
    }
    const fgeo = new BufferGeometry();
    fgeo.setAttribute("position", new BufferAttribute(fpos, 3));
    fgeo.setAttribute("aSeed", new BufferAttribute(fseed, 1));
    const fireflies = new Points(
      fgeo,
      new ShaderMaterial({
        vertexShader: FIREFLY_VERT,
        fragmentShader: FIREFLY_FRAG,
        uniforms: shared,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    scene.add(fireflies);

    // Water with a real planar reflection.
    const rt = new WebGLRenderTarget(1, 1, { samples: mobile ? 0 : 4 });
    rt.texture.colorSpace = SRGBColorSpace;
    const ripples = Array.from({ length: 8 }, () => new Vector4(0, 0, -100, 0));
    let rippleIdx = 0;
    const texMat = new Matrix4();
    const waterMat = new ShaderMaterial({
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: { ...shared, uReflect: { value: rt.texture }, uRipples: { value: ripples }, uTexMat: { value: texMat } },
    });
    const water = new Mesh(new PlaneGeometry(400, 400, mobile ? 160 : 280, mobile ? 160 : 280), waterMat);
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    const mirror = new PerspectiveCamera();
    const bias = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);

    // Theme colours that need JS-side blending.
    const fogDay = new Color(0.98, 0.86, 0.76);
    const fogNight = new Color(0.04, 0.09, 0.18);
    const hillDay = HILL_DAY.map((c) => new Color(c));
    const hillNight = HILL_NIGHT.map((c) => new Color(c));
    const logoDay = new Color("#0b2a4a");
    const logoNight = new Color("#e8fbff");
    const tmp = new Color();

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 768 ? 55 : 42;
      camera.updateProjectionMatrix();
      const pr = renderer.getPixelRatio();
      rt.setSize(Math.round(w * pr * 0.5), Math.round(h * pr * 0.5));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Pointer → ripple where the ray meets the water.
    const ray = new Raycaster();
    const ndc = new Vector2();
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const hit = new Vector3();
    const pointer = { x: 0, y: 0 };
    let lastDrop = 0;
    const drop = (clientX: number, clientY: number, strength: number) => {
      const r = host.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      ripples[rippleIdx].set(hit.x, hit.z, shared.uTime.value, strength);
      rippleIdx = (rippleIdx + 1) % ripples.length;
    };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      const now = performance.now();
      if (now - lastDrop > 140) {
        lastDrop = now;
        drop(e.clientX, e.clientY, 0.6);
      }
    };
    const onDown = (e: PointerEvent) => drop(e.clientX, e.clientY, 1.4);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);

    let active = false;
    const io = new IntersectionObserver(([e]) => (active = e.isIntersecting), { rootMargin: "100px" });
    io.observe(host);

    const clock = new Clock();
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!active || document.hidden) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = (shared.uTime.value += dt);

      // Ease day ↔ night.
      const target = themeRef.current === "dark" ? 1 : 0;
      const n = (shared.uNight.value += (target - shared.uNight.value) * Math.min(1, dt * 2.2));
      shared.uSunDir.value.set(0.35, MathUtils.lerp(0.05, 0.12, n), -1).normalize();
      (scene.fog as Fog).color.copy(tmp.copy(fogDay).lerp(fogNight, n));
      hills.forEach((h, i) => (h.material as MeshBasicMaterial).color.copy(tmp.copy(hillDay[i]).lerp(hillNight[i], n)));
      logoMat.color.copy(tmp.copy(logoDay).lerp(logoNight, n));
      logo.position.y = 4.6 + Math.sin(t * 0.8) * 0.18;
      logo.rotation.z = Math.sin(t * 0.5) * 0.03;
      halo.position.y = logo.position.y;

      // Gentle parallax with the pointer.
      camera.position.set(camBase.x + pointer.x * 0.6, camBase.y - pointer.y * 0.2, camBase.z);
      camera.lookAt(lookAt);
      camera.updateMatrixWorld();

      // Mirror camera across the water plane, render the reflection.
      mirror.copy(camera);
      mirror.position.set(camera.position.x, -camera.position.y, camera.position.z);
      mirror.up.set(0, -1, 0);
      mirror.lookAt(lookAt.x, -lookAt.y, lookAt.z);
      mirror.updateMatrixWorld();
      mirror.projectionMatrix.copy(camera.projectionMatrix);
      texMat.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
      water.visible = false;
      renderer.setRenderTarget(rt);
      renderer.render(scene, mirror);
      renderer.setRenderTarget(null);
      water.visible = true;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mat = m.material as Material | undefined;
        mat?.dispose();
      });
      logoTex.dispose();
      rt.dispose();
      renderer.dispose();
      // Release the GPU context now; browsers cap live WebGL contexts and drop the oldest.
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [near]);

  return <div ref={hostRef} className={className} style={{ position: "relative", overflow: "hidden", ...style }} />;
}
