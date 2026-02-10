import React from "react";
import Image from "next/image";
import { ArrowUpRightIcon } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-black text-white pt-20">
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-mono mb-4 text-white">About Tunnel</h1>
                    <p className="text-white/60 font-mono text-lg max-w-2xl mx-auto">
                        Reviewing the future of market research with AI-powered simulations.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-mono text-white">Our Mission</h2>
                        <p className="text-white/70 font-mono leading-relaxed">
                            Tunnel allows you to test your ideas, products, and content against accurate
                            AI personas. We believe that qualitative feedback should be instant,
                            accessible, and scalable.
                        </p>
                        <p className="text-white/70 font-mono leading-relaxed">
                            By simulating human behavior, we help creators and businesses skip
                            months of traditional user research and launch with confidence.
                        </p>
                    </div>
                    <div className="relative h-64 w-full bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 font-mono">
                            [Tunnel Vision Visualization]
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-12">
                    <h2 className="text-2xl font-mono text-white mb-8 text-center">The Team</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {/* Team Member Placeholder */}
                        <div className="p-6 border border-white/10 bg-white/5 rounded-lg text-center">
                            <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4"></div>
                            <h3 className="text-white font-mono">Deepanjan Pati</h3>
                            <p className="text-white/50 text-sm font-mono">Founder & CEO</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
