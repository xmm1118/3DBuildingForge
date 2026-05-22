import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Line, OrbitControls, RoundedBox, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { CELL_BODY, CELL_TYPES, ORGANELLES } from '../domain/cellData.js'
import { getModelCellId } from '../domain/cellCatalog.js'
import { exportObjectAsGlb } from '../lib/downloads.js'
import { buildLayeredPngVisual, createImageReliefGeometry } from '../lib/imagePipeline.js'
import { pickSpherePoint, seeded } from '../lib/math.js'
import { canUseWebGL } from '../lib/webgl.js'
import { apiUrl } from '../services/modelApi.js'

function ClickableGroup({ id, onSelect, children, ...props }) {
  return (
    <group
      {...props}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(id)
      }}
    >
      {children}
    </group>
  )
}

const DEFAULT_PRESENTATION_DURATION = 7600
const DEFAULT_CELL_CAMERA_POSITION = [0, 0.1, 6.05]
const DEFAULT_RELIEF_CAMERA_POSITION = [0, 0.18, 5.35]
const DEFAULT_CAMERA_TARGET = [0, 0, 0]
const PRESENTATION_DURATION_BY_PROFILE = {
  site: 9000,
  campus: 7800,
  tower: 7200,
  hospital: 8600,
  factory: 8200,
  museum: 7600,
}

function smoothPingPong(elapsed, durationMs) {
  const durationSeconds = Math.max(1, durationMs / 1000)
  const phase = (elapsed % durationSeconds) / durationSeconds
  return {
    phase,
    sweep: 0.5 - Math.cos(phase * Math.PI * 2) * 0.5,
    wave: Math.sin(phase * Math.PI * 2),
    lift: Math.sin(phase * Math.PI * 4),
  }
}

function lookAt(camera, target) {
  camera.lookAt(target[0], target[1], target[2])
}

function resetTransform(object) {
  object.position.set(0, 0, 0)
  object.rotation.set(0, 0, 0)
  object.scale.setScalar(1)
}

function PresentationMotionRig({
  enabled,
  motionProfile = 'product',
  targetRef,
  defaultCameraPosition = DEFAULT_CELL_CAMERA_POSITION,
  defaultTarget = DEFAULT_CAMERA_TARGET,
}) {
  const { camera } = useThree()

  useEffect(() => {
    const target = targetRef.current

    if (!enabled) {
      if (target) resetTransform(target)
      camera.position.set(defaultCameraPosition[0], defaultCameraPosition[1], defaultCameraPosition[2])
      lookAt(camera, defaultTarget)
      return undefined
    }

    return () => {
      if (target) resetTransform(target)
      camera.position.set(defaultCameraPosition[0], defaultCameraPosition[1], defaultCameraPosition[2])
      lookAt(camera, defaultTarget)
    }
  }, [camera, defaultCameraPosition, defaultTarget, enabled, targetRef])

  useFrame(({ clock }) => {
    if (!enabled || !targetRef.current) return

    const { sweep, wave, lift } = smoothPingPong(clock.elapsedTime, PRESENTATION_DURATION_BY_PROFILE[motionProfile] || DEFAULT_PRESENTATION_DURATION)
    const root = targetRef.current

    if (motionProfile === 'artifact') {
      root.position.set(wave * 0.035, -0.03 + lift * 0.01, 0.02 - sweep * 0.1)
      root.rotation.set(-0.06 + lift * 0.012, -0.74 + sweep * 1.48, wave * 0.01)
      root.scale.setScalar(1.02 + sweep * 0.05)
      camera.position.set(1.05 + wave * 0.36, 0.74 + lift * 0.035, 4.78 - sweep * 0.32)
      lookAt(camera, [0, 0.08, 0])
      return
    }

    if (motionProfile === 'road') {
      root.position.set(wave * 0.08, -0.08 + wave * 0.018, -0.7 + sweep * 1.12)
      root.rotation.set(-0.09 + lift * 0.01, -0.34 + sweep * 0.52, wave * 0.012)
      root.scale.setScalar(0.9 + sweep * 0.18)
      camera.position.set(2.45 - sweep * 0.72, 0.62 + wave * 0.05, 4.92 - sweep * 0.42)
      lookAt(camera, [0, 0.02, 0.08 + sweep * 0.2])
      return
    }

    if (motionProfile === 'aircraft') {
      root.position.set(-0.82 + sweep * 1.64, 0.2 + wave * 0.18, -0.14 + sweep * 0.22)
      root.rotation.set(-0.08 + wave * 0.04, -0.82 + sweep * 1.42, -wave * 0.32)
      root.scale.setScalar(0.92 + sweep * 0.1)
      camera.position.set(2.65 - sweep * 1.08, 1.46 + lift * 0.06, 5.04 - sweep * 0.34)
      lookAt(camera, [root.position.x * 0.32, 0.08 + root.position.y * 0.22, -0.08])
      return
    }

    if (motionProfile === 'vessel') {
      root.position.set(-0.62 + sweep * 1.24, -0.05 + wave * 0.008, 0.02)
      root.rotation.set(-0.035, -0.2 + sweep * 0.4, wave * 0.006)
      root.scale.setScalar(1)
      camera.position.set(4.45 - sweep * 1.42, 1.04 + lift * 0.025, 5.28)
      lookAt(camera, [0.05, 0.04, 0])
      return
    }

    if (motionProfile === 'specimen') {
      root.position.set(wave * 0.05, lift * 0.018, 0.06 - sweep * 0.12)
      root.rotation.set(-0.12 + lift * 0.035, -0.54 + sweep * 1.08, wave * 0.025)
      root.scale.setScalar(1)
      camera.position.set(wave * 0.42, 0.32 + lift * 0.035, 5.55 - sweep * 0.58)
      lookAt(camera, [0, 0.08, 0])
      return
    }

    root.position.set(wave * 0.04, lift * 0.02, 0.08 - sweep * 0.18)
    root.rotation.set(-0.08 + lift * 0.02, -0.48 + sweep * 0.96, wave * 0.018)
    root.scale.setScalar(1)
    camera.position.set(0.82 + wave * 0.58, 0.56 + lift * 0.04, 5.2 - sweep * 0.44)
    lookAt(camera, [0, 0.06, 0])
  })

  return null
}

