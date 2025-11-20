import { LayoutDashboard, Users, UsersRound, Group, Table2, Settings, Heart, LogOut, AlertTriangle } from "lucide-react";
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
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {isImpersonating && !isCollapsed && (
          <div className="px-4 py-3">
            <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
                <div className="font-medium mb-2">Stai visualizzando come:</div>
                <div className="font-semibold">{wedding?.couple_name || "Caricamento..."}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopImpersonation}
                  className="mt-2 w-full border-orange-500 text-orange-700 hover:bg-orange-100 dark:border-orange-400 dark:text-orange-300 dark:hover:bg-orange-950"
                >
                  ← Esci
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {showAdminMenu && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
              {!isCollapsed && "MATRIMONIO SMART"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent rounded-lg"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
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
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            {!isCollapsed && "Gestione invitati"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gestioneInvitatiItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent rounded-lg"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {isImpersonating ? "Admin (Impersonificazione)" : isAdmin ? "Admin" : "Sposi"}
            </p>
          </div>
        )}
        {isImpersonating && (
          <Button
            variant="outline"
            onClick={stopImpersonation}
            className="w-full justify-start mb-2 hover:bg-sidebar-accent"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Esci da impersonificazione</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Esci</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
