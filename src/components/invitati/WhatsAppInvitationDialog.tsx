import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, Loader2, Send, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  webhookUrl: string | null;
}

export function WhatsAppInvitationDialog({
  open,
  onOpenChange,
  weddingId,
  webhookUrl
}: WhatsAppInvitationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Fetch guests who can receive WhatsApp invitation
  // Only show guests that have rsvp_uuid AND don't have delivered/sent status
  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['invitati-whatsapp-pending', weddingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitati')
        .select(`
          id,
          nome,
          cognome,
          is_capo_famiglia,
          cellulare,
          whatsapp_rsvp_inviato,
          whatsapp_message_status,
          rsvp_uuid,
          famiglie:famiglia_id(nome)
        `)
        .eq('wedding_id', weddingId)
        .not('rsvp_uuid', 'is', null)
        .or('whatsapp_message_status.is.null,whatsapp_message_status.eq.failed,whatsapp_message_status.eq.read')
        .order('cognome');

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!weddingId
  });

  const selectAll = () => {
    setSelectedGuests(new Set(guests.map(g => g.id)));
  };

  const deselectAll = () => {
    setSelectedGuests(new Set());
  };

  const toggleGuest = (guestId: string) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  // Generate RSVP link
  const generateRsvpLink = (rsvpUuid: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/rsvp/${rsvpUuid}`;
  };

  // Send webhooks in batches of 30
  const sendWebhooks = async () => {
    if (!webhookUrl) {
      toast({
        title: "Webhook non configurato",
        description: "Configura il webhook nelle impostazioni del matrimonio.",
        variant: "destructive"
      });
      return;
    }

    if (selectedGuests.size === 0) {
      toast({
        title: "Nessun invitato selezionato",
        description: "Seleziona almeno un invitato",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    setSentCount(0);
    setFailedCount(0);
    setSendingProgress(0);

    const selectedGuestsList = guests.filter(g => selectedGuests.has(g.id));
    const total = selectedGuestsList.length;
    const batchSize = 30;
    let processed = 0;

    console.log(`📤 Sending ${total} invitations in batches of ${batchSize}`);

    try {
      // Process in batches
      for (let i = 0; i < selectedGuestsList.length; i += batchSize) {
        const batch = selectedGuestsList.slice(i, i + batchSize);
        
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(total / batchSize)}`);

        // Send all webhooks in this batch in parallel
        const batchPromises = batch.map(async (guest) => {
          try {
            const rsvpLink = generateRsvpLink(guest.rsvp_uuid!);

            // Send webhook
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                nome: guest.nome,
                cognome: guest.cognome,
                rsvp_link: rsvpLink,
                is_capo_famiglia: guest.is_capo_famiglia,
                cellulare: guest.cellulare,
                wedding_id: weddingId,
                guest_id: guest.id
              })
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            // Mark as sent in database
            const { error: updateError } = await supabase
              .from('invitati')
              .update({
                whatsapp_rsvp_inviato: true,
                whatsapp_rsvp_inviato_at: new Date().toISOString()
              })
              .eq('id', guest.id);

            if (updateError) throw updateError;

            console.log(`✅ Sent to ${guest.nome} ${guest.cognome}`);
            setSentCount(prev => prev + 1);
            
            return { success: true, guest };
          } catch (error) {
            console.error(`❌ Failed to send to ${guest.nome} ${guest.cognome}:`, error);
            setFailedCount(prev => prev + 1);
            return { success: false, guest, error };
          }
        });

        // Wait for this batch to complete
        await Promise.all(batchPromises);
        
        processed += batch.length;
        setSendingProgress((processed / total) * 100);

        // Wait 1 second between batches to avoid overwhelming the webhook
        if (i + batchSize < selectedGuestsList.length) {
          console.log('⏸️ Waiting 1 second before next batch...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Refresh data
      await queryClient.invalidateQueries({ 
        queryKey: ['invitati-whatsapp-pending', weddingId] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['invitati', weddingId] 
      });

      toast({
        title: "Inviti inviati",
        description: `${sentCount} riusciti, ${failedCount} falliti`
      });
      
      if (failedCount === 0) {
        onOpenChange(false);
        setSelectedGuests(new Set());
      }
    } catch (error) {
      console.error('Error sending webhooks:', error);
      toast({
        title: "Errore",
        description: "Errore nell'invio degli inviti",
        variant: "destructive"
      });
    } finally {
      setSending(false);
      setSendingProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Invia Inviti RSVP via WhatsApp</h3>
              <p className="text-sm text-muted-foreground font-normal">
                {guests.length} invitati in attesa di invito
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {!webhookUrl ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Webhook non configurato</h3>
            <p className="text-sm text-muted-foreground">
              Configura l'URL del webhook nelle impostazioni del matrimonio per inviare gli inviti.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : guests.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Tutti gli inviti sono stati inviati</h3>
            <p className="text-sm text-muted-foreground">
              Non ci sono invitati in attesa di ricevere l'invito RSVP
            </p>
          </div>
        ) : (
          <>
            {/* Selection Actions */}
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAll}
                  disabled={sending}
                >
                  Seleziona Tutti
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deselectAll}
                  disabled={sending}
                >
                  Deseleziona Tutti
                </Button>
              </div>
              <Badge variant="secondary">
                {selectedGuests.size} selezionati
              </Badge>
            </div>

            {/* Progress Bar (visible when sending) */}
            {sending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Invio in corso...</span>
                  <span className="font-medium">
                    {sentCount + failedCount} / {selectedGuests.size}
                  </span>
                </div>
                <Progress value={sendingProgress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>✅ Inviati: {sentCount}</span>
                  <span>❌ Falliti: {failedCount}</span>
                </div>
              </div>
            )}

            {/* Guest List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-accent/50",
                      selectedGuests.has(guest.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    )}
                    onClick={() => !sending && toggleGuest(guest.id)}
                  >
                    <Checkbox
                      checked={selectedGuests.has(guest.id)}
                      onCheckedChange={() => !sending && toggleGuest(guest.id)}
                      disabled={sending}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                      {guest.nome[0]}{guest.cognome[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {guest.nome} {guest.cognome}
                        </p>
                        {guest.is_capo_famiglia && (
                          <Crown className="h-3 w-3 text-yellow-600 shrink-0" />
                        )}
                      </div>
                      {guest.famiglie && (
                        <p className="text-xs text-muted-foreground">
                          Famiglia {guest.famiglie.nome}
                        </p>
                      )}
                      {guest.cellulare && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {guest.cellulare}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Annulla
          </Button>
          {webhookUrl && guests.length > 0 && (
            <Button 
              onClick={sendWebhooks} 
              disabled={sending || selectedGuests.size === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Invia a {selectedGuests.size} {selectedGuests.size === 1 ? 'Invitato' : 'Invitati'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