function PresentationEnvironment({ profile }) {
  const groupRef = useRef(null)
  const stripeRefs = useRef([])
  const waveRefs = useRef([])
  const stripeOffsets = useMemo(() => Array.from({ length: 12 }, (_, index) => -5.4 + index * 0.95), [])
  const waveOffsets = useMemo(() => Array.from({ length: 9 }, (_, index) => -3.8 + index * 0.95), [])

  useFrame(({ clock }) => {
    if (profile === 'campus') {
      stripeRefs.current.forEach((stripe, index) => {
        if (!stripe) return
        stripe.position.z = ((stripeOffsets[index] + clock.elapsedTime * 3.1 + 5.6) % 11.2) - 5.6
      })
    }

    if (profile === 'hospital') {
      waveRefs.current.forEach((wave, index) => {
        if (!wave) return
        wave.position.z = ((waveOffsets[index] + clock.elapsedTime * 0.62 + 4.2) % 8.4) - 4.2
      })
    }

    if (profile === 'tower' && groupRef.current) {
      groupRef.current.position.x = Math.sin(clock.elapsedTime * 0.55) * 0.34
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.42) * 0.06
    }
  })

  if (profile === 'campus') {
    return (
      <group position={[0, -1.42, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[5.8, 11.2]} />
          <meshStandardMaterial color="#687579" transparent opacity={0.64} roughness={0.86} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.006, 0]}>
          <planeGeometry args={[2.15, 11.2]} />
          <meshStandardMaterial color="#2c3638" transparent opacity={0.46} roughness={0.92} depthWrite={false} />
        </mesh>
        <mesh position={[-1.42, 0.012, 0]}>
          <planeGeometry args={[0.035, 11.2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.76} depthWrite={false} />
        </mesh>
        <mesh position={[1.42, 0.012, 0]}>
          <planeGeometry args={[0.035, 11.2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.76} depthWrite={false} />
        </mesh>
        {[-2.18, 2.18].map((x) => (
          <Line
            key={x}
            points={[[x, 0.03, -5.3], [x, 0.03, 5.3]]}
            color="#d7e5e7"
            lineWidth={2.2}
            transparent
            opacity={0.48}
          />
        ))}
        {stripeOffsets.map((z, index) => (
          <mesh
            key={z}
            ref={(node) => {
              stripeRefs.current[index] = node
            }}
            position={[0, 0.018, z]}
          >
            <planeGeometry args={[0.09, 0.54]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.76} depthWrite={false} />
          </mesh>
        ))}
      </group>
    )
  }

  if (profile === 'tower') {
    return (
      <group ref={groupRef} position={[0, 0.45, -0.35]}>
        {[
          [-2.4, 1.15, -0.45, 0.62],
          [1.9, 1.0, -0.6, 0.5],
          [-1.4, -0.9, -0.55, 0.42],
        ].map(([x, y, z, scale], index) => (
          <group key={index} position={[x, y, z]} scale={scale}>
            {[-0.28, 0, 0.32].map((offset, cloudIndex) => (
              <mesh key={cloudIndex} position={[offset, Math.sin(cloudIndex) * 0.06, 0]}>
                <sphereGeometry args={[0.34, 24, 24]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.22} depthWrite={false} />
              </mesh>
            ))}
          </group>
        ))}
        {[-1.55, -0.92, -0.28, 0.36, 0.98, 1.54].map((y, index) => (
          <Line
            key={y}
            points={[
              [-3.2, y, -0.12 - index * 0.04],
              [-0.4, y + 0.18, 0.1],
              [3.4, y + 0.44, 0.28 + index * 0.03],
            ]}
            color={index % 2 ? '#ffffff' : '#7fb2cf'}
            lineWidth={index % 2 ? 1.1 : 1.6}
            transparent
            opacity={index % 2 ? 0.36 : 0.26}
          />
        ))}
      </group>
    )
  }

  if (profile === 'hospital') {
    return (
      <group position={[0, -1.36, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[6.4, 8.6]} />
          <meshStandardMaterial color="#67aebf" transparent opacity={0.5} roughness={0.72} depthWrite={false} />
        </mesh>
        {waveOffsets.map((z, index) => (
          <mesh
            key={z}
            ref={(node) => {
              waveRefs.current[index] = node
            }}
            position={[0, 0.016, z]}
          >
            <planeGeometry args={[4.8 - (index % 3) * 0.5, 0.025]} />
            <meshBasicMaterial color={index % 2 ? '#ffffff' : '#2c839b'} transparent opacity={index % 2 ? 0.78 : 0.52} depthWrite={false} />
          </mesh>
        ))}
        <mesh position={[0, 0.022, -0.7]}>
          <planeGeometry args={[3.4, 1.55]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.38} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  if (profile === 'site') {
    return (
      <group>
        <spotLight position={[0, 4.4, 2.8]} angle={0.38} penumbra={0.78} intensity={4.2} color="#ffd29a" />
        <pointLight position={[-2.8, 1.1, 1.8]} intensity={1.1} color="#7dd3fc" />
        <mesh position={[0, -1.42, 0]} receiveShadow>
          <cylinderGeometry args={[1.38, 1.62, 0.24, 96]} />
          <meshStandardMaterial color="#1c1713" metalness={0.18} roughness={0.48} />
        </mesh>
        <mesh position={[0, -1.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.52, 96]} />
          <meshBasicMaterial color="#c7923a" transparent opacity={0.16} depthWrite={false} />
        </mesh>
        {[1.55, 1.95, 2.35].map((radius, index) => (
          <mesh key={radius} position={[0, -1.25 + index * 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.006, 8, 128]} />
            <meshBasicMaterial color="#c7923a" transparent opacity={0.26 - index * 0.05} depthWrite={false} />
          </mesh>
        ))}
      </group>
    )
  }

  if (profile === 'museum') {
    return (
      <group>
        <mesh position={[0, -1.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.25, 96]} />
          <meshStandardMaterial color="#e9f0ef" transparent opacity={0.44} roughness={0.22} metalness={0.05} depthWrite={false} />
        </mesh>
        {[-1.9, 1.9].map((x) => (
          <mesh key={x} position={[x, 0.62, -0.62]} rotation={[0.12, x > 0 ? -0.34 : 0.34, 0]}>
            <planeGeometry args={[0.52, 1.35]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
    )
  }

  if (profile === 'factory') {
    return (
      <group>
        <mesh position={[0, -1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.45, 96]} />
          <meshBasicMaterial color="#b7d7db" transparent opacity={0.18} depthWrite={false} />
        </mesh>
        {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((x) => (
          <Line key={`x-${x}`} points={[[x, -1.36, -1.8], [x, -1.36, 1.8]]} color="#8cc4cf" lineWidth={0.8} transparent opacity={0.22} />
        ))}
        {[-1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8].map((z) => (
          <Line key={`z-${z}`} points={[[-1.8, -1.36, z], [1.8, -1.36, z]]} color="#8cc4cf" lineWidth={0.8} transparent opacity={0.22} />
        ))}
      </group>
    )
  }

  return null
}


// ===== Building Body Rendering (replaces PlantCellModel and CellBodyGeometry) =====

function BuildingBody({ cellId, color, opacity, wireframe = false, wireColor = '#f4f0e4', wireOpacity = 0.12 }) {
  const matProps = wireframe
    ? { color: wireColor, wireframe: true, transparent: true, opacity: wireOpacity }
    : { color, transparent: true, opacity, roughness: 0.5, metalness: 0.05, transmission: 0.08, clearcoat: 0.35, clearcoatRoughness: 0.25 }

  switch (cellId) {
    case 'residential':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.6, 1.0, 1.0]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          <mesh position={[0, 0.72, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.22, 0.55, 4]} />
            <meshPhysicalMaterial {...matProps} color={wireframe ? wireColor : '#c4634a'} />
          </mesh>
        </group>
      )
    case 'commercial':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.0, 1.4, 1.2]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          <mesh position={[0, 0.72, 0.62]}>
            <boxGeometry args={[1.8, 0.06, 0.3]} />
            <meshPhysicalMaterial {...matProps} color={wireframe ? wireColor : '#6b7db3'} />
          </mesh>
        </group>
      )
    case 'office':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.9, 2.2, 0.8]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[0.7, 0.5, 0.65]} />
            <meshPhysicalMaterial {...matProps} color={wireframe ? wireColor : '#9b8ec4'} />
          </mesh>
        </group>
      )
    case 'cultural':
      return (
        <group>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[1.6, 0.8, 1.2]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          <mesh position={[0, 0.55, 0]} scale={[1, 0.65, 1]}>
            <sphereGeometry args={[0.88, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial {...matProps} color={wireframe ? wireColor : '#d47878'} />
          </mesh>
        </group>
      )
    case 'industrial':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.2, 0.9, 1.2]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          {[-0.55, 0.15, 0.85].map((x, i) => (
            <mesh key={i} position={[x, 0.52, 0]}>
              <boxGeometry args={[0.65, 0.2, 1.22]} />
              <meshPhysicalMaterial {...matProps} color={wireframe ? wireColor : '#4a9a7f'} />
            </mesh>
          ))}
        </group>
      )
    case 'educational':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.6, 1.2, 0.9]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          <mesh position={[0.5, -0.1, 0.75]}>
            <boxGeometry args={[0.5, 1.0, 0.3]} />
            <meshPhysicalMaterial {...matProps} color={wireframe ? wireColor : '#5a8abf'} />
          </mesh>
        </group>
      )
    case 'medical':
      return (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.4, 1.6, 1.0]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          <mesh position={[-0.9, -0.3, 0]}>
            <boxGeometry args={[0.6, 1.0, 0.8]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
          <mesh position={[0.9, -0.3, 0]}>
            <boxGeometry args={[0.6, 1.0, 0.8]} />
            <meshPhysicalMaterial {...matProps} />
          </mesh>
        </group>
      )
    default:
      return (
        <mesh>
          <boxGeometry args={[1.6, 1.2, 1.0]} />
          <meshPhysicalMaterial {...matProps} />
        </mesh>
      )
  }
}

