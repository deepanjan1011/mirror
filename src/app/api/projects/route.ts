import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractUserFromHeaders } from '@/lib/auth-adapter';

// Helper to get or create user (reused logic for consistency)
async function getOrCreateUser(headers: any) {
  const userEmail = headers.email || `user_${headers.id}@tunnel.local`;

  let { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .single();

  if (userError && userError.code === 'PGRST116') {
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email: userEmail,
        name: headers.email?.split('@')[0] || `User ${headers.id}`,
        auth0_id: headers.id // Store auth0_id if available
      })
      .select()
      .single();

    if (createError) throw createError;
    return newUser;
  } else if (userError) {
    throw userError;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const { email, id } = await extractUserFromHeaders(request);

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Implicitly, if we have an ID from getUser(), the user exists in Auth.
    // However, they might not exist in the public `users` table if the trigger failed or wasn't set up.
    // For now, let's assume the trigger handles it or we do a quick check.
    // Ideally, Supabase Auth `users` table syncs to `public.users` via triggers.

    // We can just use the ID directly for querying
    const userId = id;

    // Get user's projects with simulation counts
    // Note: Schema change: 'analysis_sessions' -> 'simulations'
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        simulations(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Format response to match old API
    const formattedProjects = projects?.map(project => ({
      _id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      // Map count from new relation
      simulationCount: project.simulations?.[0]?.count || 0
    })) || [];

    return NextResponse.json({
      projects: formattedProjects
    });

  } catch (error) {
    console.error('Error in projects API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, id } = await extractUserFromHeaders(request);
    const { name, description } = await request.json();

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const userId = id;

    // Create project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    // Format response to match old API
    const formattedProject = {
      _id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    };

    return NextResponse.json({
      success: true,
      project: formattedProject
    });

  } catch (error) {
    console.error('Error in create project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
