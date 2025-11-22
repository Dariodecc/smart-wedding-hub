# Guest Management API Documentation

## Overview

The Guest API provides secure access to wedding guest data with Basic Authentication. It supports operations for retrieving, updating guest information, and receiving Twilio webhook notifications for WhatsApp message tracking.

## Base URL

```
https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests
```

## Authentication

All endpoints require API key authentication using a custom header. API keys are managed in Admin Settings.

```bash
x-api-key: YOUR_API_KEY
```

### Setting Up API Keys

1. Navigate to **Impostazioni Admin** (Admin Settings)
2. Click **Nuova Chiave** (New Key)
3. Enter a descriptive name for the key
4. Select the weddings this key should have access to
5. Click **Crea Chiave API**
6. Copy and securely store the generated API key (it will only be shown once)

---

## Endpoints

### 1. Get All Guests

Retrieve all guests for a specific wedding.

**Endpoint:** `GET /:weddingId`

#### Request

```bash
curl -X GET "https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/{weddingId}" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Response (200 OK)

```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "id": "uuid",
      "nome": "Mario",
      "cognome": "Rossi",
      "email": "mario@example.com",
      "cellulare": "+393401234567",
      "tipo_ospite": "Adulto",
      "rsvp_status": "Ci sarò",
      "is_capo_famiglia": true,
      "tavolo_id": "table-uuid",
      "posto_numero": 1,
      "whatsapp_rsvp_inviato": true,
      "whatsapp_rsvp_inviato_at": "2025-01-22T10:30:00Z",
      "whatsapp_message_price": 0.0042,
      "whatsapp_message_currency": "USD",
      "whatsapp_message_status": "delivered",
      "whatsapp_message_sid": "MM1234567890abcdef",
      "whatsapp_message_from": "whatsapp:+12298006897",
      "whatsapp_message_body": "Ciao Mario! Ecco il tuo link RSVP...",
      "whatsapp_date_sent": "2025-01-22T10:30:00Z",
      "whatsapp_date_created": "2025-01-22T10:29:55Z",
      "whatsapp_date_updated": "2025-01-22T10:30:05Z",
      "famiglia": {
        "id": "family-uuid",
        "nome": "Famiglia Rossi"
      },
      "gruppo": {
        "id": "group-uuid",
        "nome": "Parenti",
        "colore": "#3b82f6"
      },
      "created_at": "2025-01-15T08:00:00Z"
    }
  ]
}
```

---

### 2. Get Single Guest

Retrieve details of a specific guest.

**Endpoint:** `GET /:weddingId/:guestId`

#### Request

```bash
curl -X GET "https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/{weddingId}/{guestId}" \
  -H "x-api-key: YOUR_API_KEY"
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "guest-uuid",
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "mario@example.com",
    "cellulare": "+393401234567",
    "tipo_ospite": "Adulto",
    "rsvp_status": "Ci sarò",
    "whatsapp_message_status": "delivered",
    "whatsapp_message_price": 0.0042,
    "whatsapp_message_currency": "USD",
    "famiglia": {
      "id": "family-uuid",
      "nome": "Famiglia Rossi"
    },
    "gruppo": {
      "id": "group-uuid",
      "nome": "Parenti",
      "colore": "#3b82f6"
    }
  }
}
```

---

### 3. Update Guest

Update guest information including WhatsApp message tracking.

**Endpoint:** `POST /:weddingId/:guestId`

#### Request

```bash
curl -X POST "https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/{weddingId}/{guestId}" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "rsvp_status": "Ci sarò",
    "whatsapp_message_status": "delivered",
    "whatsapp_message_price": 0.0042,
    "whatsapp_message_currency": "USD"
  }'
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Guest updated successfully",
  "data": {
    "id": "guest-uuid",
    "nome": "Mario",
    "cognome": "Rossi",
    "rsvp_status": "Ci sarò",
    "whatsapp_message_status": "delivered"
  }
}
```

---

### 4. Twilio Webhook Handler

Receives WhatsApp message status updates from Twilio and automatically updates guest records.

**Endpoint:** `POST /:weddingId/webhook`

#### Configure in Twilio

1. Go to **Twilio Console** → **Messaging** → **Settings**
2. Set **Status Callback URL** to:
   ```
   https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/{YOUR_WEDDING_ID}/webhook
   ```
3. Add custom header:
   - Name: `x-api-key`
   - Value: `YOUR_API_KEY`

#### Request (from Twilio)

```bash
curl -X POST "https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/{weddingId}/webhook" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=MM1234567890abcdef" \
  -d "MessageStatus=delivered" \
  -d "To=whatsapp:+393401234567" \
  -d "From=whatsapp:+12298006897" \
  -d "Body=Message text" \
  -d "Price=-0.0042" \
  -d "PriceUnit=USD" \
  -d "DateSent=2025-01-22T10:30:00Z" \
  -d "DateCreated=2025-01-22T10:29:55Z"
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

## WhatsApp Message Tracking Fields

