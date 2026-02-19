"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MirrorLogoProps {
    className?: string; // Additional classes
}

export function MirrorLogo({ className }: MirrorLogoProps) {
    return (
        <div className={cn("relative flex items-center justify-center rounded-full overflow-hidden", className)}>
            {/* Background with Noise Texture */}
            <div className="absolute inset-0 bg-black rounded-full" />
            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full relative z-10"
                whileHover="hover"
                initial="rest"
            >
                {/* --- Falling Reflection (The "Waterfall" of Light) --- */}
                <motion.rect
                    x="0"
                    y="-24"
                    width="24"
                    height="24"
                    fill="url(#falling-light)"
                    opacity="0.4"
                    animate={{ y: [0, 48] }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 0.5
                    }}
                    style={{ mixBlendMode: "overlay" }}
                />

                {/* --- The Infinite Vortex with Chromatic Aberration --- */}

                {/* Cyan Channel (Offset Left) */}
                <g style={{ mixBlendMode: 'screen' }}>
                    {[0, 1, 2, 3].map((i) => (
                        <motion.circle
                            key={`cyan-${i}`}
                            cx="11.8" // Slight left offset
                            cy="12"
                            r="11"
                            stroke="cyan"
                            strokeWidth="0.5"
                            className="opacity-0"
                            animate={{
                                r: [11, 0],
                                opacity: [0, 0.6, 0],
                                strokeWidth: [0.5, 1.5, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i * 0.75,
                                ease: "circIn"
                            }}
                        />
                    ))}
                </g>

                {/* Magenta Channel (Offset Right) */}
                <g style={{ mixBlendMode: 'screen' }}>
                    {[0, 1, 2, 3].map((i) => (
                        <motion.circle
                            key={`magenta-${i}`}
                            cx="12.2" // Slight right offset
                            cy="12"
                            r="11"
                            stroke="magenta"
                            strokeWidth="0.5"
                            className="opacity-0"
                            animate={{
                                r: [11, 0],
                                opacity: [0, 0.6, 0],
                                strokeWidth: [0.5, 1.5, 0]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i * 0.75,
                                ease: "circIn"
                            }}
                        />
                    ))}
                </g>

                {/* Main White Channel (Center) */}
                {[0, 1, 2, 3].map((i) => (
                    <motion.circle
                        key={`white-${i}`}
                        cx="12"
                        cy="12"
                        r="11"
                        stroke="white"
                        strokeWidth="0.8" // Slightly thicker main line
                        className="opacity-0"
                        animate={{
                            r: [11, 0],
                            opacity: [0, 0.9, 0],
                            strokeWidth: [0.8, 1.8, 0]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 0.75,
                            ease: "circIn"
                        }}
                    />
                ))}

                {/* --- The Outer Lens Frame --- */}
                <motion.circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="url(#frame-gradient)"
                    strokeWidth="2"
                />

                {/* --- Convex Lens Glare (The "Mirror" Surface) --- */}
                <motion.ellipse
                    cx="12"
                    cy="6"
                    rx="8"
                    ry="4"
                    fill="url(#lens-glare)"
                    opacity="0.6"
                />

                {/* --- Rotating "Scanner" Highlight --- */}
                <motion.circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="url(#scanner-gradient)"
                    strokeWidth="2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />

                {/* Definitions for Gradients */}
                <defs>
                    <linearGradient id="frame-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#333333" />
                    </linearGradient>

                    <linearGradient id="lens-glare" x1="12" y1="2" x2="12" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id="scanner-gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="white" stopOpacity="1" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>

                    {/* Falling Light Gradient */}
                    <linearGradient id="falling-light" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="40%" stopColor="white" stopOpacity="0.1" />
                        <stop offset="60%" stopColor="white" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>

                    <filter id="noise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                    </filter>
                </defs>

            </motion.svg>
        </div>
    );
}
