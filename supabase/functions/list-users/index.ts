import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    if (rolesError || !roles?.some(r => r.role === 'admin')) {
      throw new Error('User is not an admin')
    }

    // Get all users from auth
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      throw authError
    }

    // Get all user roles
    const { data: userRoles, error: rolesErr } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')

    if (rolesErr) {
      console.error('Error fetching roles:', rolesErr)
      throw rolesErr
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    // Get wedding associations
    const { data: weddingSpouses, error: weddingError } = await supabaseAdmin
      .from('wedding_spouses')
      .select('user_id, wedding_id, weddings(couple_name)')

    if (weddingError) {
      console.error('Error fetching wedding spouses:', weddingError)
      throw weddingError
    }

    // Build user list with all auth users
    const usersWithEmails = authUsers.map(authUser => {
      const userRole = userRoles.find(r => r.user_id === authUser.id)
      const profile = profiles.find(p => p.id === authUser.id)
      const weddingData = weddingSpouses.find(ws => ws.user_id === authUser.id)

      const userData = {
        id: authUser.id,
        email: authUser.email || 'N/A',
        role: userRole?.role || 'N/A',
        is_active: profile?.is_active ?? true,
        wedding_id: weddingData?.wedding_id,
        wedding_name: (weddingData?.weddings as any)?.couple_name,
      }

      console.log('User data:', userData)
      return userData
    })

    return new Response(
      JSON.stringify({ users: usersWithEmails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in list-users function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})