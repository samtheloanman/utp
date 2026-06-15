'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, Text, Float, ContactShadows } from '@react-three/drei';
import { Suspense, useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function AnimatedText() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialRef = useRef<any>(null);
  const [content, setContent] = useState("4,281,902");

  useEffect(() => {
    // ScrollTrigger to animate text content and material properties
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero-container",
        start: "top top",
        end: "bottom center",
        scrub: 1,
      }
    });

    tl.to(materialRef.current, {
      transmission: 0.9,
      roughness: 0.1,
      thickness: 2,
      ior: 1.5,
      color: "#17A6C8", // Civic teal
      duration: 1
    }, 0);

    tl.to(textRef.current.position, {
      z: 2,
      duration: 1
    }, 0);

    // Change text halfway
    tl.call(() => {
      setContent("VOICE OF THE PEOPLE");
    }, [], 0.5);
    
    // Animate back
    tl.call(() => {
      setContent("4,281,902");
    }, [], 0.49); // Reverse direction

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <Text
        ref={textRef}
        font="https://fonts.gstatic.com/s/schibstedgrotesk/v2/DHIZX_X_H_OovQO6Yd4iL-P-2a8uL5H_D3EIf-E.woff"
        fontSize={1.5}
        maxWidth={200}
        lineHeight={1}
        letterSpacing={0.02}
        textAlign="center"
        position={[0, 0, 0]}
      >
        {content}
        <meshPhysicalMaterial 
          ref={materialRef}
          color="#0E7C96"
          transmission={0.5}
          opacity={1}
          metalness={0.1}
          roughness={0.4}
          ior={1.2}
          thickness={0.5}
          transparent
        />
      </Text>
    </Float>
  );
}

export function HeroCanvas() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <Environment preset="city" />
          <AnimatedText />
          <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={20} blur={2} far={4} />
        </Suspense>
      </Canvas>
    </div>
  );
}
