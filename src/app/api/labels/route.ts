import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { labels } = body; // Array of { sample_id, selected_atom_id }

    if (!Array.isArray(labels)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const upsertData = labels.map(label => ({
      sample_id: label.sample_id,
      selected_atom_id: label.selected_atom_id,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('labels')
      .upsert(upsertData, { onConflict: 'sample_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { sample_ids } = body;

    if (!Array.isArray(sample_ids) || sample_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { error } = await supabase
      .from('labels')
      .delete()
      .in('sample_id', sample_ids);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

