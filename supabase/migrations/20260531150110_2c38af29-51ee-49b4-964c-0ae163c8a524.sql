
-- =========== ENUMS ===========
CREATE TYPE public.app_role AS ENUM ('user', 'admin');
CREATE TYPE public.age_group AS ENUM ('toddler', 'kindergarten', 'elementary_low', 'elementary_high');
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'pro_yearly');
CREATE TYPE public.game_category AS ENUM ('math', 'reading', 'science', 'creative', 'english', 'music', 'islamic');

-- =========== PROFILES (parent) ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  pin_hash TEXT,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- =========== USER ROLES (admin separation) ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========== CHILDREN ===========
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'rabbit',
  age_group public.age_group NOT NULL,
  gender TEXT,
  fav_topics TEXT[] NOT NULL DEFAULT '{}',
  islamic_content BOOLEAN NOT NULL DEFAULT false,
  language_mode TEXT NOT NULL DEFAULT 'id',
  daily_limit_min INT NOT NULL DEFAULT 60,
  allowed_hour_start INT NOT NULL DEFAULT 6,
  allowed_hour_end INT NOT NULL DEFAULT 21,
  mascot TEXT NOT NULL DEFAULT 'rabbit',
  theme TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_children_parent ON public.children(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent manages children" ON public.children FOR ALL TO authenticated
  USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());

-- Limit 5 children per parent
CREATE OR REPLACE FUNCTION public.enforce_max_children()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.children WHERE parent_id = NEW.parent_id) >= 5 THEN
    RAISE EXCEPTION 'Maksimal 5 anak per akun';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_max_children BEFORE INSERT ON public.children
FOR EACH ROW EXECUTE FUNCTION public.enforce_max_children();

-- =========== CHILD PROGRESS ===========
CREATE TABLE public.child_progress (
  child_id UUID PRIMARY KEY REFERENCES public.children(id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  streak_freeze_available BOOLEAN NOT NULL DEFAULT true,
  last_active_date DATE,
  total_games_played INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.child_progress TO authenticated;
GRANT ALL ON public.child_progress TO service_role;
ALTER TABLE public.child_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent reads child progress" ON public.child_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "parent writes child progress" ON public.child_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "parent updates child progress" ON public.child_progress FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

-- Auto-create progress row when child is created
CREATE OR REPLACE FUNCTION public.init_child_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.child_progress (child_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_init_progress AFTER INSERT ON public.children
FOR EACH ROW EXECUTE FUNCTION public.init_child_progress();

-- =========== GAME SESSIONS ===========
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  category public.game_category NOT NULL,
  topic TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 1,
  correct INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  duration_sec INT NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_child_date ON public.game_sessions(child_id, played_at DESC);
GRANT SELECT, INSERT ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent reads sessions" ON public.game_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "parent writes sessions" ON public.game_sessions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

-- =========== BADGES ===========
CREATE TABLE public.badges_earned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, badge_key)
);
GRANT SELECT, INSERT ON public.badges_earned TO authenticated;
GRANT ALL ON public.badges_earned TO service_role;
ALTER TABLE public.badges_earned ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent reads badges" ON public.badges_earned FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "parent writes badges" ON public.badges_earned FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

-- =========== SCREEN TIME ===========
CREATE TABLE public.screen_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_sec INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_screen_child_date ON public.screen_time_logs(child_id, date DESC);
GRANT SELECT, INSERT ON public.screen_time_logs TO authenticated;
GRANT ALL ON public.screen_time_logs TO service_role;
ALTER TABLE public.screen_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent reads screen time" ON public.screen_time_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "parent writes screen time" ON public.screen_time_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

-- =========== DAILY CHALLENGE ===========
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_key TEXT NOT NULL,
  category public.game_category NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(child_id, date)
);
GRANT SELECT, INSERT, UPDATE ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent reads challenges" ON public.daily_challenges FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "parent writes challenges" ON public.daily_challenges FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "parent updates challenges" ON public.daily_challenges FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

-- =========== APP SETTINGS (admin global) ===========
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  gemini_api_key TEXT,
  image_api_key TEXT,
  image_api_provider TEXT DEFAULT 'gemini',
  gemini_model TEXT DEFAULT 'gemini-2.0-flash-exp',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT one_row CHECK (id = 1)
);
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Only admin can read API keys; we restrict read here, server-side admin client uses service role
CREATE POLICY "admin reads settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========== AI CONTENT CACHE ===========
CREATE TABLE public.ai_content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.game_category NOT NULL,
  topic TEXT NOT NULL,
  age_group public.age_group NOT NULL,
  difficulty INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_cache_lookup ON public.ai_content_cache(category, topic, age_group, difficulty);
GRANT SELECT ON public.ai_content_cache TO authenticated;
GRANT ALL ON public.ai_content_cache TO service_role;
ALTER TABLE public.ai_content_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth reads cache" ON public.ai_content_cache FOR SELECT TO authenticated USING (true);

-- =========== WAITLIST (pricing coming soon) ===========
CREATE TABLE public.pro_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.pro_waitlist TO anon, authenticated;
GRANT ALL ON public.pro_waitlist TO service_role;
ALTER TABLE public.pro_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can join waitlist" ON public.pro_waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);

-- =========== AUTO-CREATE PROFILE ON SIGNUP ===========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
