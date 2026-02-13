"use client";

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface PersonaDot {
  id: number;
  lat: number;
  lon: number;
  color: string;
  size: number;
  persona?: any;
}

interface ThreeJSGlobeWithDotsProps {
  className?: string;
  size?: number;
  color?: string;
  speed?: number;
  dots?: PersonaDot[];
  onDotClick?: (dot: PersonaDot) => void;
}

// --- GeoJSON outline helpers ---
const loadGeoJsonData = async () => {
  try {
    const response = await fetch('/continents.json');
    return await response.json();
  } catch (error) {
    console.warn('Failed to load continent data:', error);
    return null;
  }
};

const lonLatToVector3 = (lon: number, lat: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (-lon + 180) * (Math.PI / 180); // Fixed: negate longitude to correct inversion
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
};

const drawGeoJsonContoursAndFill = (
  geoJson: any,
  group: THREE.Group,
  radius: number,
  outlineColor = "#fff",
  fillColor = "#888",
  fillOpacity = 0.22,
  outlineOpacity = 0.85
) => {
  geoJson.features.forEach((feature: any) => {
    const geometry = feature.geometry;
    if (!geometry) return;
    const coordsList = geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.coordinates;

    coordsList.forEach((polygon: any) => {
      polygon.forEach((ring: any, ringIndex: number) => {
        if (ring.length < 3) return;
        const vec3Points = ring.map(([lon, lat]: [number, number]) =>
          lonLatToVector3(lon, lat, radius)
        );
        const outlineGeom = new THREE.BufferGeometry().setFromPoints(vec3Points);
        const line = new THREE.Line(
          outlineGeom,
          new THREE.LineBasicMaterial({
            color: outlineColor,
            transparent: true,
            opacity: outlineOpacity
          })
        );
        group.add(line);

        if (ringIndex === 0) {
          const shape2d = new THREE.Shape(
            ring.map(([lon, lat]: [number, number]) => {
              return new THREE.Vector2(
                (-lon + 180) / 360 * 2 * Math.PI, // Fixed: negate longitude to match outline fix
                (90 - lat) / 180 * Math.PI
              );
            })
          );
          const geometry2d = new THREE.ShapeGeometry(shape2d);
          const positionArray = geometry2d.attributes.position.array as Float32Array;
          for (let index = 0; index < positionArray.length; index += 3) {
            const lambda = positionArray[index];
            const phi = positionArray[index + 1];
            const r = radius - 0.01;
            positionArray[index] = r * Math.sin(phi) * Math.cos(lambda);
            positionArray[index + 1] = r * Math.cos(phi);
            positionArray[index + 2] = r * Math.sin(phi) * Math.sin(lambda);
          }
          const mesh = new THREE.Mesh(
            geometry2d,
            new THREE.MeshBasicMaterial({
              color: fillColor,
              transparent: true,
              opacity: fillOpacity,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          group.add(mesh);
        }
      });
    });
  });
};

export function ThreeJSGlobeWithDots({
  className,
  size = 800,
  color = "#333333",
  speed = 0.003,
  dots = [],
  onDotClick
}: ThreeJSGlobeWithDotsProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const autoRotateRef = useRef<boolean>(true);
  const dotsRef = useRef<THREE.Mesh[]>([]);
  const htmlDotsRef = useRef<HTMLDivElement[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const initializedRef = useRef<boolean>(false);

  // Memoize the stable callback to prevent unnecessary re-renders
  const stableOnDotClick = useCallback((dot: PersonaDot) => {
    onDotClick?.(dot);
  }, [onDotClick]);

  // Memoize dots comparison to prevent unnecessary updates
  const dotsString = useMemo(() => JSON.stringify(dots), [dots]);

  const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (-lon + 180) * (Math.PI / 180); // Fixed: negate longitude to correct inversion
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  };

  // Initialize the scene only once
  useEffect(() => {
    if (!mountRef.current || initializedRef.current) return;

    // Clean up any existing content first
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.z = 3.5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize pixel ratio
    renderer.setClearColor(new THREE.Color(0x000000), 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.outline = 'none';
    renderer.domElement.style.userSelect = 'none';
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Globe group
    const globeGroup = new THREE.Group();
    globeRef.current = globeGroup;
    scene.add(globeGroup);

    // Create wireframe sphere
    const globeRadius = 1.3;
    const sphereGeometry = new THREE.SphereGeometry(globeRadius, 48, 48);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: color,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const wireframeSphere = new THREE.Mesh(sphereGeometry, wireframeMaterial);
    globeGroup.add(wireframeSphere);

    // Create latitude and longitude lines
    const createLatitudeLines = () => {
      const latitudes = [];
      for (let i = -80; i <= 80; i += 20) {
        const phi = (90 - i) * (Math.PI / 180);
        const radius = Math.sin(phi) * globeRadius;
        const y = Math.cos(phi) * globeRadius;
        const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(64);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const positions = geometry.attributes.position.array as Float32Array;
        for (let j = 0; j < positions.length; j += 3) {
          const x = positions[j];
          const z = positions[j + 1];
          positions[j] = x;
          positions[j + 1] = y;
          positions[j + 2] = z;
        }
        const lineMaterial = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.1
        });
        const line = new THREE.Line(geometry, lineMaterial);
        latitudes.push(line);
      }
      return latitudes;
    };

    const createLongitudeLines = () => {
      const longitudes = [];
      for (let i = 0; i < 180; i += 20) {
        const curve = new THREE.EllipseCurve(0, 0, globeRadius, globeRadius, 0, Math.PI, false, 0);
        const points = curve.getPoints(32);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.1
        });
        const line = new THREE.Line(geometry, lineMaterial);
        line.rotation.y = (i * Math.PI) / 180;
        longitudes.push(line);
      }
      return longitudes;
    };

    createLatitudeLines().forEach(line => globeGroup.add(line));
    createLongitudeLines().forEach(line => globeGroup.add(line));

    // Load GeoJSON data once
    loadGeoJsonData()
      .then((geoJson) => {
        if (geoJson && sceneRef.current && globeGroup.parent) {
          drawGeoJsonContoursAndFill(geoJson, globeGroup, globeRadius + 0.002, "#ffff", "#2a2a2a", 0.9, 0.85);
        }
      });

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 6;
    controlsRef.current = controls;

    // User interaction handlers
    const onControlsStart = () => {
      autoRotateRef.current = false;
      renderer.domElement.style.cursor = 'grabbing';
    };
    const onControlsEnd = () => {
      renderer.domElement.style.cursor = 'grab';
      setTimeout(() => {
        autoRotateRef.current = true;
      }, 3000);
    };

    const onMouseMove = (event: MouseEvent) => {
      renderer.domElement.style.cursor = autoRotateRef.current ? 'grab' : 'grabbing';
    };

    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('end', onControlsEnd);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      if (globeRef.current && autoRotateRef.current) {
        globeRef.current.rotation.y += speed;
      }
      updateHtmlDotPositions();
      renderer.render(scene, camera);
    };
    animate();

    initializedRef.current = true;

    // Cleanup function
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.removeEventListener('start', onControlsStart);
        controlsRef.current.removeEventListener('end', onControlsEnd);
        controlsRef.current.dispose();
      }
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
      }
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }

      // Cleanup dots (InstancedMesh)
      if (globeGroup.userData.instancedMesh) {
        globeGroup.userData.instancedMesh.geometry.dispose();
        globeGroup.userData.instancedMesh.material.dispose();
      }

      htmlDotsRef.current.forEach(htmlDot => {
        if (htmlDot.parentNode) {
          htmlDot.parentNode.removeChild(htmlDot);
        }
      });
      renderer.dispose();
      initializedRef.current = false;
    };
  }, []); // Only run once on mount

  // Handle Resize separately
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    renderer.setSize(size, size);

    // If we wanted to handle aspect ratio changes (though size is usually square here)
    // cameraRef.current.aspect = size / size;
    // cameraRef.current.updateProjectionMatrix();

  }, [size]);

  // Handle color/speed changes
  useEffect(() => {
    // We could update materials here if needed, but for now we skip to avoid complexity
    if (controlsRef.current) {
      // Update speed indirectly via ref or mutable state if strictly needed
    }
  }, [color, speed]);

  // Separate effect for updating dots (InstancedMesh implementation)
  useEffect(() => {
    if (!sceneRef.current || !globeRef.current || !overlayRef.current) return;

    const globeRadius = 1.3;
    const group = globeRef.current!;

    // Remove existing dots/instanced mesh
    if (group.userData.instancedMesh) {
      group.remove(group.userData.instancedMesh);
      group.userData.instancedMesh.geometry.dispose();
      group.userData.instancedMesh.material.dispose();
      group.userData.instancedMesh = null;
    }

    dotsRef.current = []; // We won't use individual meshes anymore
    htmlDotsRef.current = [];
    overlayRef.current.innerHTML = '';

    if (dots.length === 0) return;

    // Create InstancedMesh
    const dotGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Color will be set per instance
    const instancedMesh = new THREE.InstancedMesh(dotGeometry, dotMaterial, dots.length);

    const dummy = new THREE.Object3D();
    const colorHelper = new THREE.Color();

    dots.forEach((dot, index) => {
      const position = latLonToVector3(dot.lat, dot.lon, globeRadius + 0.02);
      dummy.position.copy(position);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index, dummy.matrix);

      colorHelper.set(dot.color);
      instancedMesh.setColorAt(index, colorHelper);

      // We still map 1:1 for HTML dots for now, but we can optimize projection later
      // The raycasting logic suggests we might need individual tracking, but let's stick to visual optimization first

      // Store position in a way we can access for HTML overlay updates
      // We can reconstruct it from lat/lon in the update loop

      // Create HTML overlay dot
      const htmlDot = document.createElement('div');
      htmlDot.className = 'absolute pointer-events-auto cursor-pointer';
      // Only animate if it's NOT the default grey/white (meaning it has a reaction)
      // Treat #666666, #444444, #888888, and #bbbbbb as inactive grey colors
      const isInactive = ['#666666', '#444444', '#888888', '#bbbbbb', '#ffffff'].includes(dot.color);
      const isActive = !isInactive;

      htmlDot.innerHTML = `
        <div class="relative flex h-3 w-3">
          ${isActive ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: ${dot.color}"></span>` : ''}
          <span class="relative inline-flex rounded-full h-3 w-3" style="background-color: ${dot.color}"></span>
        </div>
      `;

      htmlDot.addEventListener('click', (e) => {
        e.stopPropagation();
        stableOnDotClick(dot);
      });

      overlayRef.current!.appendChild(htmlDot);
      htmlDotsRef.current.push(htmlDot);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor!.needsUpdate = true; // Essential for per-instance colors

    group.add(instancedMesh);
    group.userData.instancedMesh = instancedMesh;
    group.userData.dotsData = dots; // Store data for resize/update logic lookup

  }, [dotsString, stableOnDotClick]);

  // Function to update HTML dot positions (Optimized)
  const updateHtmlDotPositions = () => {
    if (!overlayRef.current || !cameraRef.current || !globeRef.current) return;

    // We iterate through 'dots' (from props/memo) or the stored InstancedMesh data
    const dotsData = globeRef.current!.userData.dotsData as PersonaDot[];
    if (!dotsData || htmlDotsRef.current.length !== dotsData.length) return;

    const globeRadius = 1.3;
    const vector = new THREE.Vector3();
    const globeCenter = new THREE.Vector3(0, 0, 0);
    const cameraPos = cameraRef.current!.position;
    const distanceToCenter = cameraPos.distanceTo(globeCenter);
    const maxVisibleDistance = distanceToCenter + 0.1; // Horizon culling roughly

    // Pre-calculate matrices if needed, but here we just need world positions
    // Since the globe rotates, we need to transform the local positions

    const globeMatrix = globeRef.current!.matrixWorld;

    dotsData.forEach((dot, index) => {
      const htmlDot = htmlDotsRef.current[index];
      if (!htmlDot) return;

      // Re-calculate local position (fast)
      // We could cache these vector3s but they are cheap to make compared to DOM
      const lat = dot.lat;
      const lon = dot.lon;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (-lon + 180) * (Math.PI / 180);
      const r = globeRadius + 0.02;

      vector.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );

      // Apply globe rotation/transform
      vector.applyMatrix4(globeMatrix);

      // Check visibility (backface culling)
      const dist = cameraPos.distanceTo(vector);
      if (dist >= maxVisibleDistance) {
        if (htmlDot.style.display !== 'none') htmlDot.style.display = 'none';
        return;
      }

      // Project to screen
      vector.project(cameraRef.current!);

      const x = (vector.x * 0.5 + 0.5) * size;
      const y = (vector.y * -0.5 + 0.5) * size;

      // Only update DOM if necessary (though simple assignment is often optimized by browser, display check helps)
      htmlDot.style.transform = `translate(${x - 6}px, ${y - 6}px)`;
      if (htmlDot.style.display !== 'block') htmlDot.style.display = 'block';
    });
  };

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        cursor: 'grab'
      }}
    >
      <div
        ref={mountRef}
        style={{
          width: size,
          height: size,
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          width: size,
          height: size,
          overflow: 'hidden' // Ensure dots don't bleed out
        }}
      />
    </div>
  );
}

export default ThreeJSGlobeWithDots;