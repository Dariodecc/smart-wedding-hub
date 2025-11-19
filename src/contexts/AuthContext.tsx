import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "admin" | "sposi";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  isAdmin: boolean;
  isSposi: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase.rpc("get_user_roles", {
      _user_id: userId,
    });

    if (error) {
      console.error("Error fetching user roles:", error);
      return [];
    }

    return (data || []).map((item: any) => item.role as UserRole);
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchUserRoles(session.user.id).then(setRoles);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoles(session.user.id).then((userRoles) => {
          setRoles(userRoles);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      navigate("/dashboard");
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    navigate("/login");
  };

  const isAdmin = roles.includes("admin");
  const isSposi = roles.includes("sposi");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        isAdmin,
        isSposi,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
