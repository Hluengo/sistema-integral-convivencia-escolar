-- Evolve existing profiles table used by the shared Supabase project.
-- Current shape: user_id UUID, role TEXT, created_at TIMESTAMPTZ
-- We add columns required by Convivencia without breaking user_id PK.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS course_ids UUID[] DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill email from auth.users when possible
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.email IS NULL OR p.email = '');

-- Ensure role check allows convivencia roles (best-effort)
DO $$
BEGIN
  -- Drop overly-restrictive check if present; recreate soft check
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
      'admin', 'direccion', 'convivencia', 'inspectoria', 'profesor_jefe',
      'teacher', 'inspector', 'user', 'staff'
    ));
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: current user's role (uses user_id column of existing table)
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN (
        'admin', 'direccion', 'convivencia', 'inspectoria', 'profesor_jefe',
        'teacher', 'inspector', 'staff'
      )
  )
$$;

-- Auto-create profile on signup (user_id shape)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'usuario'), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'inspectoria')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- If ON CONFLICT target differs, try plain insert ignore
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'usuario'), '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'inspectoria')
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_app_role() IN ('admin', 'direccion')
  );

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_app_role() = 'admin'
  );

DROP POLICY IF EXISTS "profiles_insert_service" ON profiles;
CREATE POLICY "profiles_insert_service" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.current_app_role() = 'admin');
