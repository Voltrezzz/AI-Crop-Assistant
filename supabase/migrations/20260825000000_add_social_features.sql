-- Migration: Add social features (Friends, Direct Messages, Compare settings)

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  contract_id text UNIQUE,
  privacy_settings jsonb DEFAULT '{"allow_compare": true, "show_profile": true}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert their own friendships"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friendships"
  ON public.friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  read_status boolean DEFAULT false
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages they send"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of received messages"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone if privacy allows"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR 
    (privacy_settings->>'allow_compare')::boolean = true
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
