import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const industry = searchParams.get('industry');
    const generation = searchParams.get('generation');

    let query = supabaseAdmin
      .from('personas')
      .select('*'); // Select all fields to match .lean() behavior

    // Apply filters using JSON arrow operators
    if (country) {
      // filter['location.country'] = country;
      query = query.eq('location->>country', country);
    }
    if (industry) {
      // filter['professional.primaryIndustry'] = industry;
      query = query.eq('professional->>primaryIndustry', industry);
    }
    if (generation) {
      // filter['demographics.generation'] = generation;
      query = query.eq('demographics->>generation', generation);
    }

    const { data: personas, error } = await query;

    if (error) throw error;

    // Transform if necessary (e.g. camelCase mapping if frontend relies on it)
    // The previous .lean() returned raw objects. 
    // Supabase returns objects with snake_case keys if defined that way in DB, 
    // but our JSON columns are stored as JSON, so their internal keys are preserved (camelCase).
    // The top level columns (persona_id, etc) might be snake_case in Postgres 
    // but the model definition used camelCase. 
    // Let's check our schema: created 'persona_id', 'name', 'location' etc.
    // We might need to map `persona_id` -> `personaId` for frontend compatibility.

    const transformedPersonas = (personas || []).map(p => ({
      ...p,
      personaId: p.persona_id, // Map snake_case to camelCase
      // JSON fields (location, demographics etc) keep their internal structure
    }));

    return NextResponse.json({
      personas: transformedPersonas,
      total: transformedPersonas.length
    });

  } catch (error: any) {
    console.error('Error fetching personas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personas' },
      { status: 500 }
    );
  }
}
