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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: sessionId } = await params;
    const { email, id } = await extractUserFromHeaders(request);

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = id;

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

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
    console.error('Error in session GET API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: sessionId } = await params;
    const { sessionName, analysisState, uiState } = await request.json();
    const { email, id } = await extractUserFromHeaders(request);

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

    // Update session
    const updateData: any = {};
    if (sessionName) updateData.session_name = sessionName;
    if (analysisState) updateData.analysis_state = analysisState;
    if (uiState) updateData.ui_state = uiState;

    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (sessionError) {
      console.error('Error updating session:', sessionError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

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
    console.error('Error in session PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: sessionId } = await params;
    const { email, id } = await extractUserFromHeaders(request);

    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = id;

    // Delete session
    const { error: deleteError } = await supabase
      .from('analysis_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting session:', deleteError);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Error in session DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
