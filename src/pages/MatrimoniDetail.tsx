import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Loader2,
  Calendar,
  MapPin,
  Download,
  Heart,
  PartyPopper
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { differenceInDays, format, isPast, isToday } from "date-fns";
import { it, enUS } from "date-fns/locale";

const MatrimoniDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('matrimoni');
  
  const dateLocale = i18n.language === 'it' ? it : enUS;

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

  // Calculate countdown
  const countdown = useMemo(() => {
    if (!wedding?.wedding_date) return null;
    
    const weddingDate = new Date(wedding.wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    weddingDate.setHours(0, 0, 0, 0);
    
    if (isToday(weddingDate)) {
      return { text: t('detail.weddingInfo.countdown.today'), type: 'today' };
    }
    
    if (isPast(weddingDate)) {
      return { text: t('detail.weddingInfo.countdown.passed'), type: 'passed' };
    }
    
    const days = differenceInDays(weddingDate, today);
    
    if (days === 1) {
      return { text: t('detail.weddingInfo.countdown.oneDay'), type: 'upcoming' };
    }
    
    return { text: t('detail.weddingInfo.countdown.daysLeft', { days }), type: 'upcoming' };
  }, [wedding?.wedding_date, t]);

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
      const locale = i18n.language === 'it' ? 'it-IT' : 'en-US';
      return new Intl.NumberFormat(locale, {
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
      costSubtitle = t('detail.stats.whatsappCost.totalCost');
    } else if (costEUR > 0) {
      costDisplay = formatCurrency(costEUR, "EUR");
      costSubtitle = t('detail.stats.whatsappCost.totalCost');
    } else {
      costDisplay = "€ 0,00";
      costSubtitle = t('detail.stats.whatsappCost.noMessages');
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
  }, [guests, t, i18n.language]);

  // Export handler
  const handleExportGuests = () => {
    // TODO: Implement export functionality
    console.log("Export guests for wedding:", id);
  };

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
          <p className="text-muted-foreground">{t('detail.notFound')}</p>
          <Button className="mt-4" onClick={() => navigate("/matrimoni")}>
            {t('detail.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
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
                {t('detail.subtitle')}
              </p>
            </div>
          </div>
          
          {/* Export Button */}
          <Button onClick={handleExportGuests} className="bg-pink-600 hover:bg-pink-700 shrink-0">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('detail.exportGuests')}</span>
            <span className="sm:hidden">{t('detail.exportGuestsShort')}</span>
          </Button>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          
          {/* Wedding Info Cards - Date & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            
            {/* Date & Countdown Card */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-pink-100">
                      {t('detail.weddingInfo.date')}
                    </p>
                    <p className="text-lg font-bold text-white">
                      {wedding.wedding_date 
                        ? format(new Date(wedding.wedding_date), "d MMMM yyyy", { locale: dateLocale })
                        : t('detail.weddingInfo.notSpecified')
                      }
                    </p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {countdown?.type === 'today' && (
                      <PartyPopper className="h-5 w-5 text-pink-500" />
                    )}
                    {countdown?.type === 'upcoming' && (
                      <Clock className="h-5 w-5 text-orange-500" />
                    )}
                    {countdown?.type === 'passed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {countdown?.text}
                    </span>
                  </div>
                  <Badge variant={countdown?.type === 'today' ? 'default' : countdown?.type === 'passed' ? 'secondary' : 'outline'} className="text-xs">
                    {countdown?.type === 'today' && '🎉'}
                    {countdown?.type === 'upcoming' && '💒'}
                    {countdown?.type === 'passed' && '✓'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Locations Card */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {t('detail.weddingInfo.locations')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Ceremony Location */}
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="h-4 w-4 text-pink-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500">
                      {t('detail.weddingInfo.ceremony')}
                    </p>
                    <p className="text-sm text-gray-900 truncate">
                      {wedding.ceremony_location || t('detail.weddingInfo.notSpecified')}
                    </p>
                  </div>
                </div>

                {/* Reception Location */}
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <PartyPopper className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500">
                      {t('detail.weddingInfo.reception')}
                    </p>
                    <p className="text-sm text-gray-900 truncate">
                      {wedding.reception_location 
                        ? wedding.reception_location 
                        : wedding.ceremony_location 
                          ? t('detail.weddingInfo.sameLocation')
                          : t('detail.weddingInfo.notSpecified')
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1 - Total Guests */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.totalGuests.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats?.totalGuests || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('detail.stats.totalGuests.description')}
                </p>
              </CardContent>
            </Card>

            {/* Card 2 - Confirmed */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.confirmed.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats?.confirmed || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.confirmedPercentage || 0}% {t('detail.stats.confirmed.description')}
                </p>
              </CardContent>
            </Card>

            {/* Card 3 - Pending */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.pending.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats?.pending || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.pendingPercentage || 0}% {t('detail.stats.pending.description')}
                </p>
              </CardContent>
            </Card>

            {/* Card 4 - Declined */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.declined.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats?.declined || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.declinedPercentage || 0}% {t('detail.stats.declined.description')}
                </p>
              </CardContent>
            </Card>

            {/* Card 5 - WhatsApp Sent */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.whatsappSent.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats?.delivered || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.deliveredPercentage || 0}% {t('detail.stats.whatsappSent.description')}
                </p>
              </CardContent>
            </Card>

            {/* Card 6 - WhatsApp Pending */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.whatsappPending.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Send className="h-5 w-5 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">{stats?.notSent || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.notSentPercentage || 0}% {t('detail.stats.whatsappPending.description')}
                </p>
              </CardContent>
            </Card>

            {/* Card 7 - WhatsApp Failed */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.whatsappFailed.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats?.failed || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.failedPercentage || 0}% {t('detail.stats.whatsappFailed.description')}
                </p>
              </CardContent>
            </Card>

            {/* Card 8 - WhatsApp Cost */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t('detail.stats.whatsappCost.title')}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats?.costDisplay || "€ 0,00"}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.costSubtitle}
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
