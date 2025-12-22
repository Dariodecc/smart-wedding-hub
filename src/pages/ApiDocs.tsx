import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Book, Key, Shield, Code, Copy, Check, Server, Webhook, Users,
  AlertTriangle, CheckCircle2, XCircle, Clock, ArrowRight, Terminal,
  FileJson, Globe, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://ihjhxtwgbrqabogysdsa.supabase.co/functions/v1";

const CodeBlock = ({ code, language = "bash", t }: { code: string; language?: string; t: (key: string) => string }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: t('copied') });
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

const EndpointCard = ({ method, endpoint, title, description, children }: { 
  method: string; endpoint: string; title: string; description: string; children: React.ReactNode;
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
  const { t } = useTranslation('api');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-gray-600 hover:text-gray-900 shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
                {t('title')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                {t('subtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {t('version')}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => navigate('/impostazioni-admin')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('backToSettings')}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              {t('overview.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{t('overview.description')}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">{t('overview.restful.title')}</p>
                  <p className="text-xs text-green-700">{t('overview.restful.desc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">{t('overview.secure.title')}</p>
                  <p className="text-xs text-blue-700">{t('overview.secure.desc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <Key className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">{t('overview.permissions.title')}</p>
                  <p className="text-xs text-purple-700">{t('overview.permissions.desc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <Webhook className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">{t('overview.webhook.title')}</p>
                  <p className="text-xs text-orange-700">{t('overview.webhook.desc')}</p>
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
              {t('baseUrl.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`${BASE_URL}/api`} t={t} />
            <p className="text-sm text-gray-500 mt-2">{t('baseUrl.note')}</p>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              {t('auth.title')}
            </CardTitle>
            <CardDescription>{t('auth.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">{t('auth.important')}</p>
                  <p className="text-sm text-amber-700">{t('auth.importantDesc')}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t('auth.header')}</h4>
              <CodeBlock code={`Authorization: Bearer sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} t={t} />
            </div>
            <div>
              <h4 className="font-medium mb-2">{t('auth.example')}</h4>
              <CodeBlock code={`curl -X GET "${BASE_URL}/api/invitati" \\
  -H "Authorization: Bearer sk_your_api_key_here"`} t={t} />
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">{t('auth.configTitle')}</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>{t('auth.step1')}</li>
                <li>{t('auth.step2')}</li>
                <li>{t('auth.step3')}</li>
                <li>{t('auth.step4')}</li>
                <li>{t('auth.step5')}</li>
                <li>{t('auth.step6')}</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('permissionsSection.title')}
            </CardTitle>
            <CardDescription>{t('permissionsSection.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">{t('permissionsSection.resource')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">{t('permissionsSection.resourceDesc')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">{t('permissionsSection.read')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">{t('permissionsSection.write')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { resource: "invitati", key: "invitati" },
                    { resource: "famiglie", key: "famiglie" },
                    { resource: "gruppi", key: "gruppi" },
                    { resource: "tavoli", key: "tavoli" },
                    { resource: "weddings", key: "weddings" },
                    { resource: "preferenze_alimentari_custom", key: "preferenze" },
                  ].map((item) => (
                    <tr key={item.resource} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">{item.resource}</code>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{t(`permissionsSection.${item.key}`)}</td>
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
            {t('endpoints.title')}
          </h2>
          
          <Tabs defaultValue="invitati" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-2">
              <TabsTrigger value="invitati">{t('endpoints.invitati')}</TabsTrigger>
              <TabsTrigger value="famiglie">{t('endpoints.famiglie')}</TabsTrigger>
              <TabsTrigger value="gruppi">{t('endpoints.gruppi')}</TabsTrigger>
              <TabsTrigger value="tavoli">{t('endpoints.tavoli')}</TabsTrigger>
              <TabsTrigger value="webhook">{t('endpoints.webhook')}</TabsTrigger>
            </TabsList>

            <TabsContent value="invitati" className="space-y-4">
              <EndpointCard method="GET" endpoint="/api/invitati" title={t('endpoints.guests.list.title')} description={t('endpoints.guests.list.desc')}>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm">{t('endpoints.queryParams')}</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li><code className="bg-gray-100 px-1 rounded">wedding_id</code> - Filter by specific wedding</li>
                      <li><code className="bg-gray-100 px-1 rounded">limit</code> - Max results (default: 100)</li>
                      <li><code className="bg-gray-100 px-1 rounded">offset</code> - Pagination offset</li>
                    </ul>
                  </div>
                  <CodeBlock code={`curl -X GET "${BASE_URL}/api/invitati?wedding_id=uuid&limit=50" \\
  -H "Authorization: Bearer sk_your_api_key"`} t={t} />
                </div>
              </EndpointCard>
              <EndpointCard method="GET" endpoint="/api/invitati/:id" title={t('endpoints.guests.detail.title')} description={t('endpoints.guests.detail.desc')}>
                <CodeBlock code={`curl -X GET "${BASE_URL}/api/invitati/guest-uuid" \\
  -H "Authorization: Bearer sk_your_api_key"`} t={t} />
              </EndpointCard>
              <EndpointCard method="POST" endpoint="/api/invitati" title={t('endpoints.guests.create.title')} description={t('endpoints.guests.create.desc')}>
                <CodeBlock code={`curl -X POST "${BASE_URL}/api/invitati" \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "wedding_id": "uuid", "nome": "Mario", "cognome": "Rossi" }'`} t={t} />
              </EndpointCard>
              <EndpointCard method="PUT" endpoint="/api/invitati/:id" title={t('endpoints.guests.update.title')} description={t('endpoints.guests.update.desc')}>
                <CodeBlock code={`curl -X PUT "${BASE_URL}/api/invitati/guest-uuid" \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -d '{ "rsvp_status": "Ci sarò" }'`} t={t} />
              </EndpointCard>
              <EndpointCard method="DELETE" endpoint="/api/invitati/:id" title={t('endpoints.guests.delete.title')} description={t('endpoints.guests.delete.desc')}>
                <CodeBlock code={`curl -X DELETE "${BASE_URL}/api/invitati/guest-uuid" \\
  -H "Authorization: Bearer sk_your_api_key"`} t={t} />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="famiglie" className="space-y-4">
              <EndpointCard method="GET" endpoint="/api/famiglie" title={t('endpoints.families.list.title')} description={t('endpoints.families.list.desc')}>
                <CodeBlock code={`curl -X GET "${BASE_URL}/api/famiglie" -H "Authorization: Bearer sk_your_api_key"`} t={t} />
              </EndpointCard>
              <EndpointCard method="POST" endpoint="/api/famiglie" title={t('endpoints.families.create.title')} description={t('endpoints.families.create.desc')}>
                <CodeBlock code={`curl -X POST "${BASE_URL}/api/famiglie" -H "Authorization: Bearer sk_your_api_key" -d '{ "wedding_id": "uuid", "nome": "Famiglia Rossi" }'`} t={t} />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="gruppi" className="space-y-4">
              <EndpointCard method="GET" endpoint="/api/gruppi" title={t('endpoints.groups.list.title')} description={t('endpoints.groups.list.desc')}>
                <CodeBlock code={`curl -X GET "${BASE_URL}/api/gruppi" -H "Authorization: Bearer sk_your_api_key"`} t={t} />
              </EndpointCard>
              <EndpointCard method="POST" endpoint="/api/gruppi" title={t('endpoints.groups.create.title')} description={t('endpoints.groups.create.desc')}>
                <CodeBlock code={`curl -X POST "${BASE_URL}/api/gruppi" -H "Authorization: Bearer sk_your_api_key" -d '{ "wedding_id": "uuid", "nome": "Parenti", "colore": "#3b82f6" }'`} t={t} />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="tavoli" className="space-y-4">
              <EndpointCard method="GET" endpoint="/api/tavoli" title={t('endpoints.tables.list.title')} description={t('endpoints.tables.list.desc')}>
                <CodeBlock code={`curl -X GET "${BASE_URL}/api/tavoli" -H "Authorization: Bearer sk_your_api_key"`} t={t} />
              </EndpointCard>
              <EndpointCard method="POST" endpoint="/api/tavoli" title={t('endpoints.tables.create.title')} description={t('endpoints.tables.create.desc')}>
                <CodeBlock code={`curl -X POST "${BASE_URL}/api/tavoli" -H "Authorization: Bearer sk_your_api_key" -d '{ "wedding_id": "uuid", "nome": "Tavolo 1", "capienza": 10 }'`} t={t} />
              </EndpointCard>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4">
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-900">
                    <Webhook className="h-5 w-5" />
                    {t('endpoints.webhookSection.title')}
                  </CardTitle>
                  <CardDescription className="text-orange-700">{t('endpoints.webhookSection.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 text-orange-900">{t('endpoints.webhookSection.configTitle')}</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-orange-800">
                      <li>{t('endpoints.webhookSection.step1')}</li>
                      <li>{t('endpoints.webhookSection.step2')}</li>
                    </ol>
                    <CodeBlock code={`${BASE_URL}/guests/{WEDDING_ID}/webhook`} t={t} />
                    <ol start={3} className="list-decimal list-inside text-sm text-orange-800 mt-2">
                      <li>{t('endpoints.webhookSection.step3')}</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
              <EndpointCard method="POST" endpoint="/guests/:weddingId/webhook" title={t('endpoints.webhookSection.handler.title')} description={t('endpoints.webhookSection.handler.desc')}>
                <p className="text-sm text-gray-600 mb-4">{t('endpoints.webhookSection.autoSend')}</p>
                <h4 className="font-medium mb-2 text-sm">{t('endpoints.webhookSection.trackedFields')}</h4>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {[
                    { field: "whatsapp_message_status", key: "statusDesc" },
                    { field: "whatsapp_message_price", key: "priceDesc" },
                    { field: "whatsapp_message_sid", key: "sidDesc" },
                    { field: "whatsapp_date_sent", key: "dateDesc" },
                  ].map((item) => (
                    <div key={item.field} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      <code className="text-xs bg-gray-200 px-1 rounded">{item.field}</code>
                      <span className="text-gray-600 text-xs">{t(`endpoints.webhookSection.${item.key}`)}</span>
                    </div>
                  ))}
                </div>
              </EndpointCard>
            </TabsContent>
          </Tabs>
        </div>

        {/* Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              {t('errors.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["400", "401", "403", "404", "405", "500"].map((code) => (
                <div key={code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <Badge variant={code.startsWith("4") ? "destructive" : "secondary"}>{code}</Badge>
                  <div>
                    <p className="font-medium">{t(`errors.${code}.title`)}</p>
                    <p className="text-sm text-gray-600">{t(`errors.${code}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('security.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{t(`security.tip${i}.title`)}</p>
                    <p className="text-sm text-gray-600">{t(`security.tip${i}.desc`)}</p>
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
              {t('rateLimit.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{t('rateLimit.description')}</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-900">1/min</p>
                <p className="text-sm text-blue-700">{t('rateLimit.polling')}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-900">30/min</p>
                <p className="text-sm text-green-700">{t('rateLimit.bulk')}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-900">∞</p>
                <p className="text-sm text-orange-700">{t('rateLimit.webhooks')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiDocs;
