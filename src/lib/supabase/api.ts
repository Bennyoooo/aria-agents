import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, domain')
    .eq('api_key', apiKey)
    .single();

  if (error || !org) return null;
  return org as { id: string; name: string; domain: string };
}
