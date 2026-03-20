-- ============================================================================
-- Fix: Add INSERT policy to profiles RLS
-- Migration: 20260320_013_add_profiles_insert_policy.sql
-- ============================================================================

-- Add INSERT policy for super_admin role to create new profiles through the UI.
-- Note: The service role (admin client) bypasses all RLS policies entirely,
-- so this policy primarily benefits role-based access from authenticated clients.

DROP POLICY IF EXISTS profiles_super_admin_insert ON public.profiles;

CREATE POLICY profiles_super_admin_insert ON public.profiles
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'super_admin');

-- Note: Unauthenticated INSERT attempts (system operations) are handled by
-- the service role key in the backend, which bypasses all RLS policies.