// ===== Building-Specific Structures =====
function BuildingSpecificStructures({ cellId, onSelect }) {
  if (cellId === 'commercial') {
    return (
      <group>
        <ClickableGroup id="membrane" onSelect={onSelect}>
          {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
            <Line key={i} points={[[x, -0.7, 0.61], [x, 0.7, 0.61]]} color="#7e6edb" lineWidth={2} transparent opacity={0.6} />
          ))}
          {[-0.35, 0, 0.35].map((y, i) => (
            <Line key={y} points={[[-1.0, y, 0.61], [1.0, y, 0.61]]} color="#a78bfa" lineWidth={1.5} transparent opacity={0.5} />
          ))}
        </ClickableGroup>
      </group>
    )
  }
  if (cellId === 'office') {
    return (
      <group>
        <ClickableGroup id="membrane" onSelect={onSelect}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 2.0, 0.3]} />
            <meshStandardMaterial color="#6b7280" roughness={0.6} />
          </mesh>
          {[-0.6, -0.2, 0.2, 0.6].map((y, i) => (
            <Line key={i} points={[[-0.46, y, 0.41], [0.46, y, 0.41]]} color="#8b5cf6" lineWidth={2.5} transparent opacity={0.7} />
          ))}
        </ClickableGroup>
      </group>
    )
  }
  if (cellId === 'industrial') {
    return (
      <group>
        <ClickableGroup id="membrane" onSelect={onSelect}>
          {[-0.8, -0.15, 0.5].map((x, i) => (
            <Line key={i} points={[[x, 0.46, -0.62], [x + 0.35, 0.62, -0.62], [x + 0.7, 0.46, -0.62]]} color="#5fbf9f" lineWidth={2.5} transparent opacity={0.7} />
          ))}
          <Line points={[[-1.0, 0.25, 0], [1.0, 0.25, 0]]} color="#69c6a9" lineWidth={3} transparent opacity={0.6} />
        </ClickableGroup>
      </group>
    )
  }
  if (cellId === 'cultural') {
    return (
      <group>
        <ClickableGroup id="membrane" onSelect={onSelect}>
          <Line points={[[-0.4, -0.6, 0.61], [-0.4, -0.2, 0.61], [0, 0.0, 0.61], [0.4, -0.2, 0.61], [0.4, -0.6, 0.61]]} color="#e07a7a" lineWidth={2.5} transparent opacity={0.7} />
          {[-0.3, 0, 0.3].map((x, i) => (
            <Line key={i} points={[[x, -0.6, 0.4], [x, 0.6, 0]]} color="#f7d4cd" lineWidth={1.8} transparent opacity={0.6} />
          ))}
        </ClickableGroup>
      </group>
    )
  }
  if (cellId === 'medical') {
    return (
      <group>
        <ClickableGroup id="membrane" onSelect={onSelect}>
          <Line points={[[-0.6, 0, 0.4], [-0.6, 0, -0.4]]} color="#d25762" lineWidth={2} transparent opacity={0.6} />
          <Line points={[[0.6, 0, 0.4], [0.6, 0, -0.4]]} color="#d25762" lineWidth={2} transparent opacity={0.6} />
          {[[-0.2, 0.82, 0], [0.2, 0.82, 0], [0, 0.82, 0.2]].map((pos, i) => (
            <mesh key={i} position={pos}>
              <cylinderGeometry args={[0.06, 0.06, 0.12, 8]} />
              <meshStandardMaterial color="#9ca3af" roughness={0.4} metalness={0.3} />
            </mesh>
          ))}
        </ClickableGroup>
      </group>
    )
  }
  if (cellId === 'educational') {
    return (
      <group>
        <ClickableGroup id="membrane" onSelect={onSelect}>
          <mesh position={[0, 0, 0.46]}>
            <boxGeometry args={[1.4, 0.06, 0.12]} />
            <meshStandardMaterial color="#93c5fd" roughness={0.5} />
          </mesh>
          {[-0.4, 0.4].map((x, i) => (
            <mesh key={i} position={[x, 0.1, 0.46]}>
              <boxGeometry args={[0.35, 0.3, 0.02]} />
              <meshPhysicalMaterial color="#87ceeb" transparent opacity={0.4} roughness={0.05} transmission={0.5} />
            </mesh>
          ))}
        </ClickableGroup>
      </group>
    )
  }
  return null
}

