"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";
import { MirrorLogo } from "@/components/ui/mirror-logo";
import { TextAnimate } from "@/components/ui/text-animate";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { MockAppUI } from "@/components/ui/mock-app-ui";

import {
  Announcement,
  AnnouncementTag,
  AnnouncementTitle,
} from "@/components/ui/announcement";
import { ArrowUpRightIcon, Globe, Megaphone, FileText } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";

const Circle = React.forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={`z-10 flex size-12 items-center justify-center border border-white/20 bg-black/60 p-3 ${className}`}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

function LandingNav() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // If loading, show nothing or skeleton
  if (loading) return null;

  // If user is logged in, show nothing (Global Navbar takes over)
  // OR we can show a specific "Go to Dashboard" if we want to keep the transparent style
  // But global navbar is fixed, so it might overlap.
  // Let's hide this local nav if user is logged in, but we need to ensure the layout pushes down.
  // Actually, the Global Navbar is fixed. If we hide this, the content moves up?
  // No, because this nav is relative.
  // If we return null, the "height: 1px" divider below allows content to start higher.
  // Since Global Navbar is fixed top, we might need a spacer if we hide this.

  if (user) {
    return <div className="h-20"></div>; // Spacer for fixed navbar
  }

  return (
    <nav className="relative z-10 flex items-center py-6 px-8 w-full mx-auto bg-black/50">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8">
          <MirrorLogo />
        </div>
        <span className="ml-1 text-lg text-white font-mono">Mirror</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        <button
          onClick={() => router.push(user ? "/projects" : "/login")}
          className="px-4 py-2 hover:bg-white/20 bg-white/5 text-xs text-white font-mono transition cursor-pointer"
        >
          {user ? "Dashboard ↗" : "Login ↗"}
        </button>
      </div>
    </nav>
  );
}

