import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Key, Copy, Trash2, Eye, EyeOff, Check, Database, ExternalLink, X, Search, CheckCircle2, RefreshCw, AlertTriangle, Shield } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { API_PERMISSIONS, generateApiToken, hashToken, createTokenPreview } from '@/utils/api-tokens'

interface ApiKeyPermission {
  resource: string
  permission: string
}

interface ApiKey {
  id: string
  key_name: string
  api_key: string | null
  api_key_hash: string | null
  api_key_preview: string | null
  created_at: string
  last_used_at: string | null
  is_active: boolean
  weddings: { id: string; couple_name: string }[]
  permissions: ApiKeyPermission[]
}

export default function ImpostazioniAdmin() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [showDialog, setShowDialog] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [selectedWeddings, setSelectedWeddings] = useState<string[]>([])
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showServiceRole, setShowServiceRole] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState<string | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [permissionsSearch, setPermissionsSearch] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [regeneratingKey, setRegeneratingKey] = useState<ApiKey | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showEditPermissions, setShowEditPermissions] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [editPermissions, setEditPermissions] = useState<string[]>([])
  const [editPermissionsOpen, setEditPermissionsOpen] = useState(false)
  const [editPermissionsSearch, setEditPermissionsSearch] = useState('')
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)

  // Supabase configuration from env
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || ''
  const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloamh4dHdnYnJxYWJvZ3lzZHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4NTk3NCwiZXhwIjoyMDc5MTYxOTc0fQ.Ny-2wM6VwmT_Kt-_O1xhXjGw8BULmJ3W3wEgpFVCYp0'

  // Fetch all weddings for selection
  const { data: weddings = [] } = useQuery({
    queryKey: ['weddings-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weddings')
        .select('id, couple_name')
        .order('couple_name')

      if (error) throw error
      return data || []
    }
  })

  // Fetch API keys
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data: keys, error: keysError } = await supabase
        .from('api_keys')
        .select(`
          *,
          api_key_permissions (
            resource,
            permission
          ),
          api_key_weddings (
            wedding_id,
            weddings:wedding_id (
              id,
              couple_name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (keysError) throw keysError

      // Transform the data
      const transformedKeys = (keys || []).map((key: any) => ({
        ...key,
        weddings: (key.api_key_weddings || []).map((kw: any) => kw.weddings).filter(Boolean),
        permissions: key.api_key_permissions || []
      }))

      return transformedKeys
    }
  })

  // Wedding options for multi-select
  const weddingOptions = weddings.map(w => ({
    value: w.id,
    label: w.couple_name
  }))
  // Create API key
  const handleCreateApiKey = async () => {
    if (!keyName.trim()) {
      toast({ title: "Errore", description: "Inserisci un nome per la chiave API", variant: "destructive" })
      return
    }

    if (selectedWeddings.length === 0) {
      toast({ title: "Errore", description: "Seleziona almeno un matrimonio", variant: "destructive" })
      return
    }

    if (selectedPermissions.length === 0) {
      toast({ title: "Errore", description: "Seleziona almeno un permesso", variant: "destructive" })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Generate secure token
      const token = generateApiToken()
      const tokenHash = await hashToken(token)
      const tokenPreview = createTokenPreview(token)

      // Insert API key with hash (NOT plain text)
      const { data: newKey, error: keyError } = await supabase
        .from('api_keys')
        .insert({
          key_name: keyName,
          api_key_hash: tokenHash,
          api_key_preview: tokenPreview,
          api_key: null, // Do NOT save plain text
          created_by: user.id,
          is_active: true
        })
        .select()
        .single()

      if (keyError) throw keyError

      // Insert wedding associations
      const associations = selectedWeddings.map(weddingId => ({
        api_key_id: newKey.id,
        wedding_id: weddingId
      }))

      const { error: assocError } = await supabase
        .from('api_key_weddings')
        .insert(associations)

      if (assocError) throw assocError

      // Insert permissions
      const permissionsToInsert = selectedPermissions.map(perm => {
        const [resource, permission] = perm.split(':')
        return {
          api_key_id: newKey.id,
          resource,
          permission
        }
      })

      const { error: permError } = await supabase
        .from('api_key_permissions')
        .insert(permissionsToInsert)

      if (permError) throw permError

      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      
      // Close creation dialog and show success modal with token
      setShowDialog(false)
      setKeyName('')
      setSelectedWeddings([])
      setSelectedPermissions([])
      setCreatedToken(token)
      setTokenCopied(false)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error creating API key:', error)
      toast({ title: "Errore", description: "Errore nella creazione della chiave API", variant: "destructive" })
    }
  }

  // Copy created token to clipboard
  const copyCreatedToken = async () => {
    if (!createdToken) return
    try {
      await navigator.clipboard.writeText(createdToken)
      setTokenCopied(true)
      toast({ title: "Successo", description: "Chiave copiata negli appunti" })
    } catch (error) {
      toast({ title: "Errore", description: "Errore nella copia della chiave", variant: "destructive" })
    }
  }

  // Close success modal
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
    setCreatedToken(null)
    setTokenCopied(false)
    setRegeneratingKey(null)
  }

  // Regenerate API key token
  const handleRegenerateToken = async () => {
    if (!regeneratingKey) return
    
    setIsRegenerating(true)
    try {
      // Generate new token
      const newToken = generateApiToken()
      const newHash = await hashToken(newToken)
      const newPreview = createTokenPreview(newToken)

      // Update in database
      const { error } = await supabase
        .from('api_keys')
        .update({
          api_key_hash: newHash,
          api_key_preview: newPreview,
          api_key: null // Remove old plain text if present
        })
        .eq('id', regeneratingKey.id)

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      
      // Close confirm modal and show success modal with new token
      setShowRegenerateConfirm(false)
      setCreatedToken(newToken)
      setTokenCopied(false)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error regenerating API key:', error)
      toast({ title: "Errore", description: "Errore nella rigenerazione della chiave API", variant: "destructive" })
    } finally {
      setIsRegenerating(false)
    }
  }

  // Open edit permissions modal
  const openEditPermissions = (key: ApiKey) => {
    setEditingKey(key)
    // Convert current permissions to the format used by the selector
    const currentPerms = key.permissions.map(p => `${p.resource}:${p.permission}`)
    setEditPermissions(currentPerms)
    setEditPermissionsSearch('')
    setShowEditPermissions(true)
  }

  // Save updated permissions
  const handleSavePermissions = async () => {
    if (!editingKey) return
    
    if (editPermissions.length === 0) {
      toast({ title: "Errore", description: "Seleziona almeno un permesso", variant: "destructive" })
      return
    }

    setIsSavingPermissions(true)
    try {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('api_key_permissions')
        .delete()
        .eq('api_key_id', editingKey.id)

      if (deleteError) throw deleteError

      // Insert new permissions
      const newPermissions = editPermissions.map(perm => {
        const [resource, permission] = perm.split(':')
        return {
          api_key_id: editingKey.id,
          resource,
          permission
        }
      })

      const { error: insertError } = await supabase
        .from('api_key_permissions')
        .insert(newPermissions)

      if (insertError) throw insertError

      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      
      setShowEditPermissions(false)
      setEditingKey(null)
      setEditPermissions([])
      toast({ title: "Successo", description: "Permessi aggiornati con successo" })
    } catch (error) {
      console.error('Error updating permissions:', error)
      toast({ title: "Errore", description: "Errore nell'aggiornamento dei permessi", variant: "destructive" })
    } finally {
      setIsSavingPermissions(false)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa chiave API? Questa azione non può essere annullata.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({ title: "Successo", description: "Chiave API eliminata" })
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast({ title: "Errore", description: "Errore nell'eliminazione della chiave API", variant: "destructive" })
    }
  }

  // Toggle API key activation
  const handleToggleActive = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId)

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({ 
        title: "Successo", 
        description: currentStatus ? 'Chiave API disattivata' : 'Chiave API attivata' 
      })
    } catch (error) {
      console.error('Error toggling API key:', error)
      toast({ title: "Errore", description: "Errore nell'aggiornamento della chiave API", variant: "destructive" })
    }
  }

  // Copy API key to clipboard
  const copyToClipboard = async (apiKey: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopiedKey(keyId)
      toast({ title: "Successo", description: "Chiave copiata negli appunti" })
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (error) {
      toast({ title: "Errore", description: "Errore nella copia della chiave", variant: "destructive" })
    }
  }

  // Copy config value to clipboard
  const copyConfigToClipboard = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedConfig(key)
      toast({ title: "Successo", description: "Valore copiato negli appunti" })
      setTimeout(() => setCopiedConfig(null), 2000)
    } catch (error) {
      toast({ title: "Errore", description: "Errore nella copia", variant: "destructive" })
    }
  }

  // Toggle key visibility
  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keyId)) {
        newSet.delete(keyId)
      } else {
        newSet.add(keyId)
      }
      return newSet
    })
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Impostazioni Admin</h1>
        <p className="text-muted-foreground">Gestisci le chiavi API e la configurazione del progetto</p>
      </div>

      {/* Supabase Configuration Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Configurazione Lovable Cloud</CardTitle>
              <CardDescription className="mt-2">
                Credenziali e configurazione del progetto
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Project ID */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                Project ID
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono border">
                  {supabaseProjectId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyConfigToClipboard(supabaseProjectId, 'project-id')}
                >
                  {copiedConfig === 'project-id' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Supabase URL */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                URL
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono border">
                  {supabaseUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyConfigToClipboard(supabaseUrl, 'url')}
                >
                  {copiedConfig === 'url' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Anon Key */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                Anon Key (Publishable)
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono border overflow-x-auto">
                  {supabaseAnonKey}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyConfigToClipboard(supabaseAnonKey, 'anon')}
                >
                  {copiedConfig === 'anon' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Service Role Key */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                Service Role Key
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono border overflow-x-auto">
                  {showServiceRole 
                    ? supabaseServiceRoleKey 
                    : `${supabaseServiceRoleKey.substring(0, 20)}...${supabaseServiceRoleKey.substring(supabaseServiceRoleKey.length - 10)}`
                  }
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowServiceRole(!showServiceRole)}
                >
                  {showServiceRole ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyConfigToClipboard(supabaseServiceRoleKey, 'service-role')}
                >
                  {copiedConfig === 'service-role' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Questa chiave bypassa tutte le politiche RLS. Non esporla mai nel codice client.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">⚠️ Sicurezza</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                La Service Role Key deve essere utilizzata solo in ambienti server-side sicuri 
                (come Edge Functions). Non includerla mai nel codice frontend o in repository pubblici.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Chiavi API
              </CardTitle>
              <CardDescription className="mt-2">
                Crea e gestisci chiavi API per accedere agli endpoint degli invitati
              </CardDescription>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.open('https://docs.example.com/api', '_blank')}
              >
                Documentazione API
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Chiave
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nessuna chiave API creata</p>
              <Button onClick={() => setShowDialog(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crea la prima chiave
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Chiave API</TableHead>
                    <TableHead className="hidden md:table-cell">Permessi</TableHead>
                    <TableHead>Matrimoni</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="hidden lg:table-cell">Ultimo Utilizzo</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.key_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {/* Show preview for new keys, or masked old key for backward compatibility */}
                            {key.api_key_preview || (key.api_key 
                              ? `${key.api_key.substring(0, 8)}...${key.api_key.substring(key.api_key.length - 6)}`
                              : 'N/A'
                            )}
                          </code>
                          {/* Only show copy button for legacy keys that have api_key stored */}
                          {key.api_key && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(key.api_key!, key.id)}
                              title="Copia chiave (solo chiavi legacy)"
                            >
                              {copiedKey === key.id ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {/* Permissions column - hidden on mobile */}
                      <TableCell className="hidden md:table-cell">
                        {(() => {
                          const perms = key.permissions || []
                          if (perms.length === 0) {
                            return <span className="text-xs text-muted-foreground">Nessuno</span>
                          }
                          
                          const formatPerm = (p: ApiKeyPermission) => {
                            const resourceMap: Record<string, string> = {
                              'famiglie': 'Fam',
                              'gruppi': 'Grp',
                              'invitati': 'Inv',
                              'preferenze_alimentari_custom': 'Pref',
                              'tavoli': 'Tav',
                              'weddings': 'Wed'
                            }
                            const abbr = resourceMap[p.resource] || p.resource.substring(0, 3)
                            const permAbbr = p.permission === 'read' ? 'R' : 'W'
                            return `${abbr} ${permAbbr}`
                          }
                          
                          const displayPerms = perms.slice(0, 3)
                          const remainingCount = perms.length - 3
                          
                          return (
                            <div className="flex flex-wrap gap-1">
                              {displayPerms.map((perm, idx) => (
                                <Badge
                                  key={`${perm.resource}-${perm.permission}-${idx}`}
                                  variant="outline"
                                  className={`text-xs ${
                                    perm.permission === 'read'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                  }`}
                                >
                                  {formatPerm(perm)}
                                </Badge>
                              ))}
                              {remainingCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-muted"
                                  title={perms.slice(3).map(p => `${p.resource}: ${p.permission}`).join(', ')}
                                >
                                  +{remainingCount}
                                </Badge>
                              )}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {key.weddings.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Nessuno</span>
                          ) : (
                            key.weddings.map((wedding) => (
                              <Badge key={wedding.id} variant="secondary" className="text-xs">
                                {wedding.couple_name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.is_active ? 'default' : 'secondary'}>
                          {key.is_active ? 'Attiva' : 'Disattivata'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {key.last_used_at 
                          ? new Date(key.last_used_at).toLocaleDateString('it-IT')
                          : 'Mai'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(key.id, key.is_active)}
                          >
                            {key.is_active ? 'Disattiva' : 'Attiva'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPermissions(key)}
                            title="Modifica permessi"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRegeneratingKey(key)
                              setShowRegenerateConfirm(true)
                            }}
                            title="Rigenera token"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteApiKey(key.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crea Nuova Chiave API</DialogTitle>
            <DialogDescription>
              La chiave API sarà generata automaticamente e potrà essere usata per accedere agli endpoint degli invitati
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="key_name">Nome Chiave</Label>
              <Input
                id="key_name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Es: Production API Key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Un nome descrittivo per identificare questa chiave
              </p>
            </div>

            <div>
              <Label>Permessi *</Label>
              <Popover open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={permissionsOpen}
                    className="w-full justify-start h-auto min-h-10 font-normal"
                  >
                    {selectedPermissions.length === 0 ? (
                      <span className="text-muted-foreground">Seleziona i permessi...</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedPermissions.map(perm => {
                          const permObj = API_PERMISSIONS.find(p => p.value === perm)
                          return (
                            <Badge
                              key={perm}
                              variant="secondary"
                              className="mr-1 mb-1"
                            >
                              {permObj?.label}
                              <button
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    setSelectedPermissions(prev => prev.filter(p => p !== perm))
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setSelectedPermissions(prev => prev.filter(p => p !== perm))
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Cerca permessi..."
                      value={permissionsSearch}
                      onChange={(e) => setPermissionsSearch(e.target.value)}
                      className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="p-2">
                      {(() => {
                        const groups = [...new Set(API_PERMISSIONS.map(p => p.group))]
                        const filteredPermissions = API_PERMISSIONS.filter(p => 
                          p.label.toLowerCase().includes(permissionsSearch.toLowerCase()) ||
                          p.group.toLowerCase().includes(permissionsSearch.toLowerCase())
                        )
                        
                        return groups.map(group => {
                          const groupPerms = filteredPermissions.filter(p => p.group === group)
                          if (groupPerms.length === 0) return null
                          
                          return (
                            <div key={group} className="mb-3">
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {group}
                              </div>
                              {groupPerms.map(perm => (
                                <div
                                  key={perm.value}
                                  className="flex items-center space-x-2 px-2 py-2 hover:bg-accent rounded-sm cursor-pointer"
                                  onClick={() => {
                                    setSelectedPermissions(prev => 
                                      prev.includes(perm.value)
                                        ? prev.filter(p => p !== perm.value)
                                        : [...prev, perm.value]
                                    )
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedPermissions.includes(perm.value)}
                                    onCheckedChange={(checked) => {
                                      setSelectedPermissions(prev => 
                                        checked
                                          ? [...prev, perm.value]
                                          : prev.filter(p => p !== perm.value)
                                      )
                                    }}
                                  />
                                  <span className="text-sm">{perm.label}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                Seleziona quali operazioni potrà eseguire questa chiave
              </p>
            </div>

            <div>
              <Label htmlFor="weddings">Matrimoni *</Label>
              <MultiSelect
                options={weddingOptions}
                selected={selectedWeddings}
                onChange={setSelectedWeddings}
                placeholder="Seleziona i matrimoni..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Questa chiave avrà accesso solo ai matrimoni selezionati
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">ℹ️ Nota Importante</h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                La chiave API sarà mostrata una sola volta dopo la creazione. 
                Assicurati di copiarla e conservarla in un luogo sicuro.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateApiKey}>
              Crea Chiave API
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal - Shows token only once */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => !open && handleCloseSuccessModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center">Chiave API creata!</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ Copia questa chiave ora. Non sarà più visibile dopo aver chiuso.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">La tua chiave API</Label>
              <div className="relative">
                <code className="block w-full p-3 bg-muted rounded-lg font-mono text-sm break-all select-all">
                  {createdToken}
                </code>
              </div>
            </div>

            <Button
              onClick={copyCreatedToken}
              className="w-full"
              variant={tokenCopied ? "outline" : "default"}
            >
              {tokenCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copia chiave
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={handleCloseSuccessModal} variant="outline" className="w-full">
              Ho copiato la chiave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Modal */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-center">Rigenera Token</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Stai per generare un nuovo token per "<span className="font-medium text-foreground">{regeneratingKey?.key_name}</span>". 
              Il token attuale smetterà di funzionare immediatamente. Tutte le integrazioni che lo usano dovranno essere aggiornate.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRegenerateConfirm(false)
                setRegeneratingKey(null)
              }}
              disabled={isRegenerating}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleRegenerateToken}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rigenerazione...
                </>
              ) : (
                'Rigenera Token'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Modal */}
      <Dialog open={showEditPermissions} onOpenChange={(open) => {
        if (!open) {
          setShowEditPermissions(false)
          setEditingKey(null)
          setEditPermissions([])
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifica Permessi - {editingKey?.key_name}</DialogTitle>
            <DialogDescription>
              Seleziona i permessi per questa chiave API
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Permessi *</Label>
              <Popover open={editPermissionsOpen} onOpenChange={setEditPermissionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editPermissionsOpen}
                    className="w-full justify-start h-auto min-h-10 font-normal"
                  >
                    {editPermissions.length === 0 ? (
                      <span className="text-muted-foreground">Seleziona i permessi...</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {editPermissions.map(perm => {
                          const permObj = API_PERMISSIONS.find(p => p.value === perm)
                          return (
                            <Badge
                              key={perm}
                              variant="secondary"
                              className="mr-1 mb-1"
                            >
                              {permObj?.label}
                              <button
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    setEditPermissions(prev => prev.filter(p => p !== perm))
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setEditPermissions(prev => prev.filter(p => p !== perm))
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      placeholder="Cerca permessi..."
                      value={editPermissionsSearch}
                      onChange={(e) => setEditPermissionsSearch(e.target.value)}
                      className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="p-2">
                      {(() => {
                        const groups = [...new Set(API_PERMISSIONS.map(p => p.group))]
                        const filteredPermissions = API_PERMISSIONS.filter(p => 
                          p.label.toLowerCase().includes(editPermissionsSearch.toLowerCase()) ||
                          p.group.toLowerCase().includes(editPermissionsSearch.toLowerCase())
                        )
                        
                        return groups.map(group => {
                          const groupPerms = filteredPermissions.filter(p => p.group === group)
                          if (groupPerms.length === 0) return null
                          
                          return (
                            <div key={group} className="mb-3">
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {group}
                              </div>
                              {groupPerms.map(perm => (
                                <div
                                  key={perm.value}
                                  className="flex items-center space-x-2 px-2 py-2 hover:bg-accent rounded-sm cursor-pointer"
                                  onClick={() => {
                                    setEditPermissions(prev => 
                                      prev.includes(perm.value)
                                        ? prev.filter(p => p !== perm.value)
                                        : [...prev, perm.value]
                                    )
                                  }}
                                >
                                  <Checkbox
                                    checked={editPermissions.includes(perm.value)}
                                    onCheckedChange={(checked) => {
                                      setEditPermissions(prev => 
                                        checked
                                          ? [...prev, perm.value]
                                          : prev.filter(p => p !== perm.value)
                                      )
                                    }}
                                  />
                                  <span className="text-sm">{perm.label}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              {editPermissions.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  Seleziona almeno un permesso
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditPermissions(false)
                setEditingKey(null)
                setEditPermissions([])
              }}
              disabled={isSavingPermissions}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={isSavingPermissions || editPermissions.length === 0}
            >
              {isSavingPermissions ? 'Salvataggio...' : 'Salva Permessi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
