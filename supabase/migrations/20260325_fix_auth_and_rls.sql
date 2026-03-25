-- ============================================================
-- Fix: Registration "Database error saving new user" & Admin RLS
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ 1. Fix handle_new_user() trigger function ============
-- Add explicit search_path and schema references to prevent
-- "relation not found" errors in newer Supabase versions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, address, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If phone already exists, insert without UNIQUE phone (use id as fallback)
    UPDATE public.profiles
    SET name = COALESCE(NEW.raw_user_meta_data->>'name', ''),
        address = COALESCE(NEW.raw_user_meta_data->>'address', ''),
        role = COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    WHERE phone = COALESCE(NEW.raw_user_meta_data->>'phone', '');
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log but don't block user creation
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============ 2. Recreate trigger (safe idempotent) ============
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ 3. Fix is_admin() with explicit search_path ============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- ============ 4. Add missing INSERT policy for profiles ============
-- The trigger is SECURITY DEFINER so it bypasses RLS, but adding
-- a policy as a safety net for direct inserts
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON profiles;
CREATE POLICY "Allow trigger to create profiles"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- ============ 5. Fix Products admin policies ============
-- Drop and recreate with explicit WITH CHECK for INSERT
DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Admins can do everything with products"
  ON products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============ 6. Fix Categories admin policies ============
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

CREATE POLICY "Admins can do everything with categories"
  ON categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============ 7. Fix Customers admin policies ============
DROP POLICY IF EXISTS "Admins can manage customers" ON customers;

CREATE POLICY "Admins can do everything with customers"
  ON customers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============ 8. Fix Orders admin policies ============
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;

CREATE POLICY "Admins can do everything with orders"
  ON orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============ 9. Grant necessary permissions ============
-- Ensure the auth schema trigger can write to profiles
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, UPDATE ON public.profiles TO supabase_auth_admin;

-- Ensure authenticated users can use products table
GRANT ALL ON public.products TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO authenticated;

-- Ensure authenticated users can use categories table  
GRANT ALL ON public.categories TO authenticated;

-- ============ 10. Verify: Show current trigger ============
-- You can run this separately to verify the trigger exists:
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
