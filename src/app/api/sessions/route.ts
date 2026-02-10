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
        id: headers.id, // Explicitly match Auth ID if available
        email: userEmail,
        name: headers.email?.split('@')[0] || `User ${headers.id}`,
        auth0_id: headers.id
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
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const { email, id } = await extractUserFromHeaders(request);

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = id;

    // Get sessions for this project and user
    const { data: sessions, error: sessionsError } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Format to match old MongoDB API
    const formattedSessions = sessions?.map(session => ({
      _id: session.id,
      projectId: session.project_id,
      sessionName: session.session_name,
      prompt: session.prompt,
      analysisState: session.analysis_state,
      uiState: session.ui_state,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });

  } catch (error) {
    console.error('Error in sessions GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { projectId, sessionName, prompt, analysisState, uiState } = body;
    const { email, id } = await extractUserFromHeaders(request);

    if (!projectId || !sessionName || !prompt) {
      return NextResponse.json({
        error: 'Project ID, session name, and prompt are required'
      }, { status: 400 });
    }

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure user exists in public.users table (Sync Auth -> Public)
    try {
      await getOrCreateUser(supabase, { email, id });
    } catch (e) {
      console.error('Error syncing user:', e);
      // Continue anyway?
    }

    const userId = id;

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .insert({
        project_id: projectId,
        user_id: userId,
        session_name: sessionName,
        prompt: prompt,
        analysis_state: analysisState || {},
        ui_state: uiState || {}
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    console.log('✅ Created session for user:', email, 'Session:', session.session_name);

    // Format to match old API
    const formattedSession = {
      _id: session.id,
      projectId: session.project_id,
      sessionName: session.session_name,
      prompt: session.prompt,
      analysisState: session.analysis_state,
      uiState: session.ui_state,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };

    return NextResponse.json({
      success: true,
      session: formattedSession
    });

  } catch (error) {
    console.error('Error in create session API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
