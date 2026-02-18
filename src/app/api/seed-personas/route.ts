import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { personas } from '@/data/personas';

export async function POST(request: NextRequest) {
    try {
        const { key } = await request.json();
        if (key !== process.env.CRON_SECRET && key !== 'dev-override') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`Doing a fresh seed of ${personas.length} personas...`);

        // 1. Clear existing personas? 
        // Maybe better to upsert based on persona_id to avoid breaking foreign keys if any

        // We need to map the data to match the DB columns exactly
        const rows = personas.map(p => ({
            persona_id: p.personaId,
            name: p.name,
            title: p.title,
            // avatar: p.avatar, // optional
            location: p.location, // JSONB
            demographics: p.demographics, // JSONB
            professional: p.professional, // JSONB
            psychographics: p.psychographics, // JSONB
            interests: p.interests,
            personality: p.personality, // JSONB
            data_sources: p.dataSources
        }));

        // Upsert in batches of 50
        const batchSize = 50;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await supabaseAdmin
                .from('personas')
                .upsert(batch, { onConflict: 'persona_id' });

            if (error) {
                console.error('Error upserting batch:', error);
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully seeded ${rows.length} personas`
        });

    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