// ===== Main Building Model (replaces both PlantCellModel and CellModel) =====
function CellModel({ cellId, selected, crossSection, onSelect, hideOthers, proofMode, viewMode = 'layers' }) {
  const group = useRef()
  const body = CELL_BODY[cellId] ?? CELL_BODY['residential']
  const xrayMode = viewMode === 'layers'
  const focusMode = viewMode === 'focus'
  const effectiveHideOthers = hideOthers || focusMode
  const effectiveCrossSection = crossSection || xrayMode
  const show = (id) => !effectiveHideOthers || id === selected || id === 'membrane'
  const bodyOpacity = effectiveHideOthers && selected !== 'membrane' ? 0.24 : effectiveCrossSection ? 0.38 : 0.66
  const wireOpacity = xrayMode ? 0.28 : selected === 'membrane' ? 0.3 : 0.12
  const proofOffset = (id) => {
    if (!proofMode) return [0, 0, 0]
    return {
      nucleus: [0.2, -0.4, 0.3],
      granules: [-0.2, 0.4, 0.3],
      lysosome: [0.3, 0, 0.4],
      mitochondria: [-0.3, 0.1, 0.5],
    }[id] ?? [0, 0, 0]
  }

  const bodyHeight = cellId === 'office' ? 1.1 : cellId === 'medical' ? 0.8 : cellId === 'commercial' ? 0.7 : 0.5

  // Equipment points (granules)
  const equipmentPoints = useMemo(() => {
    const count = cellId === 'medical' ? 20 : cellId === 'industrial' ? 16 : 12
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2
      const r = 0.3 + seeded(index) * 0.4
      return {
        position: [Math.cos(angle) * r, 0.5 + seeded(index + 10) * 0.3, Math.sin(angle) * r * 0.6],
        radius: 0.03 + seeded(index + 200) * 0.025,
        color: ['#88a4c4', '#6b9dc4', '#5b82c4', '#7ba4d4'][index % 4],
      }
    })
  }, [cellId])

  // Structural columns (lysosome)
  const structuralColumns = useMemo(() => {
    const grids = {
      commercial: [[-0.7, -0.4], [-0.7, 0.4], [0.7, -0.4], [0.7, 0.4], [0, -0.4], [0, 0.4]],
      office: [[-0.3, -0.25], [-0.3, 0.25], [0.3, -0.25], [0.3, 0.25]],
      educational: [[-0.5, 0.3], [0.5, 0.3], [-0.5, -0.3], [0.5, -0.3], [0, 0.3], [0, -0.3]],
      medical: [[-0.4, 0.3], [0.4, 0.3], [-0.4, -0.3], [0.4, -0.3], [0, 0.3], [0, -0.3], [0, 0]],
      cultural: [[-0.5, 0.3], [0.5, 0.3], [0, 0], [-0.5, -0.3], [0.5, -0.3]],
      industrial: [[-0.8, 0.4], [-0.8, -0.4], [0, 0.4], [0, -0.4], [0.8, 0.4], [0.8, -0.4]],
    }
    return grids[cellId] ?? [[-0.4, 0.2], [0.4, 0.2], [-0.4, -0.2], [0.4, -0.2]]
  }, [cellId])

  return (
    <group ref={group} scale={1.8} rotation={[-0.08, -0.42, 0.05]}>
      {/* 围护结构 - 建筑外壳 */}
      <ClickableGroup id="membrane" onSelect={onSelect}>
        <BuildingBody cellId={cellId} color={body.color} opacity={Math.min(bodyOpacity + 0.2, 0.95)} />
        <BuildingBody cellId={cellId} color={body.color} opacity={1} wireframe wireColor={xrayMode ? '#6bc4d8' : '#f4f0e4'} wireOpacity={wireOpacity} />
      </ClickableGroup>

      {/* 剖面 */}
      {effectiveCrossSection && (
        <mesh position={[0, 0, 0.1]} rotation={[0, 0, 0]} scale={[1.6, 1.3, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#f6e9dc" transparent opacity={0.32} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 基础 */}
      {show('nucleus') && cellId !== 'industrial' && (
        <ClickableGroup id="nucleus" onSelect={onSelect} position={proofOffset('nucleus')}>
          <mesh position={[0, -bodyHeight - 0.15, 0]}>
            <boxGeometry args={[cellId === 'commercial' ? 2.2 : 1.8, 0.15, cellId === 'commercial' ? 1.4 : 1.2]} />
            <meshPhysicalMaterial color="#8b8680" roughness={0.85} clearcoat={0.1} emissive={selected === 'nucleus' ? '#4c1d95' : '#000'} emissiveIntensity={selected === 'nucleus' ? 0.15 : 0} />
          </mesh>
          {selected === 'nucleus' && (
            <mesh position={[0, -bodyHeight - 0.15, 0]}>
              <boxGeometry args={[cellId === 'commercial' ? 2.26 : 1.86, 0.21, cellId === 'commercial' ? 1.46 : 1.26]} />
              <meshBasicMaterial color="#7b4bb4" wireframe transparent opacity={0.28} />
            </mesh>
          )}
        </ClickableGroup>
      )}

      {/* 结构体系 - 柱网与梁 */}
      {show('lysosome') && cellId !== 'industrial' && cellId !== 'medical' && (
        <ClickableGroup id="lysosome" onSelect={onSelect} position={proofOffset('lysosome')}>
          {structuralColumns.map(([x, z], i) => (
            <mesh key={i} position={[x, 0, z]}>
              <cylinderGeometry args={[0.035, 0.035, bodyHeight * 2, 8]} />
              <meshStandardMaterial color="#6b7280" emissive={selected === 'lysosome' ? '#8d58b8' : '#374151'} emissiveIntensity={selected === 'lysosome' ? 0.3 : 0.05} roughness={0.4} metalness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, bodyHeight * 0.8, 0]}>
            <boxGeometry args={[1.4, 0.04, 0.8]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.5} />
          </mesh>
        </ClickableGroup>
      )}

      {/* 围护结构补充 - 外墙保温层/屋面板 */}
      {show('mitochondria') && cellId !== 'industrial' && (
        <ClickableGroup id="mitochondria" onSelect={onSelect} position={proofOffset('mitochondria')}>
          <mesh position={[0, 0, 0.52]}>
            <boxGeometry args={[1.5, bodyHeight * 1.6, 0.04]} />
            <meshStandardMaterial color="#df7046" emissive="#c2410c" emissiveIntensity={selected === 'mitochondria' ? 0.25 : 0.08} roughness={0.45} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, bodyHeight + 0.04, 0]}>
            <boxGeometry args={[1.4, 0.04, 0.9]} />
            <meshStandardMaterial color="#e07040" roughness={0.5} />
          </mesh>
        </ClickableGroup>
      )}

      {/* 设备系统 - 管线与设备点 */}
      {show('granules') && cellId !== 'industrial' && (
        <ClickableGroup id="granules" onSelect={onSelect} position={proofOffset('granules')}>
          {equipmentPoints.map((pt, i) => (
            <mesh key={i} position={pt.position}>
              <sphereGeometry args={[pt.radius, 12, 12]} />
              <meshStandardMaterial color={pt.color} emissive={selected === 'granules' ? '#5b82c4' : '#1e293b'} emissiveIntensity={selected === 'granules' ? 0.25 : 0.02} roughness={0.3} metalness={0.4} />
            </mesh>
          ))}
        </ClickableGroup>
      )}

      {/* 室内楼板 */}
      {show('granules') && cellId !== 'industrial' && (
        <ClickableGroup id="granules" onSelect={onSelect}>
          {cellId === 'office' ? (
            [-0.3, 0, 0.3, 0.6].map((y, i) => (
              <mesh key={i} position={[0, y, 0]}>
                <boxGeometry args={[0.7, 0.03, 0.6]} />
                <meshStandardMaterial color="#d1d5db" transparent opacity={0.4} roughness={0.6} />
              </mesh>
            ))
          ) : (
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1.2, 0.03, 0.7]} />
              <meshStandardMaterial color="#d1d5db" transparent opacity={0.4} roughness={0.6} />
            </mesh>
          )}
        </ClickableGroup>
      )}

      <BuildingSpecificStructures cellId={cellId} onSelect={onSelect} />
    </group>
  )
}

