import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Database } from '@/types/supabase';

// Helper to enrich reactions with persona data
// In Supabase, we can join tables, or fetch separately if needed.
// Ideally we join.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch simulation
    const { data: simulation, error: simError } = await supabaseAdmin
      .from('simulations')
      .select('*')
      .eq('id', id)
      .single();

    if (simError || !simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    // Fetch reactions with persona details
    // We can do a join if we set up foreign keys correctly in Supabase client types,
    // but typically manual join is safer if types are loose.
    // Let's try a join query first.
    // If relationships are set in Supabase (foreign keys exist in schema), this works:
    // .select('*, persona:personas(*)') 
    // But our schema has persona_id as standard integer join, let's verify.
    // Schema: simulation_reactions.persona_id -> personas.persona_id (not primary key UUID)
    // Supabase join usually requires FK on standard ID. 
    // Let's fetch separately to be robust against loose FKs or complex joins.

    // Fetch reactions
    const { data: reactions, error: reactError } = await supabaseAdmin
      .from('simulation_reactions')
      .select('*')
      .eq('simulation_id', id)
      .order('created_at', { ascending: true });

    if (reactError) throw reactError;

    // Fetch personas for these reactions
    const personaIds = [...new Set((reactions || []).map(r => r.persona_id))];
    let personas: any[] = [];

    if (personaIds.length > 0) {
      const { data: pData } = await supabaseAdmin
        .from('personas')
        .select('*')
        .in('persona_id', personaIds);
      personas = pData || [];
    }

    const personaMap = new Map(personas.map(p => [p.persona_id, p]));

    const enrichedReactions = (reactions || []).map(reaction => {
      const persona = personaMap.get(reaction.persona_id);
      return {
        ...reaction,
        persona: persona ? {
          name: persona.name,
          title: persona.title,
          location: persona.location,
          demographics: persona.demographics,
          professional: persona.professional
        } : null,
        // Map legacy fields if frontend expects camelCase?
        // The frontend likely expects camelCase from Mongoose.
        // We should transform snake_case to camelCase to match existing frontend types.
        personaId: reaction.persona_id,
        createdAt: reaction.created_at,
        // ... keys are already mostly compatible or we map them.
      };
    });

    // Transform Simulation to match frontend expectations (camelCase)
    const transformedSimulation = {
      ...simulation,
      _id: simulation.id, // Frontend might check _id
      completedAt: simulation.completed_at,
      createdAt: simulation.created_at,
      postContent: simulation.post_content,
      postAnalysis: simulation.post_analysis,
      // Frontend expects 'reactions' array on the simulation object
      reactions: enrichedReactions
    };

    return NextResponse.json(transformedSimulation);

  } catch (error: any) {
    console.error('Error fetching simulation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch simulation' },
      { status: 500 }
    );
  }
}

// Stream endpoint for real-time updates (Polling based)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { lastIndex = 0 } = await request.json();
    const { id } = await params;

    // Fetch simulation status/metrics
    const { data: simulation } = await supabaseAdmin
      .from('simulations')
      .select('status, metrics')
      .eq('id', id)
      .single();

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    // Fetch NEW reactions (using offset/limit approach or created_at)
    // Since we're using lastIndex (count), we can just fetch all and slice, 
    // OR fetching logic depends on how 'lastIndex' is tracking. 
    // Assuming lastIndex is the count of reactions already received.

    const { data: allReactions } = await supabaseAdmin
      .from('simulation_reactions')
      .select('*')
      .eq('simulation_id', id)
      .order('created_at', { ascending: true })
      .range(lastIndex, lastIndex + 100); // Fetch next batch (max 100)

    const newReactions = allReactions || [];

    // Enrich
    const personaIds = [...new Set(newReactions.map(r => r.persona_id))];
    let personas: any[] = [];
    if (personaIds.length > 0) {
      const { data: pData } = await supabaseAdmin
        .from('personas')
        .select('*')
        .in('persona_id', personaIds);
      personas = pData || [];
    }
    const personaMap = new Map(personas.map(p => [p.persona_id, p]));

    const enriched = newReactions.map(reaction => {
      const persona = personaMap.get(reaction.persona_id);
      return {
        ...reaction,
        persona: persona ? {
          name: persona.name,
          title: persona.title,
          location: persona.location,
        } : null,
        personaId: reaction.persona_id,
        createdAt: reaction.created_at
      };
    });

    // Check total count to confirm
    const { count } = await supabaseAdmin
      .from('simulation_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('simulation_id', id);

    return NextResponse.json({
      newReactions: enriched,
      totalReactions: count || (lastIndex + newReactions.length),
      status: simulation.status,
      metrics: simulation.metrics
    });

  } catch (error: any) {
    console.error('Error streaming simulation updates:', error);
    return NextResponse.json(
      { error: 'Failed to get updates' },
      { status: 500 }
    );
  }
}