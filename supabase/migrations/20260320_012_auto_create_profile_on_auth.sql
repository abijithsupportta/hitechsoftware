-- ============================================================================
-- Auto-create profiles on auth user signup
-- Migration: 20260320_012_auto_create_profile_on_auth.sql
-- ============================================================================

-- Create or replace function to auto-create profile when new auth user is added
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'office_staff';
BEGIN
  -- Accept only known roles from metadata; fallback safely.
  IF NEW.raw_user_meta_data ? 'role'
    AND NEW.raw_user_meta_data->>'role' IN ('super_admin', 'office_staff', 'stock_manager', 'technician') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, role, is_active, is_deleted, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), split_part(COALESCE(NEW.email, 'User'), '@', 1), 'User'),
    v_role,
    true,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Required so auth insert can execute trigger function without failing with
-- generic "Database error creating new user".
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to fire when new auth.users row is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Notes
-- ============================================================================
-- This trigger ensures that whenever a new user is created in auth.users
-- (via admin.auth.admin.createUser, invitations, or signup), a corresponding
-- profile record is automatically created in public.profiles with:
-- - role from user_metadata.role (defaults to 'office_staff')
-- - display_name from user_metadata.display_name (defaults to 'User')
-- 
-- This prevents technicians or any user from existing in auth without a profile,
-- which was causing the "Only technicians can update job workflow" 400 errors.
