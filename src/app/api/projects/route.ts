import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractUserFromHeaders } from '@/lib/auth-adapter';

// Helper to get or create user (reused logic for consistency)
async function getOrCreateUser(supabase: any, headers: any) {
  const userEmail = headers.email || `user_${headers.id}@tunnel.local`;

  let { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .single();

  if (userError && userError.code === 'PGRST116') {
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: headers.id, // Explicitly set ID to match Auth ID
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
    const supabase = await createClient();
    const { email, id } = await extractUserFromHeaders(request);

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = id;

    // Get user's projects with analysis session counts
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        *,
        analysis_sessions(count)
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
      // Map count from analysis_sessions relation
      simulationCount: project.analysis_sessions?.[0]?.count || 0
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
    const supabase = await createClient();
    const { email, id } = await extractUserFromHeaders(request);
    const { name, description } = await request.json();

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Ensure user exists in public.users table (Sync Auth -> Public)
    try {
      await getOrCreateUser(supabase, { email, id });
    } catch (e) {
      console.error('Error syncing user:', e);
      // Continue anyway? If sync fails, FK might fail too.
    }

    const userId = id;

    // Create project
    const { data: project, error: projectError } = await supabase
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
