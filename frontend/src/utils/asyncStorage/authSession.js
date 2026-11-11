import { supabaseClient } from "../../supabaseClient/supabase.config";

export const clearSupportSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("support-auth-changed"));
  void Promise.resolve()
    .then(() => supabaseClient.auth.signOut())
    .catch((error) => {
      console.error("Could not clear support Supabase session:", error);
    });
};

export const expireSupportSession = () => {
  if (!localStorage.getItem("token") && !localStorage.getItem("user")) return;
  clearSupportSession();
  window.dispatchEvent(new Event("support-auth-expired"));
};
