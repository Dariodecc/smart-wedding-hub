import { LayoutDashboard, Users, UsersRound, Group, Table2, Settings, Heart, LogOut, AlertTriangle, Book } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { titleKey: "dashboardAdmin", url: "/admin", icon: LayoutDashboard },
  { titleKey: "matrimoni", url: "/matrimoni", icon: Heart },
  { titleKey: "utenti", url: "/utenti", icon: UsersRound },
  { titleKey: "impostazioniAdmin", url: "/impostazioni-admin", icon: Settings },
  { titleKey: "documentazioneApi", url: "/api", icon: Book },
];

const gestioneInvitatiItems = [
  { titleKey: "dashboard", url: "/dashboard", icon: LayoutDashboard },
  { titleKey: "invitati", url: "/invitati", icon: Users },
  { titleKey: "famiglie", url: "/famiglie", icon: UsersRound },
  { titleKey: "gruppi", url: "/gruppi", icon: Group },
  { titleKey: "tavoli", url: "/tavoli", icon: Table2 },
  { titleKey: "impostazioni", url: "/impostazioni", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { isAdmin, isImpersonating, stopImpersonation, signOut, user } = useAuth();
  const { wedding } = useCurrentMatrimonio();
  const { t } = useTranslation("sidebar");

  const showAdminMenu = isAdmin && !isImpersonating;
  const showSposiMenu = !isAdmin || isImpersonating;

  const getUserInitials = () => {
    if (!user?.email) return "U";
    const parts = user.email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md">
            <Heart className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">Wedding</span>
              <span className="text-[10px] text-sidebar-foreground/60">Smart Hub</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Impersonation Banner - Only when expanded */}
        {isImpersonating && !isCollapsed && (
          <div className="mx-3 mt-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-800">
                    {t("impersonation.title")}
                  </p>
                  <p className="text-xs text-amber-700 truncate">
                    {wedding?.couple_name || t("common:loading")}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={stopImpersonation} className="w-full mt-2 h-7 text-xs border-amber-300 hover:bg-amber-100">
                <LogOut className="h-3 w-3 mr-1" />
                {t("impersonation.exit")}
              </Button>
            </div>
          </div>
        )}

        {/* Impersonation Icon - Only when collapsed */}
        {isImpersonating && isCollapsed && (
          <div className="flex justify-center py-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t("impersonation.title")}: {wedding?.couple_name}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Admin Menu */}
        {showAdminMenu && (
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs text-sidebar-foreground/50 uppercase tracking-wider">
                {t("adminSection")}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} className="flex items-center gap-3 rounded-lg transition-colors" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>{t(item.titleKey)}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          <p>{t(item.titleKey)}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Sposi Menu */}
        {showSposiMenu && (
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs text-sidebar-foreground/50 uppercase tracking-wider">
                {t("guestSection")}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {gestioneInvitatiItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} className="flex items-center gap-3 rounded-lg transition-colors" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>{t(item.titleKey)}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          <p>{t(item.titleKey)}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {/* User Info - Expanded */}
        {!isCollapsed && user && (
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2 mb-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px]">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-sidebar-foreground/60">
                {isAdmin ? t("userInfo.admin") : t("userInfo.sposi")}
              </p>
            </div>
          </div>
        )}

        {/* User Avatar - Collapsed */}
        {isCollapsed && user && (
          <div className="flex justify-center mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px]">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{user.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isAdmin ? t("userInfo.admin") : t("userInfo.sposi")}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Actions - Expanded */}
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4 mr-2" />
              {t("logout")}
            </Button>
            <LanguageSwitcher />
          </div>
        )}

        {/* Actions - Collapsed */}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t("logout")}
              </TooltipContent>
            </Tooltip>
            <LanguageSwitcher compact />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
