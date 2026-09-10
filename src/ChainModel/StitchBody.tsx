import { BallCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Point } from "../types/Point";
import React from "react";
import { settleDamping } from "../constants";

/**
 * One stitch as a physical body, and nothing else.
 *
 * It used to carry its own mesh and shader material, which meant thousands of
 * draw calls and shader programs. Drawing is now done in a single instanced
 * mesh (see StitchInstances) that reads these bodies' positions, so this is
 * purely the physics.
 */
export default function StitchBody({
  position,
  rigidBodyRef,
  fixed,
}: {
  position: Point;
  rigidBodyRef: React.RefObject<RapierRigidBody>;
  fixed: boolean;
}) {
  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders={false}
      collisionGroups={0b0010} // Assign to a specific group
      type={fixed ? "fixed" : "dynamic"}
      position={[position.x, position.y, position.z]}
      linearDamping={settleDamping}
      angularDamping={settleDamping}
    >
      <BallCollider args={[0.02]} />
    </RigidBody>
  );
}
