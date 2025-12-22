import { LayoutDashboard, Users, UsersRound, Group, Table2, Settings, Heart, LogOut, AlertTriangle, Book, User } from "lucide-react";
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

  // Get user initials for avatar
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
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
            <Heart className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">Wedding</span>
              <span className="text-xs font-medium text-muted-foreground">Smart Hub</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Impersonation Banner */}
        {isImpersonating && !isCollapsed && (
          <div className="mx-2 mt-3">
            <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-3 border border-orange-200 dark:border-orange-800/50 shadow-sm">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-orange-900/70 dark:text-orange-100/70 mb-0.5">
                    {t("impersonation.title")}
                  </div>
                  <div className="text-sm font-semibold text-orange-900 dark:text-orange-100 truncate">
                    {wedding?.couple_name || t("common:loading")}
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
                {t("impersonation.exit")}
              </Button>
            </div>
          </div>
        )}

        {/* Collapsed Impersonation Icon */}
        {isImpersonating && isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30 cursor-pointer" onClick={stopImpersonation}>
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t("impersonation.title")}: {wedding?.couple_name}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Admin Menu */}
        {showAdminMenu && (
          <SidebarGroup className="mt-2">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-3 mb-1">
                {t("adminSection")}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1 px-1">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {!isCollapsed && <span className="font-medium">{t(item.titleKey)}</span>}
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
          <SidebarGroup className="mt-2">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-3 mb-1">
                {t("guestSection")}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1 px-1">
                {gestioneInvitatiItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {!isCollapsed && <span className="font-medium">{t(item.titleKey)}</span>}
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
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {/* User Info - Expanded */}
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-sidebar-accent/50">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? t("userInfo.admin") : t("userInfo.sposi")}
              </p>
            </div>
          </div>
        )}

        {/* User Avatar - Collapsed */}
        {isCollapsed && user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center mb-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{user.email}</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? t("userInfo.admin") : t("userInfo.sposi")}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Actions Row */}
        <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
          {/* Logout Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? "icon" : "default"}
                onClick={signOut}
                className={`${isCollapsed ? 'h-9 w-9' : 'flex-1 justify-start'} rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-all`}
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">{t("logout")}</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>{t("logout")}</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Language Switcher */}
          {!isCollapsed && <LanguageSwitcher />}
          
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-sidebar-accent transition-all cursor-pointer">
                  <LanguageSwitcher />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Language</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
