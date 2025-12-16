import { LayoutDashboard, Users, UsersRound, Group, Table2, Settings, Heart, LogOut, AlertTriangle, Book } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  {
    title: "Dashboard Admin",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Matrimoni",
    url: "/matrimoni",
    icon: Heart,
  },
  {
    title: "Utenti",
    url: "/utenti",
    icon: UsersRound,
  },
  {
    title: "Impostazioni Admin",
    url: "/impostazioni-admin",
    icon: Settings,
  },
  {
    title: "Documentazione API",
    url: "/api",
    icon: Book,
  },
];

const gestioneInvitatiItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Invitati",
    url: "/invitati",
    icon: Users,
  },
  {
    title: "Famiglie",
    url: "/famiglie",
    icon: UsersRound,
  },
  {
    title: "Gruppi",
    url: "/gruppi",
    icon: Group,
  },
  {
    title: "Tavoli",
    url: "/tavoli",
    icon: Table2,
  },
  {
    title: "Impostazioni",
    url: "/impostazioni",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { isAdmin, isImpersonating, stopImpersonation, signOut, user } = useAuth();
  const { wedding } = useCurrentMatrimonio();

  const showAdminMenu = isAdmin && !isImpersonating;
  const showSposiMenu = !isAdmin || isImpersonating;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="w-full">
        {isImpersonating && !isCollapsed && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-3 border border-orange-200 dark:border-orange-800/50 shadow-sm">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-orange-900/70 dark:text-orange-100/70 mb-0.5">
                    Modalità impersonificazione
                  </div>
                  <div className="text-sm font-semibold text-orange-900 dark:text-orange-100 truncate">
                    {wedding?.couple_name || "Caricamento..."}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={stopImpersonation}
                className="w-full h-8 text-xs rounded-lg border-orange-300 bg-white/80 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-400 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-300 dark:hover:bg-orange-900/50 dark:hover:border-orange-600 transition-all"
              >
                <LogOut className="h-3 w-3 mr-1.5" />
                Esci da impersonificazione
              </Button>
            </div>
          </div>
        )}

        {showAdminMenu && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-4 py-2">
              {!isCollapsed && "MATRIMONIO SMART"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent rounded-lg transition-all h-10"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showSposiMenu && (
          <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-4 py-2">
            {!isCollapsed && "Gestione invitati"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {gestioneInvitatiItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent rounded-lg transition-all h-10"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4 mt-auto">
        {!isCollapsed && user && (
          <div className="mb-3 px-2 py-2 bg-sidebar-accent/50 rounded-lg">
            <p className="text-sm font-semibold truncate text-sidebar-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {isAdmin ? "Admin" : "Sposi"}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start hover:bg-sidebar-accent rounded-lg h-10 font-medium transition-all"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Esci</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