function SceneExportBridge({ exportRoot, onExporterReady }) {
  useEffect(() => {
    if (typeof onExporterReady !== 'function') return undefined

    const exportCurrentModel = () => exportObjectAsGlb(exportRoot.current)
    onExporterReady(() => exportCurrentModel)

    return () => onExporterReady(null)
  }, [exportRoot, onExporterReady])

  return null
}

function ProofRig() {
  const gridLines = useMemo(() => {
    const lines = []
    for (let i = -4; i <= 4; i += 1) {
      lines.push({
        key: `x-${i}`,
        points: [[-2.4, -1.42, i * 0.45], [2.4, -1.42, i * 0.45]],
      })
      lines.push({
        key: `z-${i}`,
        points: [[i * 0.45, -1.42, -1.8], [i * 0.45, -1.42, 1.8]],
      })
    }
    return lines
  }, [])

  return (
    <group>
      {gridLines.map((line) => (
        <Line key={line.key} points={line.points} color="#9a8a72" lineWidth={0.8} transparent opacity={0.24} />
      ))}
      <Line points={[[-2.55, -1.38, 0], [2.65, -1.38, 0]]} color="#d94a4a" lineWidth={3.2} transparent opacity={0.78} />
      <Line points={[[0, -1.48, 0], [0, 1.72, 0]]} color="#45a464" lineWidth={3.2} transparent opacity={0.78} />
      <Line points={[[0, -1.38, -2.05], [0, -1.38, 2.25]]} color="#3b82f6" lineWidth={3.2} transparent opacity={0.78} />
      {[0.65, 1.15, 1.65].map((radius) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, 0]} position={[0, -1.36, 0]}>
          <torusGeometry args={[radius, 0.006, 8, 96]} />
          <meshBasicMaterial color="#7c6d5a" transparent opacity={0.22} />
        </mesh>
      ))}
    </group>
  )
}

