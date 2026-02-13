-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (will be populated by our APIs)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  auth0_id TEXT, -- Store original Auth0 ID for reference
  credits INTEGER DEFAULT 50, -- Added credits
  subscription TEXT DEFAULT 'free', -- Added subscription tier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table (Enhanced)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phase1_data JSONB, -- Ideation results
  phase2_data JSONB, -- Focus group results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personas Table (New - Migrated from MongoDB)
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  persona_id INTEGER UNIQUE NOT NULL, -- Keep original numeric ID for compatibility
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  avatar TEXT,
  location JSONB NOT NULL, -- {city, country, coordinates}
  demographics JSONB NOT NULL, -- {generation, gender, ageRange}
  professional JSONB NOT NULL, -- {seniority, industry, etc}
  psychographics JSONB NOT NULL, -- {techAdoption, riskTolerance, etc}
  interests TEXT[],
  personality JSONB NOT NULL, -- {openness, conscientiousness, etc}
  data_sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulations Table (New - Migrated from MongoDB)
CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  post_content TEXT NOT NULL,
  platform TEXT DEFAULT 'product',
  post_analysis JSONB, -- {category, targetAudience, valueProps, tone, etc}
  metrics JSONB DEFAULT '{}', -- {score, fullAttention, viralCoefficient, etc}
  insights JSONB, -- {topEngagementReasons, recommendations, etc}
  cost JSONB DEFAULT '{}', -- {cohere, martian, total}
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation Reactions (New - structured storage for reactions)
CREATE TABLE IF NOT EXISTS simulation_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  persona_id INTEGER NOT NULL, -- References personas(persona_id)
  attention TEXT NOT NULL CHECK (attention IN ('full', 'partial', 'ignore')),
  sentiment DECIMAL(3,2) NOT NULL CHECK (sentiment >= 0 AND sentiment <= 1),
  reason TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis sessions table (Existing - Keep for backward compat if needed)
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  analysis_state JSONB DEFAULT '{}',
  ui_state JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ideas table (for Idea Assistant feature)
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_text TEXT NOT NULL,
  artifacts JSONB, -- optional file/url references
  result JSONB NOT NULL, -- AI-generated analysis (IdeationResponse)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Persona reactions table (Legacy? Or for analysis_sessions?)
-- Keeping this for now, but simulation_reactions is preferred for new architecture
CREATE TABLE IF NOT EXISTS persona_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id INTEGER NOT NULL,
  attention TEXT NOT NULL CHECK (attention IN ('full', 'partial', 'ignore')),
  sentiment DECIMAL(3,2) NOT NULL CHECK (sentiment >= 0 AND sentiment <= 1),
  reason TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_project_id ON simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_simulation_reactions_simulation_id ON simulation_reactions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_personas_persona_id ON personas(persona_id);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user isolation
CREATE POLICY "Users can only see their own projects" ON projects
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own simulations" ON simulations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own simulation reactions" ON simulation_reactions
  FOR ALL USING (
    simulation_id IN (
      SELECT id FROM simulations WHERE user_id = auth.uid()
    )
  );

-- Personas are public/read-only for everyone
CREATE POLICY "Personas are viewable by everyone" ON personas
  FOR SELECT USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_simulations_updated_at BEFORE UPDATE ON simulations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON personas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to automatically create user record on signup
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
