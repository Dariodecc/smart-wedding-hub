import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    
    // Remove 'guests' from path if present (it's part of the function name)
    const startIndex = pathParts[0] === 'guests' ? 1 : 0
    const weddingId = pathParts[startIndex]
    
    console.log('🔍 Full path:', url.pathname)
    console.log('🔍 Path parts:', pathParts)
    console.log('🔍 Wedding ID:', weddingId)
    
    if (!weddingId) {
      return new Response(
        JSON.stringify({ error: 'Wedding ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get API key from custom header
    const apiKey = req.headers.get('x-api-key')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          code: 401,
          error: 'Unauthorized',
          message: 'Missing x-api-key header' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client that bypasses RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Verify API key exists and is active
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, is_active')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()
    
    if (keyError || !keyData) {
      console.error('Invalid API key:', apiKey.substring(0, 10) + '...')
      return new Response(
        JSON.stringify({ 
          code: 401,
          error: 'Unauthorized',
          message: 'Invalid or inactive API key' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if API key has access to this wedding
    const { data: accessData, error: accessError } = await supabaseAdmin
      .from('api_key_weddings')
      .select('wedding_id')
      .eq('api_key_id', keyData.id)
      .eq('wedding_id', weddingId)
      .single()
    
    if (accessError || !accessData) {
      console.error('API key does not have access to wedding:', weddingId)
      return new Response(
        JSON.stringify({ 
          code: 403,
          error: 'Forbidden',
          message: 'API key does not have access to this wedding' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Update last_used_at
    await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)

    console.log('✅ API key validated successfully for wedding:', weddingId)

    // Route to appropriate handler
    const guestId = pathParts[startIndex + 1]
    const isWebhook = pathParts[startIndex + 1] === 'webhook'

    if (req.method === 'GET' && !guestId) {
      // GET all guests
      const { data: guests, error } = await supabaseAdmin
        .from('invitati')
        .select(`
          id,
          nome,
          cognome,
          email,
          cellulare,
          tipo_ospite,
          rsvp_status,
          is_capo_famiglia,
          tavolo_id,
          posto_numero,
          whatsapp_rsvp_inviato,
          whatsapp_rsvp_inviato_at,
          whatsapp_message_price,
          whatsapp_message_currency,
          whatsapp_message_status,
          whatsapp_message_sid,
          whatsapp_message_from,
          whatsapp_message_body,
          whatsapp_date_sent,
          whatsapp_date_created,
          whatsapp_date_updated,
          created_at,
          famiglia:famiglie(id, nome),
          gruppo:gruppi(id, nome, colore)
        `)
        .eq('wedding_id', weddingId)
        .order('cognome', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          count: guests?.length || 0,
          data: guests || []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET' && guestId && !isWebhook) {
      // GET single guest
      const { data: guest, error } = await supabaseAdmin
        .from('invitati')
        .select(`
          *,
          famiglia:famiglie(*),
          gruppo:gruppi(*)
        `)
        .eq('id', guestId)
        .eq('wedding_id', weddingId)
        .single()

      if (error) throw error

      if (!guest) {
        return new Response(
          JSON.stringify({ error: 'Guest not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: guest
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST' && isWebhook) {
      // Twilio webhook handler
      const contentType = req.headers.get('content-type') || ''
      let webhookData: any = {}

      if (contentType.includes('application/json')) {
        webhookData = await req.json()
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData()
        webhookData = Object.fromEntries(formData.entries())
      } else {
        return new Response(
          JSON.stringify({ error: 'Unsupported content type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const {
        MessageSid,
        MessageStatus,
        To,
        From,
        Body,
        Price,
        PriceUnit,
        DateSent,
        DateCreated,
        DateUpdated
      } = webhookData

      // Find guest by phone number
      const phoneNumber = To?.replace('whatsapp:', '').trim()
      
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ error: 'Phone number required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: guest } = await supabaseAdmin
        .from('invitati')
        .select('id')
        .eq('wedding_id', weddingId)
        .eq('cellulare', phoneNumber)
        .single()

      if (!guest) {
        console.log('Guest not found for phone:', phoneNumber)
        return new Response(
          JSON.stringify({ error: 'Guest not found with this phone number' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update guest with message details
      const { error } = await supabaseAdmin
        .from('invitati')
        .update({
          whatsapp_message_sid: MessageSid,
          whatsapp_message_status: MessageStatus,
          whatsapp_message_from: From,
          whatsapp_message_body: Body,
          whatsapp_message_price: Price ? parseFloat(Price) : null,
          whatsapp_message_currency: PriceUnit || 'USD',
          whatsapp_date_sent: DateSent,
          whatsapp_date_created: DateCreated,
          whatsapp_date_updated: DateUpdated || new Date().toISOString(),
          whatsapp_rsvp_inviato: true,
          whatsapp_rsvp_inviato_at: DateSent || new Date().toISOString()
        })
        .eq('id', guest.id)

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook processed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST' && guestId && !isWebhook) {
      // Update guest
      const updateData = await req.json()

      // Verify guest belongs to this wedding
      const { data: existingGuest } = await supabaseAdmin
        .from('invitati')
        .select('id')
        .eq('id', guestId)
        .eq('wedding_id', weddingId)
        .single()

      if (!existingGuest) {
        return new Response(
          JSON.stringify({ error: 'Guest not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update guest
      const { data: updatedGuest, error } = await supabaseAdmin
        .from('invitati')
        .update(updateData)
        .eq('id', guestId)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Guest updated successfully',
          data: updatedGuest
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
