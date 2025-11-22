import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  MessageCircle, 
  Send, 
  AlertTriangle, 
  DollarSign,
  ArrowLeft,
  Loader2
} from "lucide-react";

const MatrimoniDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch wedding data
  const { data: wedding, isLoading: weddingLoading } = useQuery({
    queryKey: ["wedding", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch guests data
  const { data: guests, isLoading: guestsLoading } = useQuery({
    queryKey: ["wedding-guests", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("invitati")
        .select("id, rsvp_status, whatsapp_message_status, whatsapp_message_price, whatsapp_message_currency")
        .eq("wedding_id", id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!guests) return null;

    const totalGuests = guests.length;
    
    // RSVP Statistics
    const confirmed = guests.filter(g => g.rsvp_status === "Ci sarò").length;
    const pending = guests.filter(g => g.rsvp_status === "In attesa").length;
    const declined = guests.filter(g => g.rsvp_status === "Non ci sarò").length;
    
    const confirmedPercentage = totalGuests > 0 ? Math.round((confirmed / totalGuests) * 100) : 0;
    const pendingPercentage = totalGuests > 0 ? Math.round((pending / totalGuests) * 100) : 0;
    const declinedPercentage = totalGuests > 0 ? Math.round((declined / totalGuests) * 100) : 0;

    // WhatsApp Statistics
    const delivered = guests.filter(g => g.whatsapp_message_status === "delivered").length;
    const notSent = guests.filter(g => g.whatsapp_message_status === null).length;
    const failed = guests.filter(g => g.whatsapp_message_status === "failed").length;
    
    const deliveredPercentage = totalGuests > 0 ? Math.round((delivered / totalGuests) * 100) : 0;
    const notSentPercentage = totalGuests > 0 ? Math.round((notSent / totalGuests) * 100) : 0;
    const failedPercentage = totalGuests > 0 ? Math.round((failed / totalGuests) * 100) : 0;

    // WhatsApp Cost Calculation
    const messagesWithPrice = guests.filter(g => g.whatsapp_message_price !== null);
    
    const costUSD = messagesWithPrice
      .filter(m => m.whatsapp_message_currency === "USD")
      .reduce((sum, m) => sum + Math.abs(m.whatsapp_message_price || 0), 0);
    
    const costEUR = messagesWithPrice
      .filter(m => m.whatsapp_message_currency === "EUR")
      .reduce((sum, m) => sum + Math.abs(m.whatsapp_message_price || 0), 0);
    
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    let costDisplay = "";
    let costSubtitle = "";

    if (costUSD > 0 && costEUR > 0) {
      costDisplay = formatCurrency(costUSD, "USD");
      costSubtitle = `+ ${formatCurrency(costEUR, "EUR")}`;
    } else if (costUSD > 0) {
      costDisplay = formatCurrency(costUSD, "USD");
      costSubtitle = "Costo totale messaggi";
    } else if (costEUR > 0) {
      costDisplay = formatCurrency(costEUR, "EUR");
      costSubtitle = "Costo totale messaggi";
    } else {
      costDisplay = "€ 0,00";
      costSubtitle = "Nessun messaggio inviato";
    }

    return {
      totalGuests,
      confirmed,
      confirmedPercentage,
      pending,
      pendingPercentage,
      declined,
      declinedPercentage,
      delivered,
      deliveredPercentage,
      notSent,
      notSentPercentage,
      failed,
      failedPercentage,
      costDisplay,
      costSubtitle,
    };
  }, [guests]);

  const isLoading = weddingLoading || guestsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Matrimonio non trovato</p>
          <Button className="mt-4" onClick={() => navigate("/matrimoni")}>
            Torna ai Matrimoni
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/matrimoni")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
              {wedding.couple_name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              Dashboard amministrativa
            </p>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1 - Ospiti Totali */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ospiti Totali</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalGuests || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Invitati al matrimonio
                </p>
              </CardContent>
            </Card>

            {/* Card 2 - Confermati */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confermati</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats?.confirmed || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.confirmedPercentage || 0}% degli invitati
                </p>
              </CardContent>
            </Card>

            {/* Card 3 - In Attesa */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats?.pending || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingPercentage || 0}% degli invitati
                </p>
              </CardContent>
            </Card>

            {/* Card 4 - Declinati */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Declinati</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats?.declined || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.declinedPercentage || 0}% degli invitati
                </p>
              </CardContent>
            </Card>

            {/* Card 5 - WhatsApp Inviati */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WhatsApp Inviati</CardTitle>
                <MessageCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.deliveredPercentage || 0}% degli invitati
                </p>
              </CardContent>
            </Card>

            {/* Card 6 - WhatsApp Mancanti */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WhatsApp Mancanti</CardTitle>
                <Send className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats?.notSent || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.notSentPercentage || 0}% degli invitati
                </p>
              </CardContent>
            </Card>

            {/* Card 7 - WhatsApp Errore */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WhatsApp Errore</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.failedPercentage || 0}% degli invitati
                </p>
              </CardContent>
            </Card>

            {/* Card 8 - Costo WhatsApp */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Costo WhatsApp</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats?.costDisplay || "€ 0,00"}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.costSubtitle || "Nessun messaggio inviato"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrimoniDetail;
