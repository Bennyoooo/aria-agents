import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

let _supabase: ReturnType<typeof createClient> | null = null;

function getServiceClient() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.slice(7);

  try {
    const supabase = getServiceClient();
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('api_key', apiKey)
      .single();

    if (error) {
      console.error('API key auth error:', error.message);
      return null;
    }
    if (!org) return null;
    return org as { id: string; name: string; domain: string };
  } catch (err) {
    console.error('API key auth exception:', err);
    return null;
  }
}
