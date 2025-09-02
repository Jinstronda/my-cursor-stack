-- Create all tables for Noci App Database
-- Generated from shared/schema.ts

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    bio TEXT,
    avatar TEXT,
    location TEXT,
    website TEXT,
    is_producer BOOLEAN DEFAULT false,
    plan_type TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    first_name TEXT,
    last_name TEXT,
    profile_image_url TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Production companies table
CREATE TABLE IF NOT EXISTS production_companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    services TEXT[],
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    logo TEXT,
    cover_image TEXT,
    images TEXT[],
    rating NUMERIC(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    plan_type TEXT DEFAULT 'free',
    owner_id TEXT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    genre TEXT,
    status TEXT DEFAULT 'esboço',
    budget NUMERIC(12,2),
    user_id TEXT NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    title TEXT NOT NULL DEFAULT 'Novo Projeto',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    company_id INTEGER NOT NULL REFERENCES production_companies(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan_type ON users(plan_type);
CREATE INDEX IF NOT EXISTS idx_production_companies_location ON production_companies(location);
CREATE INDEX IF NOT EXISTS idx_production_companies_verified ON production_companies(verified);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_company_id ON reviews(company_id);

-- Success message
SELECT 'All tables created successfully!' as status;