"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

// --- Arc between two points on the globe ---
function GlobeArc({
  from,
  to,
  color = "#4ade80",
}: {
  from: [number, number];
  to: [number, number];
  color?: string;
}) {
  const lineRef = useRef<THREE.Line>(null);

  const lineObject = useMemo(() => {
    function toVec([lat, lon]: [number, number], r = 1.02) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    const start = toVec(from);
    const end = toVec(to);
    const mid = start.clone().add(end).normalize().multiplyScalar(1.35);
    const points = new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(64);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
    return new THREE.Line(geo, mat);
  }, [from, to, color]);

  return <primitive ref={lineRef} object={lineObject} />;
}

// --- Dot at a lat/lon position ---
function GlobeDot({
  lat,
  lon,
  color = "#ffffff",
  size = 0.012,
}: {
  lat: number;
  lon: number;
  color?: string;
  size?: number;
}) {
  const r = 1.02;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const position: [number, number, number] = [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];

  const pulseRef = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!pulseRef.current) return;
    t.current += delta * 1.5;
    const s = 1 + 0.4 * Math.sin(t.current);
    pulseRef.current.scale.setScalar(s);
  });

  return (
    <mesh position={position} ref={pulseRef}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

// --- Main Globe mesh ---
function Globe() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
  });

  // Dot-matrix sphere surface using instanced mesh
  const dotCount = 5000;
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!instancedRef.current) return;

    const dummy = new THREE.Object3D();
    let count = 0;
    const r = 1.001;

    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(1 - (2 * i) / dotCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(count++, dummy.matrix);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group ref={meshRef}>
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          color="#0a0a0a"
          emissive="#0d1a2e"
          emissiveIntensity={0.5}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Grid lines */}
      <mesh>
        <sphereGeometry args={[1.001, 32, 32]} />
        <meshBasicMaterial
          color="#1e3a5f"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Dot surface */}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, dotCount]}>
        <circleGeometry args={[0.004, 4]} />
        <meshBasicMaterial color="#1a4b7a" transparent opacity={0.55} />
      </instancedMesh>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[1.08, 64, 64]} />
        <meshPhongMaterial
          color="#1a6eb5"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>

      {/* City dots */}
      <GlobeDot lat={40.7} lon={-74} color="#60a5fa" size={0.018} />  {/* NYC */}
      <GlobeDot lat={51.5} lon={-0.1} color="#60a5fa" size={0.018} />  {/* London */}
      <GlobeDot lat={35.6} lon={139.7} color="#60a5fa" size={0.018} /> {/* Tokyo */}
      <GlobeDot lat={37.8} lon={144.9} color="#60a5fa" size={0.016} /> {/* Melbourne */}
      <GlobeDot lat={1.3} lon={103.8} color="#60a5fa" size={0.016} />  {/* Singapore */}
      <GlobeDot lat={28.6} lon={77.2} color="#60a5fa" size={0.016} />  {/* Delhi */}
      <GlobeDot lat={-23.5} lon={-46.6} color="#60a5fa" size={0.016} />{/* São Paulo */}
      <GlobeDot lat={48.8} lon={2.3} color="#60a5fa" size={0.016} />   {/* Paris */}
      <GlobeDot lat={55.7} lon={37.6} color="#60a5fa" size={0.015} />  {/* Moscow */}
      <GlobeDot lat={31.2} lon={121.5} color="#60a5fa" size={0.018} /> {/* Shanghai */}
      <GlobeDot lat={-33.9} lon={18.4} color="#60a5fa" size={0.014} /> {/* Cape Town */}
      <GlobeDot lat={19.4} lon={-99.1} color="#60a5fa" size={0.016} /> {/* Mexico City */}
      <GlobeDot lat={59.9} lon={10.7} color="#60a5fa" size={0.014} />  {/* Oslo */}
      <GlobeDot lat={34.0} lon={-118.2} color="#60a5fa" size={0.016} />{/* LA */}
      <GlobeDot lat={22.3} lon={114.2} color="#60a5fa" size={0.015} /> {/* HK */}

      {/* Arcs */}
      <GlobeArc from={[40.7, -74]} to={[51.5, -0.1]} color="#3b82f6" />
      <GlobeArc from={[51.5, -0.1]} to={[35.6, 139.7]} color="#818cf8" />
      <GlobeArc from={[35.6, 139.7]} to={[1.3, 103.8]} color="#3b82f6" />
      <GlobeArc from={[1.3, 103.8]} to={[28.6, 77.2]} color="#818cf8" />
      <GlobeArc from={[40.7, -74]} to={[-23.5, -46.6]} color="#60a5fa" />
      <GlobeArc from={[48.8, 2.3]} to={[31.2, 121.5]} color="#3b82f6" />
      <GlobeArc from={[34.0, -118.2]} to={[22.3, 114.2]} color="#818cf8" />
      <GlobeArc from={[-23.5, -46.6]} to={[-33.9, 18.4]} color="#60a5fa" />
    </group>
  );
}

function Scene() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 2.8);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.5} color="#4a9eff" />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#1a3a6e" />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={3}
        saturation={0}
        fade
        speed={0.3}
      />

      <Globe />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={(2 * Math.PI) / 3}
        rotateSpeed={0.4}
      />
    </>
  );
}

export function GlobeAnimation() {
  return (
    <div
      className="w-full h-full relative"
      style={{
        background:
          "radial-gradient(ellipse at center, #0d1b2e 0%, #060c14 60%, #000000 100%)",
      }}
    >
      {/* Corner labels */}
      <div className="absolute top-4 left-4 z-10 font-mono text-xs text-blue-400/60 select-none">
        GLOBAL PERSONA NETWORK
      </div>
      <div className="absolute top-4 right-4 z-10 font-mono text-xs text-blue-400/60 select-none">
        {new Date().getFullYear()} · LIVE
      </div>
      <div className="absolute bottom-4 left-4 z-10 font-mono text-xs text-white/30 select-none">
        ◉ 199 ACTIVE PERSONAS
      </div>
      <div className="absolute bottom-4 right-4 z-10 font-mono text-xs text-white/30 select-none">
        DRAG TO ROTATE
      </div>

      {/* Scan line overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)",
        }}
      />

      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 45, near: 0.1, far: 1000 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
