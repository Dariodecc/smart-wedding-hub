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
import { Plus, Key, Copy, Trash2, Eye, EyeOff, Check } from 'lucide-react'
import { MultiSelect } from '@/components/ui/multi-select'

interface ApiKey {
  id: string
  key_name: string
  api_key: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
  weddings: { id: string; couple_name: string }[]
}

export default function ImpostazioniAdmin() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [showDialog, setShowDialog] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [selectedWeddings, setSelectedWeddings] = useState<string[]>([])
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

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
        .select('*')
        .order('created_at', { ascending: false })

      if (keysError) throw keysError

      // Fetch associated weddings for each key
      const keysWithWeddings = await Promise.all(
        (keys || []).map(async (key) => {
          const { data: keyWeddings, error: weddingsError } = await supabase
            .from('api_key_weddings')
            .select(`
              wedding_id,
              weddings:wedding_id (
                id,
                couple_name
              )
            `)
            .eq('api_key_id', key.id)

          if (weddingsError) throw weddingsError

          return {
            ...key,
            weddings: (keyWeddings || []).map((kw: any) => kw.weddings).filter(Boolean)
          }
        })
      )

      return keysWithWeddings
    }
  })

  // Generate random API key
  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const length = 32
    let key = 'sk_'
    for (let i = 0; i < length; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return key
  }

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

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const apiKey = generateApiKey()

      // Insert API key
      const { data: newKey, error: keyError } = await supabase
        .from('api_keys')
        .insert({
          key_name: keyName,
          api_key: apiKey,
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

      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      
      toast({ title: "Successo", description: "Chiave API creata con successo" })
      setShowDialog(false)
      setKeyName('')
      setSelectedWeddings([])
      
      // Show the new key
      setVisibleKeys(new Set([newKey.id]))
    } catch (error) {
      console.error('Error creating API key:', error)
      toast({ title: "Errore", description: "Errore nella creazione della chiave API", variant: "destructive" })
    }
  }

  // Delete API key
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

  // Wedding options for multi-select
  const weddingOptions = weddings.map(w => ({
    value: w.id,
    label: w.couple_name
  }))

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Impostazioni Admin</h1>
        <p className="text-muted-foreground">Gestisci le chiavi API per l'accesso agli endpoint</p>
      </div>

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
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Chiave
            </Button>
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
                    <TableHead>Matrimoni</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Ultimo Utilizzo</TableHead>
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
                            {visibleKeys.has(key.id) 
                              ? key.api_key 
                              : `${key.api_key.substring(0, 12)}...${key.api_key.substring(key.api_key.length - 4)}`
                            }
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {visibleKeys.has(key.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.api_key, key.id)}
                          >
                            {copiedKey === key.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {key.last_used_at 
                          ? new Date(key.last_used_at).toLocaleDateString('it-IT')
                          : 'Mai'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
              <Label htmlFor="weddings">Matrimoni</Label>
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
    </div>
  )
}
