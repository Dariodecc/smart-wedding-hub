import { LayoutDashboard, Users, UsersRound, Group, Table2, Settings, Heart, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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

const menuItems = [
  {
    title: "Dashboard Admin",
    url: "/admin",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    title: "Matrimoni",
    url: "/matrimoni",
    icon: Heart,
    adminOnly: true,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    title: "Invitati",
    url: "/invitati",
    icon: Users,
    adminOnly: false,
  },
  {
    title: "Famiglie",
    url: "/famiglie",
    icon: UsersRound,
    adminOnly: false,
  },
  {
    title: "Gruppi",
    url: "/gruppi",
    icon: Group,
    adminOnly: false,
  },
  {
    title: "Tavoli",
    url: "/tavoli",
    icon: Table2,
    adminOnly: false,
  },
  {
    title: "Impostazioni",
    url: "/impostazioni",
    icon: Settings,
    adminOnly: false,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { isAdmin, signOut, user } = useAuth();

  const visibleItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            {!isCollapsed && "Matrimonio SMART"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
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
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Admin" : "Sposi"}
            </p>
          </div>
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
