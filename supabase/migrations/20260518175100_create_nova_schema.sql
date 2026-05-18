/*
  # Nova AI Assistant - Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text)
      - `avatar_url` (text)
      - `is_premium` (boolean, default false)
      - `preferred_ai_model` (text, default 'gemini')
      - `voice_enabled` (boolean, default true)
      - `wake_word_enabled` (boolean, default false)
      - `gaming_mode_enabled` (boolean, default true)
      - `auto_answer_calls` (boolean, default false)
      - `floating_assistant_enabled` (boolean, default true)
      - `language` (text, default 'en')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `chats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `ai_model` (text, default 'gemini')
      - `is_archived` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats)
      - `user_id` (uuid, references profiles)
      - `role` (text - 'user' or 'assistant')
      - `content` (text)
      - `message_type` (text, default 'text' - can be 'text', 'image', 'voice', 'video')
      - `media_url` (text, nullable)
      - `created_at` (timestamptz)

    - `generated_images`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `prompt` (text)
      - `image_url` (text)
      - `ai_model` (text)
      - `created_at` (timestamptz)

    - `gaming_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `game_name` (text)
      - `performance_mode` (text, default 'balanced')
      - `auto_tap_enabled` (boolean, default false)
      - `voice_commands_enabled` (boolean, default true)
      - `do_not_disturb` (boolean, default true)
      - `floating_assistant` (boolean, default true)
      - `created_at` (timestamptz)

    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `plan` (text - 'free', 'pro', 'ultimate')
      - `status` (text, default 'active')
      - `started_at` (timestamptz)
      - `expires_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - All policies require authentication
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text DEFAULT '',
  avatar_url text DEFAULT '',
  is_premium boolean DEFAULT false,
  preferred_ai_model text DEFAULT 'gemini',
  voice_enabled boolean DEFAULT true,
  wake_word_enabled boolean DEFAULT false,
  gaming_mode_enabled boolean DEFAULT true,
  auto_answer_calls boolean DEFAULT false,
  floating_assistant_enabled boolean DEFAULT true,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Chats
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'New Chat',
  ai_model text DEFAULT 'gemini',
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chats"
  ON chats FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text DEFAULT '',
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'video')),
  media_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Generated Images
CREATE TABLE IF NOT EXISTS generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prompt text NOT NULL,
  image_url text DEFAULT '',
  ai_model text DEFAULT 'gemini',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated images"
  ON generated_images FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own generated images"
  ON generated_images FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own generated images"
  ON generated_images FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Gaming Profiles
CREATE TABLE IF NOT EXISTS gaming_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game_name text NOT NULL,
  performance_mode text DEFAULT 'balanced' CHECK (performance_mode IN ('performance', 'balanced', 'battery')),
  auto_tap_enabled boolean DEFAULT false,
  voice_commands_enabled boolean DEFAULT true,
  do_not_disturb boolean DEFAULT true,
  floating_assistant boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gaming_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gaming profiles"
  ON gaming_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own gaming profiles"
  ON gaming_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own gaming profiles"
  ON gaming_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own gaming profiles"
  ON gaming_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'ultimate')),
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_profiles_user_id ON gaming_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
