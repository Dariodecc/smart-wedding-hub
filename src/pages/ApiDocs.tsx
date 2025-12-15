import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Book, 
  Key, 
  Shield, 
  Code, 
  Copy, 
  Check,
  Server,
  Webhook,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Terminal,
  FileJson,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1";

const CodeBlock = ({ code, language = "bash" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copiato negli appunti" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-gray-800 hover:bg-gray-700 text-gray-300"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-green-100 text-green-800 border-green-200",
    POST: "bg-blue-100 text-blue-800 border-blue-200",
    PUT: "bg-yellow-100 text-yellow-800 border-yellow-200",
    DELETE: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Badge className={`${colors[method] || "bg-gray-100 text-gray-800"} font-mono`}>
      {method}
    </Badge>
  );
};

const EndpointCard = ({ 
  method, 
  endpoint, 
  title, 
  description,
  children 
}: { 
  method: string;
  endpoint: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <Card className="border-gray-200">
    <CardHeader>
      <div className="flex items-center gap-3 mb-2">
        <MethodBadge method={method} />
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{endpoint}</code>
      </div>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const ApiDocs = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="lg:hidden" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documentazione API</h1>
              <p className="text-sm text-gray-500">Guida completa per l'integrazione con le API</p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex items-center gap-1">
            <Globe className="h-3 w-3" />
            v2.0
          </Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              Panoramica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Le API di Matrimonio SMART forniscono accesso sicuro ai dati degli invitati con autenticazione tramite API Key. 
              Supportano operazioni CRUD su diverse risorse e integrazione con webhook Twilio per il tracciamento dei messaggi WhatsApp.
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">RESTful</p>
                  <p className="text-xs text-green-700">Endpoints standard</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Sicuro</p>
                  <p className="text-xs text-blue-700">API Key + Hash SHA-256</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <Key className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Permessi Granulari</p>
                  <p className="text-xs text-purple-700">Per risorsa e operazione</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <Webhook className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Webhook</p>
                  <p className="text-xs text-orange-700">Integrazione Twilio</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Base URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              Base URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`${BASE_URL}/api`} />
            <p className="text-sm text-gray-500 mt-2">
              Tutte le richieste devono utilizzare HTTPS.
            </p>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Autenticazione
            </CardTitle>
            <CardDescription>
              Tutte le richieste richiedono autenticazione tramite Bearer Token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Importante</p>
                  <p className="text-sm text-amber-700">
                    Il token API è visibile solo al momento della creazione. Conservalo in modo sicuro.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Header di autenticazione</h4>
              <CodeBlock code={`Authorization: Bearer sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} />
            </div>

            <div>
              <h4 className="font-medium mb-2">Esempio cURL</h4>
              <CodeBlock 
                code={`curl -X GET "${BASE_URL}/api/invitati" \\
  -H "Authorization: Bearer sk_your_api_key_here"`}
              />
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Configurazione API Key</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Vai su <strong>Impostazioni Admin</strong> → <strong>API Keys</strong></li>
                <li>Clicca <strong>Nuova Chiave</strong></li>
                <li>Inserisci un nome descrittivo</li>
                <li>Seleziona i matrimoni a cui la chiave avrà accesso</li>
                <li>Configura i permessi per ogni risorsa (lettura/scrittura)</li>
                <li>Copia e conserva il token generato</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Sistema di Permessi
            </CardTitle>
            <CardDescription>
              Ogni API Key può avere permessi granulari per risorsa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Risorsa</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Descrizione</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Lettura</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Scrittura</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { resource: "invitati", description: "Gestione invitati" },
                    { resource: "famiglie", description: "Gestione famiglie" },
                    { resource: "gruppi", description: "Gestione gruppi" },
                    { resource: "tavoli", description: "Gestione tavoli" },
                    { resource: "weddings", description: "Informazioni matrimonio" },
                    { resource: "preferenze_alimentari_custom", description: "Preferenze alimentari personalizzate" },
                  ].map((item) => (
                    <tr key={item.resource} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{item.resource}</code>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.description}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">GET</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">POST/PUT/DELETE</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Code className="h-5 w-5" />
            Endpoints
          </h2>
          
          <Tabs defaultValue="invitati" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-2">
              <TabsTrigger value="invitati">Invitati</TabsTrigger>
              <TabsTrigger value="famiglie">Famiglie</TabsTrigger>
              <TabsTrigger value="gruppi">Gruppi</TabsTrigger>
              <TabsTrigger value="tavoli">Tavoli</TabsTrigger>
              <TabsTrigger value="webhook">Webhook</TabsTrigger>
            </TabsList>

            <TabsContent value="invitati" className="space-y-4">
              <EndpointCard
                method="GET"
                endpoint="/api/invitati"
                title="Lista Invitati"
                description="Recupera tutti gli invitati. Filtra automaticamente per i matrimoni autorizzati."
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Query Parameters (opzionali)</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li><code className="bg-gray-100 px-1 rounded">wedding_id</code> - Filtra per matrimonio specifico</li>
                      <li><code className="bg-gray-100 px-1 rounded">limit</code> - Numero massimo di risultati (default: 100)</li>
                      <li><code className="bg-gray-100 px-1 rounded">offset</code> - Offset per paginazione</li>
                    </ul>
                  </div>
                  <CodeBlock 
                    code={`curl -X GET "${BASE_URL}/api/invitati?wedding_id=uuid&limit=50" \\
  -H "Authorization: Bearer sk_your_api_key"`}
                  />
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Response (200 OK)</h4>
                    <CodeBlock 
                      language="json"
                      code={`{
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
      "preferenze_alimentari": ["Vegetariano"],
      "is_capo_famiglia": true,
      "famiglia_id": "uuid",
      "gruppo_id": "uuid",
      "tavolo_id": "uuid",
      "posto_numero": 1
    }
  ]
}`}
                    />
                  </div>
                </div>
              </EndpointCard>

              <EndpointCard
                method="GET"
                endpoint="/api/invitati/:id"
                title="Dettaglio Invitato"
                description="Recupera i dettagli di un singolo invitato."
              >
                <CodeBlock 
                  code={`curl -X GET "${BASE_URL}/api/invitati/guest-uuid" \\
  -H "Authorization: Bearer sk_your_api_key"`}
                />
              </EndpointCard>

              <EndpointCard
                method="POST"
                endpoint="/api/invitati"
                title="Crea Invitato"
                description="Crea un nuovo invitato. Richiede permesso di scrittura."
              >
                <CodeBlock 
                  code={`curl -X POST "${BASE_URL}/api/invitati" \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "wedding_id": "wedding-uuid",
    "nome": "Mario",
    "cognome": "Rossi",
    "cellulare": "+393401234567",
    "tipo_ospite": "Adulto"
  }'`}
                />
              </EndpointCard>

              <EndpointCard
                method="PUT"
                endpoint="/api/invitati/:id"
                title="Aggiorna Invitato"
                description="Aggiorna i dati di un invitato esistente."
              >
                <CodeBlock 
                  code={`curl -X PUT "${BASE_URL}/api/invitati/guest-uuid" \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rsvp_status": "Ci sarò",
    "preferenze_alimentari": ["Vegano", "Senza glutine"]
  }'`}
                />
              </EndpointCard>

              <EndpointCard
                method="DELETE"
                endpoint="/api/invitati/:id"
                title="Elimina Invitato"
                description="Elimina un invitato. Richiede permesso di scrittura."
              >
                <CodeBlock 
                  code={`curl -X DELETE "${BASE_URL}/api/invitati/guest-uuid" \\
  -H "Authorization: Bearer sk_your_api_key"`}
                />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="famiglie" className="space-y-4">
              <EndpointCard
                method="GET"
                endpoint="/api/famiglie"
                title="Lista Famiglie"
                description="Recupera tutte le famiglie."
              >
                <CodeBlock 
                  code={`curl -X GET "${BASE_URL}/api/famiglie" \\
  -H "Authorization: Bearer sk_your_api_key"`}
                />
              </EndpointCard>

              <EndpointCard
                method="POST"
                endpoint="/api/famiglie"
                title="Crea Famiglia"
                description="Crea una nuova famiglia."
              >
                <CodeBlock 
                  code={`curl -X POST "${BASE_URL}/api/famiglie" \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "wedding_id": "wedding-uuid",
    "nome": "Famiglia Rossi"
  }'`}
                />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="gruppi" className="space-y-4">
              <EndpointCard
                method="GET"
                endpoint="/api/gruppi"
                title="Lista Gruppi"
                description="Recupera tutti i gruppi."
              >
                <CodeBlock 
                  code={`curl -X GET "${BASE_URL}/api/gruppi" \\
  -H "Authorization: Bearer sk_your_api_key"`}
                />
              </EndpointCard>

              <EndpointCard
                method="POST"
                endpoint="/api/gruppi"
                title="Crea Gruppo"
                description="Crea un nuovo gruppo."
              >
                <CodeBlock 
                  code={`curl -X POST "${BASE_URL}/api/gruppi" \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "wedding_id": "wedding-uuid",
    "nome": "Parenti Sposo",
    "colore": "#3b82f6"
  }'`}
                />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="tavoli" className="space-y-4">
              <EndpointCard
                method="GET"
                endpoint="/api/tavoli"
                title="Lista Tavoli"
                description="Recupera tutti i tavoli."
              >
                <CodeBlock 
                  code={`curl -X GET "${BASE_URL}/api/tavoli" \\
  -H "Authorization: Bearer sk_your_api_key"`}
                />
              </EndpointCard>

              <EndpointCard
                method="POST"
                endpoint="/api/tavoli"
                title="Crea Tavolo"
                description="Crea un nuovo tavolo."
              >
                <CodeBlock 
                  code={`curl -X POST "${BASE_URL}/api/tavoli" \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "wedding_id": "wedding-uuid",
    "nome": "Tavolo 1",
    "tipo": "rotondo",
    "capienza": 10
  }'`}
                />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4">
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-900">
                    <Webhook className="h-5 w-5" />
                    Webhook Twilio per WhatsApp
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    Ricevi aggiornamenti sullo stato dei messaggi WhatsApp inviati tramite Twilio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-orange-900">Configurazione Twilio</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-orange-800">
                      <li>Vai su <strong>Twilio Console</strong> → <strong>Messaging</strong> → <strong>Settings</strong></li>
                      <li>Imposta <strong>Status Callback URL</strong>:</li>
                    </ol>
                    <CodeBlock code={`${BASE_URL}/guests/{WEDDING_ID}/webhook`} />
                    <ol start={3} className="list-decimal list-inside space-y-2 text-sm text-orange-800 mt-2">
                      <li>Aggiungi l'header <code className="bg-orange-100 px-1 rounded">x-api-key</code> con il tuo token</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              <EndpointCard
                method="POST"
                endpoint="/guests/:weddingId/webhook"
                title="Webhook Handler"
                description="Endpoint per ricevere gli aggiornamenti di stato da Twilio."
              >
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Twilio invia automaticamente le notifiche a questo endpoint quando lo stato di un messaggio cambia.
                  </p>
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Campi tracciati</h4>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      {[
                        { field: "whatsapp_message_status", desc: "queued, sent, delivered, read, failed" },
                        { field: "whatsapp_message_price", desc: "Costo del messaggio" },
                        { field: "whatsapp_message_sid", desc: "ID univoco Twilio" },
                        { field: "whatsapp_date_sent", desc: "Data invio" },
                      ].map((item) => (
                        <div key={item.field} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                          <code className="text-xs bg-gray-200 px-1 rounded">{item.field}</code>
                          <span className="text-gray-600 text-xs">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </EndpointCard>
            </TabsContent>
          </Tabs>
        </div>

        {/* Error Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Risposte di Errore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { code: "400", title: "Bad Request", desc: "Parametri mancanti o non validi" },
                { code: "401", title: "Unauthorized", desc: "Token API mancante o non valido" },
                { code: "403", title: "Forbidden", desc: "Permessi insufficienti per l'operazione" },
                { code: "404", title: "Not Found", desc: "Risorsa non trovata" },
                { code: "405", title: "Method Not Allowed", desc: "Metodo HTTP non supportato" },
                { code: "500", title: "Internal Server Error", desc: "Errore interno del server" },
              ].map((error) => (
                <div key={error.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <Badge variant={error.code.startsWith("4") ? "destructive" : "secondary"}>
                    {error.code}
                  </Badge>
                  <div>
                    <p className="font-medium">{error.title}</p>
                    <p className="text-sm text-gray-600">{error.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Formato errore</h4>
              <CodeBlock 
                language="json"
                code={`{
  "error": "Messaggio di errore",
  "details": "Dettagli aggiuntivi (opzionale)"
}`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Esempi di Integrazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="python" className="space-y-4">
              <TabsList>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                <TabsTrigger value="n8n">n8n</TabsTrigger>
              </TabsList>

              <TabsContent value="python">
                <CodeBlock 
                  language="python"
                  code={`import requests

API_KEY = "sk_your_api_key_here"
BASE_URL = "${BASE_URL}/api"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Lista invitati
response = requests.get(f"{BASE_URL}/invitati", headers=headers)
guests = response.json()
print(f"Totale invitati: {guests['count']}")

# Aggiorna invitato
guest_id = "guest-uuid"
update_data = {
    "rsvp_status": "Ci sarò",
    "preferenze_alimentari": ["Vegetariano"]
}
response = requests.put(
    f"{BASE_URL}/invitati/{guest_id}",
    headers=headers,
    json=update_data
)
print(response.json())`}
                />
              </TabsContent>

              <TabsContent value="nodejs">
                <CodeBlock 
                  language="javascript"
                  code={`const axios = require('axios');

const API_KEY = 'sk_your_api_key_here';
const BASE_URL = '${BASE_URL}/api';

const headers = {
  'Authorization': \`Bearer \${API_KEY}\`,
  'Content-Type': 'application/json'
};

// Lista invitati
axios.get(\`\${BASE_URL}/invitati\`, { headers })
  .then(response => {
    console.log(\`Totale invitati: \${response.data.count}\`);
  })
  .catch(error => console.error(error));

// Aggiorna invitato
const guestId = 'guest-uuid';
axios.put(\`\${BASE_URL}/invitati/\${guestId}\`, {
  rsvp_status: 'Ci sarò',
  preferenze_alimentari: ['Vegetariano']
}, { headers })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`}
                />
              </TabsContent>

              <TabsContent value="n8n">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Configura l'autenticazione in n8n usando <strong>Header Auth</strong>:
                  </p>
                  <CodeBlock 
                    language="yaml"
                    code={`Authentication: Generic Credential Type
Generic Auth Type: Header Auth

Header Auth Credential:
  Name: Authorization
  Value: Bearer sk_your_api_key_here`}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Best Practices di Sicurezza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "Usa sempre HTTPS", desc: "Tutte le chiamate API devono utilizzare HTTPS" },
                { title: "Ruota le chiavi", desc: "Rigenera periodicamente le API key" },
                { title: "Permessi minimi", desc: "Assegna solo i permessi strettamente necessari" },
                { title: "Monitora l'uso", desc: "Controlla regolarmente last_used_at delle chiavi" },
                { title: "Non condividere", desc: "Non esporre le API key nel codice client" },
                { title: "Limita i matrimoni", desc: "Associa ogni chiave solo ai matrimoni necessari" },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Rate Limiting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Al momento non ci sono limiti rigidi sulle richieste API. Linee guida consigliate:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-900">1/min</p>
                <p className="text-sm text-blue-700">Polling status</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-900">30/min</p>
                <p className="text-sm text-green-700">Bulk updates</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-900">∞</p>
                <p className="text-sm text-orange-700">Webhooks (Twilio)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiDocs;
