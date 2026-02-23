import { z } from "zod";

export const IdeationResponse = z.object({
  summary: z.string().min(1),
  core_value: z.string().default("General Value Proposition"),
  segments: z.array(z.object({
    name: z.string().default("Unknown Segment"),
    why_it_fits: z.string().optional().default(""),
    hooks: z.array(z.string()).default([]),
    kpis: z.array(z.string()).default([]),
    platform_fit: z.array(z.string()).default([])
  })).default([]),
  features: z.array(z.string()).default([]),
  swot: z.object({
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    opportunities: z.array(z.string()).default([]),
    threats: z.array(z.string()).default([])
  }).optional(),
  competitors: z.array(z.object({
    name: z.string().default("Unknown Competitor"),
    differentiation: z.string().default("")
  })).default([]),
  monetization: z.array(z.object({
    model: z.string().default("Subscription"),
    description: z.string().default("")
  })).default([]),
  gtm_plan: z.array(z.object({
    phase: z.string().default("Launch"),
    strategy: z.string().default("")
  })).default([]),
  complexity: z.enum(["low", "medium", "high"]).default("medium"),
  risks: z.array(z.object({
    risk: z.string().default("General Risk"),
    mitigation: z.string().default("Monitor closely")
  })).default([]),
  social_fit: z.array(z.object({
    platform: z.string().default("General"),
    why: z.string().default("")
  })).default([]),
  improvements_by_segment: z.array(z.object({
    segment: z.string().default("General"),
    ideas: z.array(z.string()).default([])
  })).default([]),
  followups: z.array(z.string()).default([]),
  // Step 1 addition for auditability (used later by Critic/Refiner)
  assumptions: z.array(z.string()).optional(),
  uncertainty_score: z.number().min(0).max(1).optional()
});

export type IdeationResponseT = z.infer<typeof IdeationResponse>;

export const CritiqueIssue = z.object({
  section: z.string().optional(), // allow any section name or missing if cross-cutting
  severity: z.enum(["low", "medium", "high"]),
  reason: z.string().min(1),
  impact: z.string().min(1),
  evidence: z.string().nullable().optional()
});

export const CritiqueFix = z.object({
  section: z.string().min(1),
  change: z.string().min(1),
  rationale: z.string().min(1),
  example: z.string().nullable().optional()
});

export const CritiqueResponse = z.object({
  summary: z.string().min(1), // high-level verdict of the plan quality
  score: z.number().min(0).max(1), // 0..1 confidence in plan viability
  issues: z.array(CritiqueIssue).min(1),
  fixes: z.array(CritiqueFix).min(1),
  meta: z.object({
    assumptions_to_validate: z.array(z.string()).default([]),
    missing_data: z.array(z.string()).default([]),
    suggested_experiments: z.array(z.string()).default([]) // quick tests to de-risk
  })
});

export type CritiqueResponseT = z.infer<typeof CritiqueResponse>;

export const DeltaChange = z.object({
  section: z.enum([
    "summary",
    "segments",
    "features",
    "risks",
    "social_fit",
    "improvements_by_segment",
    "followups",
    "kpi_plan",         // reserved for future if you add it to Advisor
    "channel_strategy"  // same note
  ]),
  path: z.string().min(1), // JSON pointer-ish, e.g. "segments[1].kpis[0]"
  before: z.any().optional(),
  after: z.any().optional(),
  rationale: z.string().min(1)
});

export const RefinedResponse = z.object({
  final: IdeationResponse,           // SAME SHAPE as Advisor
  deltas: z.array(DeltaChange).min(1),
  uncertainty_score: z.number().min(0).max(1),
  assumptions: z.array(z.string()).min(0)
});

export type RefinedResponseT = z.infer<typeof RefinedResponse>;

export type IdeaDoc = {
  _id?: import("mongodb").ObjectId;
  idea: string;
  artifacts?: { type: "url" | "pdf" | "image"; name: string; ref: string }[];
  stage: "advisor"; // Steps 2/3 will add "critic" and "refiner"
  result: IdeationResponseT;
  createdAt: Date;
  critic?: {
    response: CritiqueResponseT;
    critiquedAt: Date;
  };
  refiner?: {
    response: RefinedResponseT;
    refinedAt: Date;
  };
};

export type ScoutPageDoc = {
  _id?: import("mongodb").ObjectId;
  url: string;
  title: string;
  html: string;
  text: string;
  screenshot?: string; // base64 encoded or file path
  fetchedAt: Date;
  domain: string;
  metaDescription?: string;
  error?: string;
};

export type ScoutVectorDoc = {
  _id?: import("mongodb").ObjectId;
  pageId: import("mongodb").ObjectId;
  chunkId: string; // c0, c1, ...
  text: string;
  embedding: number[]; // vector for Atlas Vector Search
  url: string;
};
