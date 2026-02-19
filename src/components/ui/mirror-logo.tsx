"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MirrorLogoProps {
    className?: string; // Additional classes
}

const VortexRings = ({ color, opacity = 1, offset = 0 }: { color: string; opacity?: number; offset?: number }) => (
    <motion.g style={{ transform: `translateX(${offset}px)` }}>
        {[0, 1, 2, 3].map((i) => (
            <motion.circle
                key={`${color}-${i}`}
                cx="12"
                cy="12"
                r="11"
                stroke={color}
                strokeOpacity={opacity}
                strokeWidth="1" // Thinner base
                fill="none"
                initial={{ r: 11, opacity: 0, strokeWidth: 1 }}
                animate={{
                    r: [11, 0],
                    opacity: [0, 1, 0],
                    strokeWidth: [1, 2, 0] // Thinner max width (was 3)
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.75,
                    ease: "circIn"
                }}
            />
        ))}
    </motion.g>
);

export function MirrorLogo({ className }: MirrorLogoProps) {
    return (
        <div className={cn("relative flex items-center justify-center rounded-full overflow-hidden bg-black", className)}>

            {/* Background Texture */}
            <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full relative z-10"
                whileHover="hover"
                initial="rest"
            >
                {/* --- COMPOSITED VORTEX LAYERS (The "Glitch") --- */}
                {/* We render the vortex 3 times with offsets and screen blending to create PHYSICAL Chromatic Aberration */}

                {/* Red Channel - Shifted Left */}
                <g style={{ mixBlendMode: "screen" }}>
                    <VortexRings color="#FF0000" opacity={1} offset={-0.5} />
                </g>

                {/* Blue Channel - Shifted Right */}
                <g style={{ mixBlendMode: "screen" }}>
                    <VortexRings color="#0000FF" opacity={1} offset={0.5} />
                </g>

                {/* Green Channel - Center */}
                <g style={{ mixBlendMode: "screen" }}>
                    <VortexRings color="#00FF00" opacity={1} offset={0} />
                </g>

                {/* --- Falling Light Reflection --- */}
                <motion.rect
                    x="0"
                    y="-24"
                    width="24"
                    height="24"
                    fill="url(#falling-light)"
                    opacity="0.5"
                    animate={{ y: [0, 48] }}
                    transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 0.2
                    }}
                    style={{ mixBlendMode: "overlay" }}
                />

                {/* --- The Outer Lens Frame --- */}
                <motion.circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="url(#frame-gradient)"
                    strokeWidth="2"
                />

                {/* --- Top Lens Glare --- */}
                <motion.ellipse
                    cx="12"
                    cy="6"
                    rx="8"
                    ry="4"
                    fill="url(#lens-glare)"
                    opacity="0.7"
                />

                {/* --- Rotating Scanner --- */}
                <motion.circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="url(#scanner-gradient)"
                    strokeWidth="2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />

                {/* Definitions */}
                <defs>
                    <linearGradient id="frame-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#888" />
                        <stop offset="100%" stopColor="#222" />
                    </linearGradient>

                    <linearGradient id="lens-glare" x1="12" y1="2" x2="12" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </linearGradient>

                    <linearGradient id="scanner-gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="white" stopOpacity="1" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>

                    <linearGradient id="falling-light" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="40%" stopColor="white" stopOpacity="0.1" />
                        <stop offset="60%" stopColor="white" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>

            </motion.svg>
        </div>
    );
}
