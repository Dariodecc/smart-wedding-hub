import { LayoutDashboard, Users, UsersRound, Group, Table2, Settings, Heart, LogOut, AlertTriangle, Book } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useCurrentMatrimonio } from "@/hooks/useCurrentMatrimonio";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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

        {showAdminMenu && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-4 py-2">
              {!isCollapsed && t("adminSection")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent rounded-lg transition-all h-10"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span className="font-medium">{t(item.titleKey)}</span>}
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
              {!isCollapsed && t("guestSection")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {gestioneInvitatiItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent rounded-lg transition-all h-10"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span className="font-medium">{t(item.titleKey)}</span>}
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
              {isAdmin ? t("userInfo.admin") : t("userInfo.sposi")}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={signOut}
            className="flex-1 justify-start hover:bg-sidebar-accent rounded-lg h-10 font-medium transition-all"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>{t("logout")}</span>}
          </Button>
          {!isCollapsed && <LanguageSwitcher />}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
