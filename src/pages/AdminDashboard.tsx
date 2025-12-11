import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Users, UserCog, Calendar } from "lucide-react";

const AdminDashboard = () => {
  // Fetch summary statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [weddingsResult, usersResult] = await Promise.all([
        supabase.from("weddings").select("id", { count: "exact" }),
        supabase.from("user_roles").select("role"),
      ]);

      const totalWeddings = weddingsResult.count || 0;
      const adminCount = usersResult.data?.filter(r => r.role === "admin").length || 0;
      const sposiCount = usersResult.data?.filter(r => r.role === "sposi").length || 0;

      return {
        totalWeddings,
        adminCount,
        sposiCount,
        totalUsers: adminCount + sposiCount,
      };
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="text-gray-600 hover:text-gray-900 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
              Dashboard Admin
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
              Panoramica generale del sistema
            </p>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Matrimoni</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-pink-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.totalWeddings}
                </div>
                <p className="text-xs text-gray-500 mt-1">Totale matrimoni gestiti</p>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Utenti Totali</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.totalUsers}
                </div>
                <p className="text-xs text-gray-500 mt-1">Utenti registrati</p>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Admin</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.adminCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">Amministratori</p>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Sposi</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.sposiCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">Coppie di sposi</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
