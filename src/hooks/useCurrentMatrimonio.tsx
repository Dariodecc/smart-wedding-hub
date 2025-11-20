import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Wedding {
  id: string;
  couple_name: string;
  wedding_date: string;
  ceremony_location: string;
  reception_location: string | null;
  service_cost: number;
  enable_multi_rsvp: boolean;
  webhook_url: string | null;
}

export const useCurrentMatrimonio = () => {
  const { user, isAdmin, isImpersonating, impersonatedWeddingId } = useAuth();

  const { data: wedding, isLoading } = useQuery({
    queryKey: ["current-matrimonio", isImpersonating ? impersonatedWeddingId : user?.id],
    queryFn: async () => {
      if (!user) return null;

      // If impersonating, return the target wedding
      if (isImpersonating && impersonatedWeddingId) {
        const { data, error } = await supabase
          .from("weddings")
          .select("*")
          .eq("id", impersonatedWeddingId)
          .single();

        if (error) throw error;
        return data as Wedding;
      }

      // If admin (not impersonating), return null
      if (isAdmin && !isImpersonating) {
        return null;
      }

      // If sposi, return their associated wedding
      const { data: weddingSpouses, error: wsError } = await supabase
        .from("wedding_spouses")
        .select("wedding_id")
        .eq("user_id", user.id)
        .single();

      if (wsError) throw wsError;

      const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", weddingSpouses.wedding_id)
        .single();

      if (weddingError) throw weddingError;
      return wedding as Wedding;
    },
    enabled: !!user,
  });

  return { wedding, isLoading };
};
