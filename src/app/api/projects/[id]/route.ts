import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractUserFromHeaders } from '@/lib/auth-adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { email, id: userId } = await extractUserFromHeaders(request);

    if (!email || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Fetch the project
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });

  } catch (error) {
    console.error('Error in get project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { email, id: userId } = await extractUserFromHeaders(request);

    if (!email || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // First, verify the project belongs to the user
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // Delete the project (cascading deletes will handle related sessions)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });

  } catch (error) {
    console.error('Error in delete project API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
