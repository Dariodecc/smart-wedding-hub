import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const ALLOWED_RESOURCES = ['famiglie', 'gruppi', 'invitati', 'preferenze_alimentari_custom', 'tavoli', 'weddings']

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  console.log(`[API] ${req.method} ${req.url}`)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Extract Bearer Token
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[API] Missing or invalid Authorization header')
    return new Response(
      JSON.stringify({ success: false, error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const token = authHeader.split(' ')[1]
  const tokenHash = await hashToken(token)
  console.log('[API] Token hash computed')

  // 2. Find token (hash first, then plaintext for backward compatibility)
  let apiKeyData = null
  
  const { data: hashMatch } = await supabase
    .from('api_keys')
    .select('id, key_name, is_active')
    .eq('api_key_hash', tokenHash)
    .maybeSingle()
  
  if (hashMatch) {
    apiKeyData = hashMatch
    console.log(`[API] Token matched via hash: ${hashMatch.key_name}`)
  } else {
    // Fallback to plaintext for legacy keys
    const { data: plainMatch } = await supabase
      .from('api_keys')
      .select('id, key_name, is_active')
      .eq('api_key', token)
      .maybeSingle()
    if (plainMatch) {
      apiKeyData = plainMatch
      console.log(`[API] Token matched via plaintext (legacy): ${plainMatch.key_name}`)
    }
  }

  if (!apiKeyData) {
    console.log('[API] Invalid token - no match found')
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid token' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!apiKeyData.is_active) {
    console.log(`[API] Token is disabled: ${apiKeyData.key_name}`)
    return new Response(
      JSON.stringify({ success: false, error: 'Token is disabled' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 3. Get wedding_id from token association
  const { data: weddingLinks } = await supabase
    .from('api_key_weddings')
    .select('wedding_id')
    .eq('api_key_id', apiKeyData.id)

  if (!weddingLinks || weddingLinks.length === 0) {
    console.log('[API] Token not linked to any wedding')
    return new Response(
      JSON.stringify({ success: false, error: 'Token not linked to any wedding' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const authorizedWeddingIds = weddingLinks.map(w => w.wedding_id)
  console.log(`[API] Token authorized for weddings: ${authorizedWeddingIds.join(', ')}`)

  // 4. Get permissions for this token
  const { data: permissions } = await supabase
    .from('api_key_permissions')
    .select('resource, permission')
    .eq('api_key_id', apiKeyData.id)

  console.log(`[API] Token permissions: ${JSON.stringify(permissions)}`)

  // 5. Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyData.id)

  // 6. Parse request URL to get resource and ID
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  // Path format: /api/{resource}/{id?}
  const resource = pathParts[1]
  const resourceId = pathParts[2]

  console.log(`[API] Resource: ${resource}, ID: ${resourceId || 'none'}`)

  if (!resource || !ALLOWED_RESOURCES.includes(resource)) {
    console.log(`[API] Invalid resource: ${resource}`)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Invalid resource '${resource}'. Allowed: ${ALLOWED_RESOURCES.join(', ')}` 
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 7. Check if token has required permission for this operation
  const requiredPermission = req.method === 'GET' ? 'read' : 'write'
  const hasPermission = permissions?.some(
    p => p.resource === resource && p.permission === requiredPermission
  )

  if (!hasPermission) {
    console.log(`[API] Missing '${requiredPermission}' permission for '${resource}'`)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Missing '${requiredPermission}' permission for '${resource}'` 
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 8. Get wedding_id from query param or use first authorized wedding
  const requestedWeddingId = url.searchParams.get('wedding_id')
  let weddingId: string

  if (requestedWeddingId) {
    if (!authorizedWeddingIds.includes(requestedWeddingId)) {
      console.log(`[API] Wedding ${requestedWeddingId} not authorized for this token`)
      return new Response(
        JSON.stringify({ success: false, error: 'Wedding not authorized for this token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    weddingId = requestedWeddingId
  } else if (authorizedWeddingIds.length === 1) {
    weddingId = authorizedWeddingIds[0]
  } else {
    console.log('[API] Multiple weddings authorized - wedding_id required')
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Multiple weddings authorized. Please specify wedding_id query parameter.',
        authorized_weddings: authorizedWeddingIds
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`[API] Using wedding_id: ${weddingId}`)

  // 9. Execute CRUD operation
  try {
    let result

    switch (req.method) {
      case 'GET':
        if (resourceId) {
          // Get single item
          result = await supabase
            .from(resource)
            .select('*')
            .eq('id', resourceId)
            .eq('wedding_id', weddingId)
            .maybeSingle()
          
          if (!result.data) {
            return new Response(
              JSON.stringify({ success: false, error: 'Resource not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // Get list with pagination
          const limit = parseInt(url.searchParams.get('limit') || '50')
          const offset = parseInt(url.searchParams.get('offset') || '0')
          
          result = await supabase
            .from(resource)
            .select('*', { count: 'exact' })
            .eq('wedding_id', weddingId)
            .range(offset, offset + limit - 1)
        }
        break

      case 'POST':
        const createData = await req.json()
        // Force wedding_id to authorized wedding
        result = await supabase
          .from(resource)
          .insert({ ...createData, wedding_id: weddingId })
          .select()
          .single()
        console.log(`[API] Created ${resource}`)
        break

      case 'PUT':
        if (!resourceId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Resource ID required for PUT' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const updateData = await req.json()
        // Prevent changing wedding_id
        delete updateData.wedding_id
        delete updateData.id
        
        result = await supabase
          .from(resource)
          .update(updateData)
          .eq('id', resourceId)
          .eq('wedding_id', weddingId)
          .select()
          .maybeSingle()
        
        if (!result.data) {
          return new Response(
            JSON.stringify({ success: false, error: 'Resource not found or not authorized' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.log(`[API] Updated ${resource}: ${resourceId}`)
        break

      case 'DELETE':
        if (!resourceId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Resource ID required for DELETE' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // First check if resource exists and belongs to wedding
        const { data: existing } = await supabase
          .from(resource)
          .select('id')
          .eq('id', resourceId)
          .eq('wedding_id', weddingId)
          .maybeSingle()
        
        if (!existing) {
          return new Response(
            JSON.stringify({ success: false, error: 'Resource not found or not authorized' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        result = await supabase
          .from(resource)
          .delete()
          .eq('id', resourceId)
          .eq('wedding_id', weddingId)
        
        console.log(`[API] Deleted ${resource}: ${resourceId}`)
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (result.error) {
      console.error(`[API] Database error: ${result.error.message}`)
      throw result.error
    }

    console.log(`[API] Success: ${req.method} ${resource}`)
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result.data, 
        count: result.count ?? undefined 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[API] Error: ${errorMessage}`)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