export class ViewerErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    this.props.onError?.(error)
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

function GeneratedGlbModel({ modelUrl, proofMode, viewMode = 'solid', onSelect }) {
  const gltf = useGLTF(modelUrl)
  const { object, scale } = useMemo(() => {
    const cloned = gltf.scene.clone(true)
    const xrayMode = viewMode === 'layers'
    const focusMode = viewMode === 'focus'
    const prepareMaterial = (sourceMaterial) => {
      if (xrayMode) {
        return new THREE.MeshBasicMaterial({
          color: '#60c8df',
          transparent: true,
          opacity: 0.36,
          wireframe: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      }

      const material = sourceMaterial?.clone
        ? sourceMaterial.clone()
        : new THREE.MeshStandardMaterial({ color: '#dbe7ea', roughness: 0.42, metalness: 0.04 })

      material.side = THREE.DoubleSide
      material.envMapIntensity = Math.max(material.envMapIntensity || 0, focusMode ? 1.75 : 1.15)

      if (focusMode && 'emissive' in material) {
        material.emissive = new THREE.Color('#12384d')
        material.emissiveIntensity = Math.max(material.emissiveIntensity || 0, 0.12)
      }

      if (focusMode && 'roughness' in material) material.roughness = Math.min(material.roughness ?? 0.48, 0.36)
      if (focusMode && 'metalness' in material) material.metalness = Math.max(material.metalness ?? 0, 0.04)

      material.needsUpdate = true
      return material
    }

    cloned.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      node.renderOrder = xrayMode ? 6 : 0
      if (node.material) {
        node.material = Array.isArray(node.material)
          ? node.material.map((material) => prepareMaterial(material))
          : prepareMaterial(node.material)
      }
    })

    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const longest = Math.max(size.x, size.y, size.z) || 1
    cloned.position.sub(center)

    return {
      object: cloned,
      scale: 3.25 / longest,
    }
  }, [gltf.scene, viewMode])

  return (
    <group
      scale={scale * (proofMode ? 0.92 : 1)}
      rotation={[-0.12, -0.2, 0]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect('membrane')
      }}
    >
      <primitive object={object} />
    </group>
  )
}

