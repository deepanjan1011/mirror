<div align="center">

<br />

<img src="./public/mirror-logo-animated.svg" width="100" alt="Mirror Logo" />

<br />
<br />

# M I R R O R

<p><strong>AI agents for simulated market research.</strong><br/>
Test your idea against 200+ intelligent personas — before you build it.</p>

<br />

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-0f172a?style=flat-square&logo=tailwind-css&logoColor=38BDF8)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-1C1C1C?style=flat-square&logo=supabase&logoColor=3ECF8E)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Status](https://img.shields.io/badge/Status-In_Development-f59e0b?style=flat-square)](#)

<br />
<br />

<img src="./public/img.png" alt="Mirror — AI-powered market simulation dashboard with interactive 3D globe" width="88%" style="border-radius: 8px;" />

<br />
<sub>The Mirror dashboard — type an idea, watch the world react.</sub>

<br />
<br />

</div>

---

<br />

## &nbsp; What is Mirror?

Mirror is an **AI-powered market simulation platform**. Instead of spending months on surveys and focus groups, you submit a product idea, an ad, or a campaign — and Mirror runs it through 200+ AI personas distributed across the globe. You get engagement scores, sentiment breakdowns, geographic heatmaps, and the ability to *call* any persona directly and talk through their feedback.

Market research in minutes, not months.

<br />

---

<br />

## &nbsp; Features

<br />

<table>
<tr>
<td valign="top" width="50%">

**🌍 &nbsp; Global Market Simulation**

An interactive Three.js 3D globe renders live persona reactions as they come in. Green for interested, yellow for mixed, red for skeptical. Watch your idea travel the world.

</td>
<td valign="top" width="50%">

**🎯 &nbsp; AI Focus Group Selection**

Cohere embeddings and semantic reranking find the 5 personas most relevant to your idea — matched by industry, psychographics, and interests. Nothing random.

</td>
</tr>
<tr><td colspan="2"><br /></td></tr>
<tr>
<td valign="top">

**🎙️ &nbsp; Voice Calls with Personas**

Call any persona after a simulation using VAPI voice AI. They remember their reaction and speak in character. Ask what would change their mind.

</td>
<td valign="top">

**📢 &nbsp; Multi-Platform Content Testing**

Optimize content for LinkedIn, Instagram, Twitter, TikTok, and email. Each persona responds with platform-appropriate behavior.

</td>
</tr>
<tr><td colspan="2"><br /></td></tr>
<tr>
<td valign="top">

**⚡ &nbsp; Instant Analytics**

Engagement scores, sentiment distribution, viral coefficient predictions, and demographic breakdowns — by generation, industry, seniority, and geography — in under 60 seconds.

</td>
<td valign="top">

**🔍 &nbsp; Scout: Competitor Intelligence**

Crawl and analyze competitor websites automatically. Extract their positioning, messaging, and strategy. Find market gaps before you launch.

</td>
</tr>
</table>

<br />

---

<br />

## &nbsp; How It Works

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │   1. Submit Idea      →   Type your pitch, ad, or content        │
  │                                                                  │
  │   2. AI Matching      →   Cohere finds the best-fit personas     │
  │                                                                  │
  │   3. Simulation       →   200+ personas react in real time       │
  │                                                                  │
  │   4. Explore Globe    →   See geographic interest heatmap        │
  │                                                                  │
  │   5. Voice Call       →   Talk to any persona via VAPI           │
  │                                                                  │
  │   6. Refine & Retry   →   AI rewrites your pitch, re-simulate    │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
```

<br />

---

<br />

## &nbsp; Tech Stack

<br />

<table>
<tr>
<th align="left">Layer</th>
<th align="left">Technology</th>
</tr>
<tr>
<td><strong>Framework</strong></td>
<td>Next.js 15 (App Router) · React 19 · TypeScript</td>
</tr>
<tr>
<td><strong>Styling</strong></td>
<td>Tailwind CSS 4 · Framer Motion · Radix UI · shadcn/ui</td>
</tr>
<tr>
<td><strong>3D & Visualization</strong></td>
<td>Three.js · React Three Fiber · D3.js · ReactFlow</td>
</tr>
<tr>
<td><strong>State Management</strong></td>
<td>Zustand</td>
</tr>
<tr>
<td><strong>AI — Language</strong></td>
<td>Cohere Command-R-Plus · Cohere Embed v3 · Reranking API</td>
</tr>
<tr>
<td><strong>AI — Voice</strong></td>
<td>VAPI (WebRTC real-time voice conversations)</td>
</tr>
<tr>
<td><strong>Database</strong></td>
<td>Supabase (Postgres)</td>
</tr>
<tr>
<td><strong>Authentication</strong></td>
<td>Auth0 + Supabase Auth</td>
</tr>
<tr>
<td><strong>Deployment</strong></td>
<td>Vercel</td>
</tr>
</table>

<br />

---

<br />

## &nbsp; The Persona System

Each of Mirror's 200+ AI personas carries a rich profile used to generate authentic, contextual reactions:

```
  Demographics   →   Age · Gender · Generation (Gen Z / Millennial / Gen X / Boomer)
  Location       →   City · Country · Timezone
  Professional   →   Industry · Seniority · Company size · Years of experience
  Psychographics →   Tech adoption · Risk tolerance · Personality traits
  Interests      →   Domain-specific + personal hobbies
  Behavioral     →   Platform preferences · Spending habits · Response tendencies
```

A **Gen Z software engineer in Seoul** reacts very differently to your SaaS pitch than a **Boomer CMO in New York** — Mirror captures that difference precisely.

<br />

---

<br />

## &nbsp; Getting Started

<br />

**Prerequisites:** Node.js 18+, a Supabase project, an Auth0 account, and API keys for Cohere and VAPI.

<br />

**1 — Clone & install**

```bash
git clone <repository-url> mirror
cd mirror
npm install
```

**2 — Configure environment**

```bash
cp .env.example .env.local
```

```env
# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_SECRET=your-auth0-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_M2M_CLIENT_ID=your-m2m-client-id
AUTH0_M2M_CLIENT_SECRET=your-m2m-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
COHERE_API_KEY=your-cohere-api-key
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your-vapi-public-key
VAPI_PRIVATE_KEY=your-vapi-private-key
```

**3 — Run**

```bash
npm run dev
# → http://localhost:3000
```

<br />

---

<br />

## &nbsp; Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm start             # Start production server
npm run lint          # Run ESLint
npm run test:unit     # Unit tests — Vitest
npm run test:e2e      # End-to-end tests — Playwright
npm run seed          # Seed personas into the database
```

<br />

---

<br />

## &nbsp; Project Structure

```
mirror/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate-opinions/     # Persona reaction engine
│   │   │   ├── select-niche-users/    # AI persona matching
│   │   │   ├── simulation/            # Simulation runner
│   │   │   ├── scout/                 # Competitor analysis
│   │   │   ├── projects/              # Project management
│   │   │   └── cohere/                # Cohere AI endpoints
│   │   ├── dashboard/                 # Main simulation UI
│   │   ├── projects/                  # Project list & creation
│   │   ├── voice-agent/               # Live voice call interface
│   │   └── page.tsx                   # Landing page
│   ├── components/
│   │   ├── threejs-globe-with-dots.tsx  # Interactive 3D globe
│   │   ├── voice-agent.tsx              # VAPI voice interface
│   │   ├── simulation-dashboard.tsx     # Main dashboard layout
│   │   └── ui/                          # Base UI components
│   └── lib/
│       ├── ai/
│       │   ├── cohere.ts              # Embeddings & generation
│       │   ├── insights.ts            # Analytics engine
│       │   └── persona-comments.ts    # Reaction generation
│       └── supabase-auth.ts
├── public/
│   ├── screenshot.png                 # Dashboard screenshot
│   ├── wireframe_3d_globe.glb         # 3D globe model
│   └── continents.json                # Geographic boundary data
├── personas.json                      # Full 200+ persona dataset
└── docs/
    ├── API_SETUP.md
    ├── AUTH0_SETUP.md
    └── VAPI_SETUP.md
```

<br />

---

<br />

## &nbsp; API Reference

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/api/projects` | List user's projects |
| `POST` | `/api/projects` | Create a new project |
| `POST` | `/api/simulation` | Start a simulation run |
| `POST` | `/api/generate-opinions` | Generate persona reactions to an idea |
| `POST` | `/api/select-niche-users` | Find matching personas via embeddings |
| `POST` | `/api/cohere/generate` | Generate AI text |
| `POST` | `/api/cohere/embeddings` | Create semantic embeddings |
| `GET` | `/api/personas` | List all available personas |
| `POST` | `/api/scout` | Trigger competitor website analysis |

<br />

---

<br />

## &nbsp; Deployment

```bash
# Deploy to Vercel
vercel --prod

# Configure secrets
vercel env add COHERE_API_KEY production
vercel env add NEXT_PUBLIC_VAPI_PUBLIC_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... add all required variables
```

<br />

---

<br />

<div align="center">

<img src="./public/mirror-logo-animated.svg" width="56" alt="Mirror" />

<br />

**Mirror**

*Because your next idea deserves more than a guess.*

<br />

[![Made with Next.js](https://img.shields.io/badge/Made_with-Next.js-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Powered by Cohere](https://img.shields.io/badge/Powered_by-Cohere-D4A017?style=flat-square)](https://cohere.com)
[![Voice by VAPI](https://img.shields.io/badge/Voice_by-VAPI-7C3AED?style=flat-square)](https://vapi.ai)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

<br />

© 2026 Mirror. All rights reserved.

</div>
