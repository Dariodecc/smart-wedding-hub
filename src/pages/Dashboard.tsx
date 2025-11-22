import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Home, Table2, Layers, CheckCircle, Loader2, Plus, BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
const Dashboard = () => {
  const {
    wedding,
    isLoading: weddingLoading
  } = useCurrentMatrimonio();
  const navigate = useNavigate();
  const {
    data: dashboardData,
    isLoading: dataLoading
  } = useQuery({
    queryKey: ['dashboard', wedding?.id],
    queryFn: async () => {
      if (!wedding?.id) return null;

      // Fetch invitati with relationships
      const {
        data: invitati,
        error: invitatiError
      } = await supabase.from('invitati').select('id, tipo_ospite, rsvp_status, famiglia_id, gruppo_id, tavolo_id, posto_numero').eq('wedding_id', wedding.id);
      if (invitatiError) throw invitatiError;

      // Fetch famiglie count
      const {
        count: famiglieCount,
        error: famiglieError
      } = await supabase.from('famiglie').select('id', {
        count: 'exact',
        head: true
      }).eq('wedding_id', wedding.id);
      if (famiglieError) throw famiglieError;

      // Fetch gruppi count
      const {
        count: gruppiCount,
        error: gruppiError
      } = await supabase.from('gruppi').select('id', {
        count: 'exact',
        head: true
      }).eq('wedding_id', wedding.id);
      if (gruppiError) throw gruppiError;

      // Fetch tavoli data
      const {
        data: tavoli,
        error: tavoliError
      } = await supabase.from('tavoli').select('id, nome, capienza').eq('wedding_id', wedding.id).order('nome');
      if (tavoliError) throw tavoliError;
      return {
        invitati: invitati || [],
        famiglieCount: famiglieCount || 0,
        gruppiCount: gruppiCount || 0,
        tavoli: tavoli || []
      };
    },
    enabled: !!wedding?.id
  });
  const stats = useMemo(() => {
    if (!dashboardData) return null;
    const {
      invitati,
      famiglieCount,
      gruppiCount,
      tavoli
    } = dashboardData;

    // Total counts
    const totaleOspiti = invitati.length;
    const totaleFamiglie = famiglieCount;
    const totaleGruppi = gruppiCount;
    const totaleTavoli = tavoli.length;

    // RSVP breakdown
    const rsvpData = {
      confermati: invitati.filter(i => i.rsvp_status === 'Ci sarò').length,
      inAttesa: invitati.filter(i => i.rsvp_status === 'In attesa').length,
      declinati: invitati.filter(i => i.rsvp_status === 'Non ci sarò').length
    };

    // Age distribution
    const etaData = {
      neonati: invitati.filter(i => i.tipo_ospite === 'Neonato').length,
      bambini: invitati.filter(i => i.tipo_ospite === 'Bambino').length,
      ragazzi: invitati.filter(i => i.tipo_ospite === 'Ragazzo').length,
      adulti: invitati.filter(i => i.tipo_ospite === 'Adulto').length
    };

    // Guest seating statistics
    const guestsSeated = invitati.filter(i => i.tavolo_id !== null).length;
    const guestsToSeat = totaleOspiti - guestsSeated;

    // Table statistics
    const totalCapacity = tavoli.reduce((sum, table) => sum + (table.capienza || 0), 0);
    const totalSeated = guestsSeated;
    const overallOccupancy = totalCapacity > 0 ? Math.round(totalSeated / totalCapacity * 100) : 0;

    // Calculate occupancy by table
    const tableOccupancy = tavoli.map(table => {
      const guestsAtTable = invitati.filter(g => g.tavolo_id === table.id).length;
      return {
        ...table,
        occupati: guestsAtTable,
        disponibili: table.capienza - guestsAtTable,
        percentuale: Math.round(guestsAtTable / table.capienza * 100)
      };
    });
    return {
      totaleOspiti,
      totaleFamiglie,
      totaleGruppi,
      totaleTavoli,
      rsvpData,
      etaData,
      tavoliData: tableOccupancy,
      totalCapacity,
      totalSeated,
      overallOccupancy,
      guestsSeated,
      guestsToSeat
    };
  }, [dashboardData]);
  const isLoading = weddingLoading || dataLoading;
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-gray-600 hover:text-gray-900 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              Panoramica completa del matrimonio
            </p>
          </div>
        </div>
      </div>
      
      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1 - Totale Ospiti */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Totale Ospiti
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {stats?.totaleOspiti || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                invitati al matrimonio
              </p>
            </div>
            
            {/* Card 2 - Famiglie Totali */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Famiglie Totali
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {stats?.totaleFamiglie || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                nuclei familiari
              </p>
            </div>
            
            {/* Card 3 - Tavoli Totali */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Tavoli Totali
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <Table2 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {stats?.totaleTavoli || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Capacità: {stats?.totalCapacity || 0} posti
              </p>
            </div>
            
            {/* Card 4 - Totale Gruppi */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Totale Gruppi
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {stats?.totaleGruppi || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                gruppi organizzati
              </p>
            </div>
          </div>

          {/* Additional Stats - Seating Metrics */}
          

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* RSVP Donut Chart */}
            <RSVPDonutChart data={stats?.rsvpData} />
            
            {/* Age Distribution Chart */}
            <AgeDistributionChart data={stats?.etaData} />
          </div>

          {/* Tables Progress Chart - Full Width */}
          <TablesProgressChart data={stats?.tavoliData} navigate={navigate} />
        </div>
      </div>
    </div>;
};

// RSVP Donut Chart Component
const RSVPDonutChart = ({
  data
}: {
  data: {
    confermati: number;
    inAttesa: number;
    declinati: number;
  } | undefined;
}) => {
  if (!data) return null;
  const chartData = [{
    name: 'Confermati',
    value: data.confermati,
    color: '#10B981'
  }, {
    name: 'In Attesa',
    value: data.inAttesa,
    color: '#F59E0B'
  }, {
    name: 'Declinati',
    value: data.declinati,
    color: '#EF4444'
  }];
  const total = data.confermati + data.inAttesa + data.declinati;
  return <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            Risposte RSVP
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Stato delle conferme degli invitati
          </p>
        </div>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-blue-600" />
        </div>
      </div>
      
      {total === 0 ?
    // Empty State
    <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            Nessuna risposta ancora
          </p>
        </div> : <>
          {/* Chart */}
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <p className="text-xs font-medium text-green-900">Confermati</p>
              </div>
              <p className="text-xl font-bold text-green-900">{data.confermati}</p>
              <p className="text-xs text-green-700">
                {total > 0 ? Math.round(data.confermati / total * 100) : 0}%
              </p>
            </div>
            
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <p className="text-xs font-medium text-yellow-900">In Attesa</p>
              </div>
              <p className="text-xl font-bold text-yellow-900">{data.inAttesa}</p>
              <p className="text-xs text-yellow-700">
                {total > 0 ? Math.round(data.inAttesa / total * 100) : 0}%
              </p>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <p className="text-xs font-medium text-red-900">Declinati</p>
              </div>
              <p className="text-xl font-bold text-red-900">{data.declinati}</p>
              <p className="text-xs text-red-700">
                {total > 0 ? Math.round(data.declinati / total * 100) : 0}%
              </p>
            </div>
          </div>
        </>}
    </div>;
};

// Age Distribution Chart Component
const AgeDistributionChart = ({
  data
}: {
  data: {
    neonati: number;
    bambini: number;
    ragazzi: number;
    adulti: number;
  } | undefined;
}) => {
  if (!data) return null;
  const chartData = [{
    name: 'Neonati',
    value: data.neonati,
    color: '#EC4899',
    icon: '👶'
  }, {
    name: 'Bambini',
    value: data.bambini,
    color: '#F59E0B',
    icon: '🧒'
  }, {
    name: 'Ragazzi',
    value: data.ragazzi,
    color: '#3B82F6',
    icon: '👦'
  }, {
    name: 'Adulti',
    value: data.adulti,
    color: '#8B5CF6',
    icon: '👨'
  }];
  const total = data.neonati + data.bambini + data.ragazzi + data.adulti;
  return <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            Distribuzione per Età
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Suddivisione degli ospiti per tipologia
          </p>
        </div>
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Users className="h-5 w-5 text-purple-600" />
        </div>
      </div>
      
      {total === 0 ?
    // Empty State
    <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            Nessun ospite ancora
          </p>
        </div> : <>
          {/* Chart */}
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{
            top: 20,
            right: 10,
            left: -10,
            bottom: 20
          }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{
              fontSize: 12,
              fill: '#6b7280'
            }} tickLine={false} />
                <YAxis tick={{
              fontSize: 12,
              fill: '#6b7280'
            }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }} cursor={{
              fill: 'rgba(0, 0, 0, 0.05)'
            }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {chartData.map(item => <div key={item.name} className="p-3 rounded-lg border-2 transition-colors hover:border-gray-300" style={{
          borderColor: `${item.color}30`,
          backgroundColor: `${item.color}10`
        }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-xl font-bold" style={{
              color: item.color
            }}>
                    {item.value}
                  </p>
                </div>
                <p className="text-xs font-medium text-gray-700">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {total > 0 ? Math.round(item.value / total * 100) : 0}%
                </p>
              </div>)}
          </div>
        </>}
    </div>;
};

// Tables Progress Chart Component
const TablesProgressChart = ({
  data,
  navigate
}: {
  data: any[] | undefined;
  navigate: (path: string) => void;
}) => {
  if (!data) return null;
  return <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            Occupazione Tavoli
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Stato di riempimento dei tavoli disponibili
          </p>
        </div>
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Table2 className="h-5 w-5 text-orange-600" />
        </div>
      </div>
      
      {data.length === 0 ?
    // Empty State
    <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Table2 className="h-8 w-8 text-gray-400" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            Nessun tavolo creato
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Inizia a organizzare i posti creando i tavoli
          </p>
          <Button onClick={() => navigate('/tavoli')} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Crea Primo Tavolo
          </Button>
        </div> : <div className="space-y-4">
          {data.map(tavolo => {
        const isFull = tavolo.occupati >= tavolo.capienza;
        const isAlmostFull = tavolo.percentuale >= 80 && !isFull;
        return <div key={tavolo.id} className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                {/* Table Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", isFull && "bg-red-100", isAlmostFull && "bg-yellow-100", !isFull && !isAlmostFull && "bg-green-100")}>
                      <Table2 className={cn("h-5 w-5", isFull && "text-red-600", isAlmostFull && "text-yellow-600", !isFull && !isAlmostFull && "text-green-600")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {tavolo.nome}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {tavolo.occupati} / {tavolo.capienza} posti occupati
                      </p>
                    </div>
                  </div>
                  
                  {/* Percentage Badge */}
                  <Badge className={cn("rounded-full px-3 py-1 text-xs font-bold", isFull && "bg-red-100 text-red-800", isAlmostFull && "bg-yellow-100 text-yellow-800", !isFull && !isAlmostFull && "bg-green-100 text-green-800")}>
                    {tavolo.percentuale}%
                  </Badge>
                </div>
                
                {/* Progress Bar */}
                <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-500", isFull && "bg-red-500", isAlmostFull && "bg-yellow-500", !isFull && !isAlmostFull && "bg-green-500")} style={{
              width: `${Math.min(tavolo.percentuale, 100)}%`
            }} />
                </div>
                
                {/* Status Text */}
                <div className="flex items-center justify-between mt-2">
                  <p className={cn("text-xs font-medium", isFull && "text-red-600", isAlmostFull && "text-yellow-600", !isFull && !isAlmostFull && "text-green-600")}>
                    {isFull ? 'Tavolo completo' : isAlmostFull ? 'Quasi completo' : `${tavolo.capienza - tavolo.occupati} posti disponibili`}
                  </p>
                  
                  {isFull && <CheckCircle className="h-4 w-4 text-red-600" />}
                </div>
              </div>;
      })}
          
          {/* Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.reduce((sum, t) => sum + t.occupati, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Posti Occupati</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.reduce((sum, t) => sum + t.capienza, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Posti Totali</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.reduce((sum, t) => sum + (t.capienza - t.occupati), 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Posti Disponibili</p>
              </div>
            </div>
          </div>
        </div>}
    </div>;
};
export default Dashboard;