| Field | Type | Description |
|-------|------|-------------|
| `whatsapp_message_price` | NUMERIC(10,4) | Cost of the message |
| `whatsapp_message_currency` | VARCHAR(3) | Currency code (USD, EUR, etc.) |
| `whatsapp_message_status` | VARCHAR(50) | Status: queued, sent, delivered, read, failed |
| `whatsapp_message_sid` | VARCHAR(100) | Twilio message SID |
| `whatsapp_message_from` | VARCHAR(50) | Sender number (whatsapp:+xxx) |
| `whatsapp_message_body` | TEXT | Message content |
| `whatsapp_date_sent` | TIMESTAMP | When message was sent |
| `whatsapp_date_created` | TIMESTAMP | When message was created |
| `whatsapp_date_updated` | TIMESTAMP | Last status update |

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Wedding ID required"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized. Invalid credentials."
}
```

### 404 Not Found

```json
{
  "error": "Guest not found"
}
```

### 405 Method Not Allowed

```json
{
  "error": "Method not allowed"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "details": "Error message details"
}
```

---

## Integration Examples

### Python Example

```python
import requests

# API Configuration
WEDDING_ID = "your-wedding-id"
API_KEY = "sk_your_api_key_here"
BASE_URL = f"https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/{WEDDING_ID}"

# Create headers with custom API key
headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# Get all guests
response = requests.get(BASE_URL, headers=headers)
guests = response.json()
print(f"Total guests: {guests['count']}")

# Update a guest
guest_id = "guest-uuid"
update_data = {
    "rsvp_status": "Ci sarò",
    "whatsapp_message_status": "delivered"
}
response = requests.post(
    f"{BASE_URL}/{guest_id}",
    headers=headers,
    json=update_data
)
print(response.json())
```

### Node.js Example

```javascript
const axios = require('axios');

const WEDDING_ID = 'your-wedding-id';
const API_KEY = 'sk_your_api_key_here';
const BASE_URL = `https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/${WEDDING_ID}`;

const headers = {
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

// Get all guests
axios.get(BASE_URL, { headers })
  .then(response => {
    console.log(`Total guests: ${response.data.count}`);
    console.log(response.data.data);
  })
  .catch(error => console.error(error));

// Update a guest
const guestId = 'guest-uuid';
const updateData = {
  rsvp_status: 'Ci sarò',
  whatsapp_message_status: 'delivered'
};

axios.post(`${BASE_URL}/${guestId}`, updateData, { headers })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

### n8n Workflow Example

**Configuration:**
```yaml
Authentication: Generic Credential Type
  Generic Auth Type: Header Auth

Header Auth Credential:
  Name: x-api-key
  Value: sk_your_api_key_here
```

**Workflow JSON:**
```json
{
  "name": "Twilio to Guest API",
  "nodes": [
    {
      "name": "Webhook - Twilio Status",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "twilio-status",
        "responseMode": "responseNode",
        "options": {}
      }
    },
    {
      "name": "Send to Guest API",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "=https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1/guests/{{$env.WEDDING_ID}}/webhook",
        "method": "POST",
        "authentication": "genericCredentialType",
        "genericAuthType": "headerAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-api-key",
              "value": "={{$env.API_KEY}}"
            }
          ]
        },
        "sendBody": true,
        "contentType": "form-urlencoded",
        "bodyParameters": {
          "parameters": [
            {
              "name": "MessageSid",
              "value": "={{ $json.body.MessageSid }}"
            },
            {
              "name": "MessageStatus",
              "value": "={{ $json.body.MessageStatus }}"
            },
            {
              "name": "To",
              "value": "={{ $json.body.To }}"
            },
            {
              "name": "From",
              "value": "={{ $json.body.From }}"
            },
            {
              "name": "Body",
              "value": "={{ $json.body.Body }}"
            },
            {
              "name": "Price",
              "value": "={{ $json.body.Price }}"
            },
            {
              "name": "PriceUnit",
              "value": "={{ $json.body.PriceUnit }}"
            },
            {
              "name": "DateSent",
              "value": "={{ $json.body.DateSent }}"
            },
            {
              "name": "DateCreated",
              "value": "={{ $json.body.DateCreated }}"
            }
          ]
        }
      }
    },
    {
      "name": "Respond to Twilio",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { success: true } }}"
      }
    }
  ]
}
```

---

## Security Best Practices

1. **Use HTTPS Only**: All API calls must use HTTPS
2. **Rotate Credentials**: Periodically change API username and password
3. **Limit Access**: Only share credentials with trusted systems
4. **Monitor Usage**: Check API logs regularly for unauthorized access
5. **Strong Passwords**: Use complex passwords (min 12 characters, mixed case, numbers, symbols)

---

## Rate Limiting

Currently, there are no hard rate limits on the API. However, please be respectful and avoid excessive requests. Recommended guidelines:

- **Polling**: Max 1 request per minute for status checks
- **Bulk Updates**: Max 30 updates per minute
- **Webhooks**: No limit (Twilio-initiated)

---

## Support

For API support or issues:

1. Check the error message in the response
2. Review the API documentation
3. Verify your credentials are correct
4. Contact the system administrator

---

## Changelog

### Version 1.0.0 (2025-01-22)

- Initial release
- GET all guests endpoint
- GET single guest endpoint
- POST update guest endpoint
- POST Twilio webhook handler
- WhatsApp message tracking fields
- Basic Authentication support
