import { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "../supabaseClient/supabase.config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password, setMessage, setSuccess, setLoading) => {
    try {
      const { data, error } = await supabaseClient
        .from("support_user")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        
        .single();

      if (error || !data) {
        setSuccess(false);
        setMessage(error);
        setLoading(false);
         setTimeout(() => {
setMessage("")     
}, 10000);
        return;
      }

      if (!data.is_active) {
        setSuccess(false);
        setMessage("Account is disabled");
        setLoading(false);
        return;
      }

      // store session
      localStorage.setItem("user", JSON.stringify(data));

      setSuccess(true);
      setMessage("Login successful!");

      // navigate after short delay (optional UX)
      setTimeout(() => {
        navigate("/dashboard");
      }, 800);

    } catch (err) {
      setSuccess(false);
      setMessage("Something went wrong. Try again.");
    }
  };

  const signUp = async (email, password) => {
    return await supabaseClient.auth.signUp({
      email,
      password,
    });
  };

  const signOut = async () => {
    await supabaseClient.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => useContext(AuthContext);