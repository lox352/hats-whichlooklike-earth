import { BallCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Point } from "../types/Point";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import React from "react";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vColor;

  uniform vec3 instanceColor; // Per-instance color as uniform

  void main() {
    vUv = uv;
    vColor = instanceColor; // Pass the color to the fragment shader
    // Apply model-view and projection matrix to the sprite (keeping rotation fixed)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D map;
  varying vec2 vUv;
  varying vec3 vColor;

  void main() {
    vec4 texColor = texture2D(map, vUv);
    gl_FragColor = vec4(texColor.rgb * vColor, texColor.a); // Multiply texture by color
  }
`;

export default function PointMass({
  position,
  rigidBodyRef,
  fixed,
  visible,
  colourRef,
  chevronTexture,
  geometry,
}: {
  position: Point;
  rigidBodyRef: React.RefObject<RapierRigidBody>;
  fixed: boolean;
  visible: boolean;
  colourRef: React.MutableRefObject<Float32Array>;
  chevronTexture: THREE.Texture;
  geometry: THREE.PlaneGeometry;
}) {
  const meshRef = React.createRef<THREE.Mesh>();

  useFrame(() => {
    if (rigidBodyRef.current && meshRef.current) {
      meshRef.current.lookAt(new THREE.Vector3(0, 0, 0)); // Target point (0, 0, 0) or you can change it
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      collisionGroups={0b0010} // Assign to a specific group
      type={fixed ? "fixed" : "dynamic"}
      position={[position.x, position.y, position.z]}
      linearDamping={0.8}
      angularDamping={0.8}
    >
      <BallCollider args={[0.02]} />
      {visible && colourRef.current && (
        <mesh scale={2} ref={meshRef} geometry={geometry}>
          <shaderMaterial
            uniforms={{
              map: { value: chevronTexture },
              instanceColor: { value: colourRef.current },
            }}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </RigidBody>
  );
}
