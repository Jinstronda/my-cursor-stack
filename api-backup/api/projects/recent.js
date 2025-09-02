/**
 * API endpoint for getting recent projects with last message information
 * Returns the 5 most recent projects ordered by last message timestamp
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Get user from JWT token
 */
async function getUserFromToken(token) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('❌ Invalid token or user not found');
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}

/**
 * Get recent projects with last message information
 */
async function getRecentProjects(userId, limit = 5) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return [];
  }

  try {
    console.log('🔍 Fetching recent projects for user:', userId);
    
    // Step 1: Get all projects for the user
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        genre,
        status,
        budget,
        is_public,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError.message);
      return [];
    }

    if (!projects || projects.length === 0) {
      console.log('✅ No projects found for user');
      return [];
    }

    // Step 2: For each project, get the chat session and last message
    const projectsWithLastMessage = await Promise.all(
      projects.map(async (project) => {
        try {
          // Get chat session for this project
          const { data: sessions, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('id, title')
            .eq('project_id', project.id)
            .limit(1);

          if (sessionError || !sessions || sessions.length === 0) {
            // No chat session found, return project with creation date
            return {
              ...project,
              session_id: null,
              session_title: null,
              last_message_at: null,
              sort_date: new Date(project.updated_at)
            };
          }

          const session = sessions[0];

          // Get the last message for this session
          const { data: messages, error: messageError } = await supabase
            .from('messages')
            .select('created_at, content, role')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messageError || !messages || messages.length === 0) {
            // No messages found, return project with session but no message
            return {
              ...project,
              session_id: session.id,
              session_title: session.title,
              last_message_at: null,
              sort_date: new Date(project.updated_at)
            };
          }

          const lastMessage = messages[0];
          
          return {
            ...project,
            session_id: session.id,
            session_title: session.title,
            last_message_at: lastMessage.created_at,
            last_message_content: lastMessage.content,
            last_message_role: lastMessage.role,
            sort_date: new Date(lastMessage.created_at)
          };
        } catch (err) {
          console.error(`Error processing project ${project.id}:`, err);
          // Return project with fallback data
          return {
            ...project,
            session_id: null,
            session_title: null,
            last_message_at: null,
            sort_date: new Date(project.updated_at)
          };
        }
      })
    );

    // Step 3: Sort by last message date (most recent first) and limit
    const sortedProjects = projectsWithLastMessage
      .sort((a, b) => b.sort_date.getTime() - a.sort_date.getTime())
      .slice(0, limit)
      .map(({ sort_date, ...project }) => project); // Remove sort_date from final result

    console.log(`✅ Found ${sortedProjects.length} recent projects with message info`);
    return sortedProjects;
    
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    return [];
  }
}

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    console.log('🎬 Recent projects request received:', { 
      hasAuthHeader: !!authHeader, 
      headerLength: authHeader?.length
    });
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided in request');
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log('🔍 Validating token for recent projects access...');
    const user = await getUserFromToken(token);
    
    if (!user) {
      console.log('❌ Token validation failed for recent projects');
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get limit from query params, default to 5
    const limit = parseInt(req.query.limit) || 5;
    
    console.log('✅ User authenticated, fetching recent projects...');
    const projects = await getRecentProjects(user.id, limit);
    
    console.log(`✅ Returning ${projects.length} recent projects for user: ${user.email}`);
    res.json(projects);
  } catch (error) {
    console.error("❌ Error in recent projects function:", error);
    res.status(500).json({ message: "Failed to fetch recent projects" });
  }
}