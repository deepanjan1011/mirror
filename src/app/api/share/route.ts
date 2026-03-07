import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractUserFromHeaders } from '@/lib/auth-adapter';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { email, id } = await extractUserFromHeaders(request);
        if (!email || !id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const {
            projectName,
            projectDescription,
            postContent,
            metrics,
            reactions,
            impactScore,
        } = await request.json();

        if (!postContent) {
            return NextResponse.json({ error: 'Post content is required' }, { status: 400 });
        }

        // Generate a unique 12-char token
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('shared_simulations')
            .insert({
                token,
                user_id: id,
                project_name: projectName || 'Untitled Project',
                project_description: projectDescription || '',
                post_content: postContent,
                metrics: metrics || {},
                reactions: reactions || [],
                impact_score: impactScore || 0,
            })
            .select('token')
            .single();

        if (error) {
            console.error('Error creating shared simulation:', error);
            return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
        }

        // Build the shareable URL
        const baseUrl = request.headers.get('origin') || `https://${request.headers.get('host')}`;
        const shareUrl = `${baseUrl}/shared/${data.token}`;

        return NextResponse.json({ token: data.token, url: shareUrl });
    } catch (error) {
        console.error('Error in share API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