export default function Landing() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <>
      {/* Hero Section with GIF Background */}
      <div
        className="min-h-screen bg-black relative overflow-hidden"
        style={{
          backgroundImage: "url('/final.gif')",
          backgroundSize: "cover",
          backgroundPosition: "80% 50%",
          backgroundRepeat: "no-repeat",
          backgroundBlendMode: "exclusion",
        }}
      >
        <div className="absolute inset-0 z-0"></div>
        <div className="absolute inset-0 z-0"></div>
        {/* Only show local nav if user is NOT logged in (otherwise global navbar is shown) */}
        <div className="auth-check-nav">
          {/* This logic will be handled by CSS or conditional rendering based on auth state if we had access to it here. 
               Since this is a client component, let's use useAuth if possible, or just accept that for now we might have double nav 
               until we add useAuth. 
               
               Actually, let's convert this to use useAuth.
           */}
          <LandingNav />
        </div>



        {/* Hero Section */}
        <section
          className="relative flex flex-col items-center justify-center min-h-[calc(100vh-100px)] flex-1 -mt-30"
          style={{
            fontFamily: "GellixMedium, sans-serif",
            minHeight: "calc(100vh - 100px)",
          }}
        >
          {/* Radial overlay for better text legibility */}
          <div
            className="absolute inset-0 z-5"
            style={{
              background:
                "radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.3) 70%, transparent 100%)",
            }}
          ></div>

          <div className="relative z-10 w-full flex flex-col items-center">
            <Announcement className="mb-8">
              <AnnouncementTag>Status</AnnouncementTag>
              <AnnouncementTitle>
                Currently in Development
                <ArrowUpRightIcon
                  className="shrink-0 text-muted-foreground"
                  size={16}
                />
              </AnnouncementTitle>
            </Announcement>

            <TextAnimate
              animation="fadeIn"
              by="line"
              as="h1"
              className="text-5xl font-mono text-center text-white mb-6 max-w-2xl mx-auto"
            >
              {`AI agents for simulated market research`}
            </TextAnimate>
            <TextAnimate
              animation="fadeIn"
              by="line"
              as="p"
              className="mt-2 text-sm text-white/50 text-center max-w-xl mb-8 font-mono"
            >
              Get a market analysis in minutes, not months.
            </TextAnimate>
            <motion.div
              className="flex justify-center mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Button
                size="lg"
                className="font-mono text-sm px-8 py-3 cursor-pointer bg-white text-black hover:bg-white/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={() => {
                  // We need access to user here too, but Landing function doesn't use useAuth yet.
                  // Let's assume standard redirect to login which handles auth check anyway, 
                  // OR better: redirect to /projects which will redirect to login if not auth.
                  router.push("/projects");
                }}
              >
                Explore Mirror
                <ArrowUpRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Gradient fade transition */}
        <div
          className="h-32"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,1) 100%)",
          }}
        ></div>
      </div>

      {/* Rest of content with black background */}
      <div className="bg-black -mt-32">
        {/* App Preview Section */}
        <section className="relative z-10 flex justify-center items-center pb-20 px-8 -mt-50">
          <div className="relative max-w-6xl mx-auto">
            <BorderBeam />

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="relative"
              style={{ width: '1200px', maxWidth: '100%' }}
            >
              <div
                className="shadow-2xl border border-white/20 p-1 w-full overflow-hidden"
                style={{ aspectRatio: '3/2', background: '#000' }}
              >
                <MockAppUI />
              </div>
            </motion.div>
          </div>
        </section>

        <div className="max-w-7xl h-[1px] bg-white/20 mx-auto mb-20"></div>

        {/* Trusted Providers Section */}
        <section className="relative z-10 flex flex-col items-center pb-20 px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-sm font-mono text-white/70 mb-8"
            >
              Built on trusted infrastructure
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-center gap-12 flex-wrap"
            >
              {/* Cohere Logo */}
              <div className="flex items-center justify-center h-16 hover:opacity-100 transition-opacity">
                <Image
                  src="/cohere-logo.png"
                  alt="Cohere"
                  width={160}
                  height={50}
                  className="filter brightness-0 invert w-auto h-8"
                />
              </div>

              {/* Supabase Logo */}
              <div className="flex items-center justify-center h-16 hover:opacity-100 transition-opacity">
                <Image
                  src="/supabase-logo.svg"
                  alt="Supabase"
                  width={180}
                  height={50}
                  className="filter brightness-0 invert w-auto h-8"
                />
              </div>

              {/* VAPI Logo */}
              <div className="flex items-center justify-center h-16 hover:opacity-100 transition-opacity">
                <Image
                  src="/VAPI.png"
                  alt="VAPI"
                  width={100}
                  height={40}
                  className="filter brightness-0 invert w-auto h-8"
                />
              </div>

              {/* OpenAI Logo */}
              {/* <div className="flex items-center justify-center h-12 opacity-60 hover:opacity-100 transition-opacity">
              <Image
                src="/openai-logo.png"
                alt="OpenAI"
                width={100}
                height={40}
                className="filter brightness-0 invert"
              />
            </div> */}


            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative z-10 flex flex-col items-center py-20 px-8">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="inline-block px-4 py-2 bg-white/5 border border-white/10">
                <span className="text-xs font-mono text-white">
                  Product Overview
                </span>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl font-mono text-white mb-4 max-w-4xl mx-auto"
            >
              Skip months of user research with AI-powered market simulation
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm font-mono text-white/70 mb-16 max-w-2xl mx-auto"
            >
              Test ideas, posts, ads, and products against diverse AI personas.
              Get instant feedback from your target audience before you launch.
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Market Simulation Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="border border-white/10 bg-black/40 p-6 hover:bg-white/5 hover:border-white/20 transition-all duration-300 text-left group hover:shadow-lg hover:shadow-white/5"
              >
                <motion.div
                  className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors duration-300"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Globe className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-lg font-mono text-white mb-3">
                  Market Simulation
                </h3>
                <p className="text-xs font-mono text-white/60 leading-relaxed">
                  Test product launches with diverse AI personas from around the
                  globe. See real-time reactions on an interactive world map.
                </p>
              </motion.div>

              {/* Multi-Platform Testing Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="border border-white/10 bg-black/40 p-6 hover:bg-white/5 hover:border-white/20 transition-all duration-300 text-left group hover:shadow-lg hover:shadow-white/5"
              >
                <motion.div
                  className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors duration-300"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Megaphone className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-lg font-mono text-white mb-3">
                  Multi-Platform Testing
                </h3>
                <p className="text-xs font-mono text-white/60 leading-relaxed">
                  Optimize content for LinkedIn, Instagram, Twitter, TikTok, and
                  email. Each persona responds with platform-specific behavior.
                </p>
              </motion.div>

              {/* Instant Insights Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="border border-white/10 bg-black/40 p-6 hover:bg-white/5 hover:border-white/20 transition-all duration-300 text-left group hover:shadow-lg hover:shadow-white/5"
              >
                <motion.div
                  className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors duration-300"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </motion.div>
                <h3 className="text-lg font-mono text-white mb-3">
                  Instant Results
                </h3>
                <p className="text-xs font-mono text-white/60 leading-relaxed">
                  Get detailed analytics in under 60 seconds. Engagement scores,
                  sentiment analysis, and viral coefficient predictions.
                </p>
              </motion.div>

              {/* Competitor Analysis Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="border border-white/10 bg-black/40 p-6 hover:bg-white/5 hover:border-white/20 transition-all duration-300 text-left group hover:shadow-lg hover:shadow-white/5"
              >
                <motion.div
                  className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors duration-300"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-lg font-mono text-white mb-3">
                  Scout Analysis
                </h3>
                <p className="text-xs font-mono text-white/60 leading-relaxed">
                  Automatically crawl and analyze competitor websites. Compare
                  strategies and find market gaps.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ASCII Art Section with Footer overlay */}
        <section className="relative z-0 w-full bg-black overflow-hidden -mt-40" style={{ height: "750px" }}>
          <div
            className="w-full h-full"
            style={{
              backgroundImage: "url('/ascii2.png')",
              backgroundSize: "100% auto",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
              filter: "brightness(1.2) contrast(1.5)",
              mixBlendMode: "lighten"
            }}
          />

          {/* Footer overlaying ASCII art at bottom */}
          <footer className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-sm border-t border-white/10 py-8">
            <div className="max-w-6xl mx-auto px-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6">
                    <MirrorLogo />
                  </div>
                  <span className="text-sm text-white font-mono">Mirror</span>
                </div>
                <div className="text-xs text-white/40 font-mono">
                  © 2026 Mirror. AI agents for simulated market research.
                </div>
                <div className="flex items-center gap-6 text-xs font-mono">
                  <a href={user ? "/projects" : "/login"} className="text-white/60 hover:text-white transition">
                    {user ? "Dashboard ↗" : "Login"}
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </section>

      </div>
    </>
  );
}
