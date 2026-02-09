export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    name: string | null
                    auth0_id: string | null
                    credits: number
                    subscription: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    name?: string | null
                    auth0_id?: string | null
                    credits?: number
                    subscription?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string | null
                    auth0_id?: string | null
                    credits?: number
                    subscription?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            projects: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    description: string | null
                    phase1_data: Json | null
                    phase2_data: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    description?: string | null
                    phase1_data?: Json | null
                    phase2_data?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    description?: string | null
                    phase1_data?: Json | null
                    phase2_data?: Json | null
                    created_at?: string
                    updated_at?: string
                }
            }
            simulations: {
                Row: {
                    id: string
                    user_id: string
                    project_id: string | null
                    post_content: string
                    platform: string
                    post_analysis: Json | null
                    metrics: Json | null
                    insights: Json | null
                    cost: Json | null
                    status: 'pending' | 'processing' | 'completed' | 'failed'
                    completed_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    project_id?: string | null
                    post_content: string
                    platform?: string
                    post_analysis?: Json | null
                    metrics?: Json | null
                    insights?: Json | null
                    cost?: Json | null
                    status?: 'pending' | 'processing' | 'completed' | 'failed'
                    completed_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    project_id?: string | null
                    post_content?: string
                    platform?: string
                    post_analysis?: Json | null
                    metrics?: Json | null
                    insights?: Json | null
                    cost?: Json | null
                    status?: 'pending' | 'processing' | 'completed' | 'failed'
                    completed_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            simulation_reactions: {
                Row: {
                    id: string
                    simulation_id: string
                    persona_id: number
                    attention: 'full' | 'partial' | 'ignore'
                    sentiment: number
                    reason: string
                    comment: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    simulation_id: string
                    persona_id: number
                    attention: 'full' | 'partial' | 'ignore'
                    sentiment: number
                    reason: string
                    comment?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    simulation_id?: string
                    persona_id?: number
                    attention?: 'full' | 'partial' | 'ignore'
                    sentiment?: number
                    reason?: string
                    comment?: string | null
                    created_at?: string
                }
            }
            personas: {
                Row: {
                    id: string
                    persona_id: number
                    name: string
                    title: string
                    avatar: string | null
                    location: Json
                    demographics: Json
                    professional: Json
                    psychographics: Json
                    interests: string[] | null
                    personality: Json
                    data_sources: string[] | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    persona_id: number
                    name: string
                    title: string
                    avatar?: string | null
                    location: Json
                    demographics: Json
                    professional: Json
                    psychographics: Json
                    interests?: string[] | null
                    personality: Json
                    data_sources?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    persona_id?: number
                    name?: string
                    title?: string
                    avatar?: string | null
                    location?: Json
                    demographics?: Json
                    professional?: Json
                    psychographics?: Json
                    interests?: string[] | null
                    personality?: Json
                    data_sources?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}
