import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getProducts } from '@/modules/products/product.service';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const authState = await supabase.auth.getUser();

    if (authState.error || !authState.data.user) {
      return NextResponse.json(
        { ok: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const page_size = Math.min(parseInt(searchParams.get('page_size') || '20'), 50); // Max 50 results

    // Get user role to verify permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authState.data.user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: { message: 'User profile not found' } },
        { status: 404 }
      );
    }

    // All authenticated users can search products
    const result = await getProducts({
      search,
      page,
      page_size,
      is_active: true, // Only show active products
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: { message: result.error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: result.data,
    });

  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
