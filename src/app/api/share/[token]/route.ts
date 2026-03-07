import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        if (!token || token.length < 8) {
            return NextResponse.json({ error: 'Invalid share token' }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('shared_simulations')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Shared simulation not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching shared simulation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
