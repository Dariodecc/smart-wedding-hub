import { useMemo } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Users, UserCog, Calendar, MessageCircle, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

const AdminDashboard = () => {
  const { t } = useTranslation('adminDashboard');
  const { t: tc } = useTranslation('common');

  // Fetch summary statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [weddingsResult, usersResult, whatsappResult] = await Promise.all([
        supabase.from("weddings").select("id, created_at"),
        supabase.from("user_roles").select("role"),
        supabase.from("invitati").select("whatsapp_message_price").not("whatsapp_message_price", "is", null),
      ]);

      const weddings = weddingsResult.data || [];
      const totalWeddings = weddings.length;
      const adminCount = usersResult.data?.filter(r => r.role === "admin").length || 0;
      const sposiCount = usersResult.data?.filter(r => r.role === "sposi").length || 0;
      
      // Calculate total WhatsApp cost
      const totalWhatsappCost = whatsappResult.data?.reduce((sum, inv) => {
        return sum + (Number(inv.whatsapp_message_price) || 0);
      }, 0) || 0;

      // Calculate weddings per month (last 12 months)
      const monthlyTrend = calculateMonthlyTrend(weddings);

      return {
        totalWeddings,
        adminCount,
        sposiCount,
        totalUsers: adminCount + sposiCount,
        totalWhatsappCost,
        monthlyTrend,
      };
    },
  });

  // Helper function to calculate monthly trend
  const calculateMonthlyTrend = (weddings: { id: string; created_at: string | null }[]) => {
    const months: { [key: string]: number } = {};
    const now = new Date();
    
    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }

    // Count weddings per month
    weddings.forEach(wedding => {
      if (wedding.created_at) {
        const date = new Date(wedding.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (months.hasOwnProperty(key)) {
          months[key]++;
        }
      }
    });

    // Convert to array for chart
    return Object.entries(months).map(([key, count]) => {
      const [, month] = key.split('-');
      const monthIndex = parseInt(month) - 1;
      return {
        month: key,
        monthIndex,
        count,
      };
    });
  };

  // Recalculate trend labels when language changes
  const chartData = useMemo(() => {
    if (!stats?.monthlyTrend) return [];
    return stats.monthlyTrend.map(item => ({
      ...item,
      monthLabel: t(`months.${monthKeys[item.monthIndex]}`),
    }));
  }, [stats?.monthlyTrend, t]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
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
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            
            {/* Card 1 - Matrimoni */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">{t('stats.weddings.title')}</CardTitle>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.totalWeddings}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{t('stats.weddings.description')}</p>
              </CardContent>
            </Card>

            {/* Card 2 - Utenti Totali */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">{t('stats.totalUsers.title')}</CardTitle>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.totalUsers}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{t('stats.totalUsers.description')}</p>
              </CardContent>
            </Card>

            {/* Card 3 - Admin */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">{t('stats.admins.title')}</CardTitle>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.adminCount}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{t('stats.admins.description')}</p>
              </CardContent>
            </Card>

            {/* Card 4 - Sposi */}
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">{t('stats.couples.title')}</CardTitle>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.sposiCount}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{t('stats.couples.description')}</p>
              </CardContent>
            </Card>

            {/* Card 5 - Costo WhatsApp */}
            <Card className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">{t('stats.whatsappCost.title')}</CardTitle>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : `€${(stats?.totalWhatsappCost || 0).toFixed(2)}`}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{t('stats.whatsappCost.description')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                    {t('charts.weddingsTrend.title')}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    {t('charts.weddingsTrend.subtitle')}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-pink-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
              {isLoading ? (
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                  <p className="text-gray-500">{tc('loading')}</p>
                </div>
              ) : chartData.length === 0 || chartData.every(d => d.count === 0) ? (
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">{t('charts.weddingsTrend.noData')}</p>
                  </div>
                </div>
              ) : (
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="monthLabel" 
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        interval={0}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number) => [value, t('charts.weddingsTrend.tooltipLabel')]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#ec4899" 
                        strokeWidth={2}
                        dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#ec4899' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