function CinematicReliefSpecimen({ imageUrl, autoRotate, onSelect, viewMode = 'layers' }) {
  const groupRef = useRef(null)
  const xrayMode = viewMode === 'layers'
  const focusMode = viewMode === 'focus'
  const sourceTexture = useTexture(imageUrl)
  const texture = useMemo(() => {
    const nextTexture = sourceTexture.clone()
    nextTexture.colorSpace = THREE.SRGBColorSpace
    nextTexture.anisotropy = 12
    nextTexture.generateMipmaps = false
    nextTexture.minFilter = THREE.LinearFilter
    nextTexture.magFilter = THREE.LinearFilter
    nextTexture.wrapS = THREE.ClampToEdgeWrapping
    nextTexture.wrapT = THREE.ClampToEdgeWrapping
    nextTexture.needsUpdate = true
    return nextTexture
  }, [sourceTexture])
  const relief = useMemo(() => createImageReliefGeometry(sourceTexture.image), [sourceTexture.image])

  useEffect(() => () => {
    texture.dispose()
    relief.geometry.dispose()
    relief.slabGeometry.dispose()
  }, [relief, texture])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (autoRotate) groupRef.current.rotation.y += delta * 0.22
  })

  return (
    <group ref={groupRef} rotation={[-0.12, -0.18, 0]} onClick={(event) => {
      event.stopPropagation()
      onSelect('membrane')
    }}>
      <mesh geometry={relief.geometry} position={[0, 0, 0.18]} renderOrder={10}>
        <meshPhysicalMaterial
          map={texture}
          alphaTest={xrayMode ? 0.16 : 0.24}
          transparent={xrayMode}
          opacity={xrayMode ? 0.78 : 1}
          depthWrite={!xrayMode}
          roughness={focusMode ? 0.34 : 0.46}
          metalness={0.02}
          clearcoat={focusMode ? 0.66 : 0.42}
          clearcoatRoughness={0.18}
          envMapIntensity={focusMode ? 1.72 : 1.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {xrayMode && (
        <mesh geometry={relief.geometry} position={[0, 0, 0.185]} renderOrder={11}>
          <meshBasicMaterial color="#5fc6df" wireframe transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function CinematicReliefScene({ imageUrl, autoRotate, presentationMode, motionProfile, onSelectOrganelle, viewMode }) {
  const presentationRoot = useRef(null)

  return (
    <Canvas
      className="cinematic-relief-canvas"
      camera={{ position: [0, 0.18, 5.35], fov: 34 }}
      shadows
      dpr={[1, 1]}
      gl={{ antialias: true, alpha: presentationMode, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.14
      }}
    >
      {!presentationMode && <color attach="background" args={['#f6efdf']} />}
      <ambientLight intensity={0.84} />
      <directionalLight castShadow position={[3.6, 4.8, 5.8]} intensity={3.8} color="#fff7e8" shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4.2, 2.1, 3.2]} intensity={1.55} color="#d6eef8" />
      <pointLight position={[0.8, -2.6, 2.6]} intensity={1.3} color="#f4a6c8" />
      <pointLight position={[-2.8, 1.2, 1.8]} intensity={0.92} color="#bde8b0" />
      {presentationMode && <PresentationEnvironment profile={motionProfile} />}
      <PresentationMotionRig
        enabled={presentationMode}
        motionProfile={motionProfile}
        targetRef={presentationRoot}
        defaultCameraPosition={DEFAULT_RELIEF_CAMERA_POSITION}
      />
      <Suspense fallback={null}>
        <group ref={presentationRoot}>
          <CinematicReliefSpecimen imageUrl={imageUrl} autoRotate={autoRotate && !presentationMode} onSelect={onSelectOrganelle} viewMode={viewMode} />
        </group>
      </Suspense>
      <OrbitControls enabled={!presentationMode} enablePan={false} minDistance={3.15} maxDistance={6.2} enableDamping dampingFactor={0.08} autoRotate={autoRotate && !presentationMode} autoRotateSpeed={0.32} />
    </Canvas>
  )
}

export function CinematicLayerVisual({ imageUrl, selectedOrganelle, onSelectOrganelle, autoRotate, presentationMode = false, motionProfile = 'specimen', viewMode = 'layers' }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [visualState, setVisualState] = useState(null)
  const visual = visualState?.imageUrl === imageUrl ? visualState.visual : null
  const webglAvailable = canUseWebGL()

  useEffect(() => {
    let cancelled = false

    if (webglAvailable) {
      return () => {
        cancelled = true
      }
    }

    buildLayeredPngVisual(imageUrl)
      .then((nextVisual) => {
        if (!cancelled) setVisualState({ imageUrl, visual: nextVisual })
      })
      .catch((error) => {
        console.warn(error)
        if (!cancelled) {
          setVisualState({
            imageUrl,
            visual: {
              aspect: 1,
              layers: [{ id: 'source', className: 'layer-body', url: imageUrl, z: 0, shiftX: 0, shiftY: 0, scale: 1, opacity: 1 }],
            },
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl, webglAvailable])

  function handlePointerMove(event) {
    if (webglAvailable) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    setPointer({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    })
  }

  return (
    <div
      className={`cinematic-layer-scene mode-${viewMode}`}
      style={{ '--px': pointer.x.toFixed(3), '--py': pointer.y.toFixed(3) }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        if (!webglAvailable) setPointer({ x: 0, y: 0 })
      }}
      onClick={() => onSelectOrganelle('membrane')}
    >
      {!webglAvailable && <div className="cinematic-depth-field" />}
      {webglAvailable ? (
        <CinematicReliefScene imageUrl={imageUrl} autoRotate={autoRotate} presentationMode={presentationMode} motionProfile={motionProfile} onSelectOrganelle={onSelectOrganelle} viewMode={viewMode} />
      ) : (
        <div
          className={`layered-png-stage motion-${motionProfile} ${autoRotate ? 'auto' : ''}`}
          style={{ '--layer-aspect': visual?.aspect || 1 }}
          aria-label="Layered transparent PNG model visual"
        >
          {visual ? (
            visual.layers.map((layer) => (
              <img
                key={layer.id}
                className={`cinematic-png-layer ${layer.className}`}
                src={layer.url}
                alt=""
                style={{
                  '--z': `${layer.z}px`,
                  '--shift-x': `${layer.shiftX}px`,
                  '--shift-y': `${layer.shiftY}px`,
                  '--scale': layer.scale,
                  '--layer-opacity': layer.opacity,
                }}
              />
            ))
          ) : (
            <div className="layered-png-loading">
              <span />
              Building PNG layers
            </div>
          )}
        </div>
      )}
      <button type="button" className="cinematic-hotspot" style={{ '--label-color': ORGANELLES[selectedOrganelle]?.accent || '#72a4bf' }} onClick={(event) => {
        event.stopPropagation()
        onSelectOrganelle(selectedOrganelle)
      }}>
        <span />
        {ORGANELLES[selectedOrganelle]?.title || 'Layer'}
      </button>
    </div>
  )
}

export function CellScene({ selectedCell, modelCellId, referenceImageUrl, generatedModelUrl, selectedOrganelle, crossSection, autoRotate, hideOthers, proofMode, viewMode = 'layers', renderQuality, presentationMode = false, motionProfile = 'specimen', onSelectOrganelle, onExporterReady = null }) {
  const presentationRoot = useRef(null)
  const exportRoot = useRef(null)
  const dpr = renderQuality === 'high' ? [1, 2] : [1, 1.4]

  if (!canUseWebGL()) return null

  return (
    <Canvas
      camera={{ position: [0, 0.1, 6.05], fov: 35 }}
      shadows
      dpr={dpr}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
      }}
      fallback={<CellFallback selectedCell={selectedCell} modelCellId={modelCellId} referenceImageUrl={referenceImageUrl} selectedOrganelle={selectedOrganelle} onSelectOrganelle={onSelectOrganelle} />}
    >
      {!presentationMode && <color attach="background" args={['#f5efdf']} />}
      <ambientLight intensity={0.82} />
      <directionalLight castShadow position={[4, 5, 5]} intensity={3.4} color="#fff7ed" shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4.5, 2.6, 3]} intensity={1.65} color="#dbeafe" />
      <pointLight position={[0, -3.2, 2.4]} intensity={1.35} color="#f9a8d4" />
      <pointLight position={[-2.4, 1.2, 1.6]} intensity={0.75} color="#b8f7a6" />
      {proofMode && <ProofRig />}
      {presentationMode && <PresentationEnvironment profile={motionProfile} />}
      <PresentationMotionRig enabled={presentationMode} motionProfile={motionProfile} targetRef={presentationRoot} />
      <group ref={presentationRoot}>
        <group ref={exportRoot} name={`${selectedCell}-model-export-root`}>
          {generatedModelUrl ? (
            <Suspense fallback={null}>
              <GeneratedGlbModel modelUrl={apiUrl(generatedModelUrl)} proofMode={proofMode} viewMode={viewMode} onSelect={onSelectOrganelle} />
            </Suspense>
          ) : (
            <CellModel cellId={modelCellId} selected={selectedOrganelle} crossSection={crossSection} hideOthers={hideOthers} proofMode={proofMode} viewMode={viewMode} onSelect={onSelectOrganelle} />
          )}
        </group>
      </group>
      <SceneExportBridge exportRoot={exportRoot} onExporterReady={onExporterReady} />
      <ContactShadows frames={1} position={[0, -1.32, 0]} opacity={0.2} scale={5.4} blur={2.4} far={2.8} color="#8a7355" />
      <OrbitControls enabled={!presentationMode} enablePan={false} minDistance={proofMode ? 4 : 3.3} maxDistance={proofMode ? 7.4 : 6.4} enableDamping dampingFactor={0.08} autoRotate={!presentationMode && (autoRotate || proofMode)} autoRotateSpeed={proofMode ? 0.75 : 0.45} />
    </Canvas>
  )
}

export function CellFallback({ selectedCell, modelCellId, referenceImageUrl, selectedOrganelle, onSelectOrganelle }) {
  if (referenceImageUrl) {
    return (
      <div className="cell-fallback upload-render-fallback" aria-label="Uploaded model image fallback">
        <img src={referenceImageUrl} alt="Uploaded model reference" />
      </div>
    )
  }

  // No fallback for building types - 3D Canvas handles rendering
  return null
}
