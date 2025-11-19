import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string
  password: string
  role: 'admin' | 'sposi'
  weddingId?: string
  isActive?: boolean
}

interface UpdateUserRequest {
  userId: string
  email?: string
  password?: string
  role?: 'admin' | 'sposi'
  weddingId?: string | null
  isActive?: boolean
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

    const { action, ...body } = await req.json()

    if (action === 'create') {
      const { email, password, role, weddingId, isActive = true } = body as CreateUserRequest
      
      console.log('Creating user:', { email, role })

      // Create user in auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        console.error('Error creating user:', createError)
        // Return user-friendly error message for duplicate email
        if (createError.message?.includes('already been registered') || createError.code === 'email_exists') {
          throw new Error('Utenza già registrata')
        }
        throw createError
      }

      console.log('User created in auth:', newUser.user.id)

      // Update profile (created by trigger) if isActive is false
      if (!isActive) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: isActive })
          .eq('id', newUser.user.id)

        if (profileError) {
          console.error('Error updating profile:', profileError)
          throw profileError
        }

        console.log('Profile updated')
      }

      // Create role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUser.user.id, role })

      if (roleError) {
        console.error('Error creating role:', roleError)
        throw roleError
      }

      console.log('Role created')

      // If sposi role and wedding selected, create wedding_spouses entry
      if (role === 'sposi' && weddingId) {
        const { error: weddingError } = await supabaseAdmin
          .from('wedding_spouses')
          .insert({ user_id: newUser.user.id, wedding_id: weddingId })

        if (weddingError) {
          console.error('Error linking to wedding:', weddingError)
          throw weddingError
        }

        console.log('User linked to wedding')
      }

      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update') {
      const { userId, email, password, role, weddingId, isActive } = body as UpdateUserRequest

      console.log('Updating user:', { userId, email, role })

      // Update email/password if provided
      if (email || password) {
        const updateData: any = {}
        if (email) updateData.email = email
        if (password) updateData.password = password

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          updateData
        )

        if (updateError) {
          console.error('Error updating user auth:', updateError)
          throw updateError
        }
      }

      // Update profile active status if provided
      if (isActive !== undefined) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: isActive })
          .eq('id', userId)

        if (profileError) {
          console.error('Error updating profile:', profileError)
          throw profileError
        }
      }

      // Update role if provided
      if (role) {
        // Delete existing roles
        const { error: deleteError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId)

        if (deleteError) {
          console.error('Error deleting old roles:', deleteError)
          throw deleteError
        }

        // Insert new role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role })

        if (roleError) {
          console.error('Error creating new role:', roleError)
          throw roleError
        }
      }

      // Update wedding association if role is sposi
      if (role === 'sposi' || weddingId !== undefined) {
        // Delete existing wedding associations
        const { error: deleteWeddingError } = await supabaseAdmin
          .from('wedding_spouses')
          .delete()
          .eq('user_id', userId)

        if (deleteWeddingError) {
          console.error('Error deleting wedding association:', deleteWeddingError)
          throw deleteWeddingError
        }

        // Create new association if weddingId provided
        if (weddingId) {
          const { error: weddingError } = await supabaseAdmin
            .from('wedding_spouses')
            .insert({ user_id: userId, wedding_id: weddingId })

          if (weddingError) {
            console.error('Error linking to wedding:', weddingError)
            throw weddingError
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      const { userId } = body as { userId: string }

      console.log('Deleting user:', { userId })

      // Delete user from auth (this will cascade delete profile, roles, and wedding associations)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) {
        console.error('Error deleting user:', deleteError)
        throw deleteError
      }

      console.log('User deleted successfully')

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error in manage-user function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})