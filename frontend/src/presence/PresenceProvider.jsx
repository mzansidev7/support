import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../utils/asyncStorage/apiRequest";
import { supabaseClient } from "../supabaseClient/supabase.config";

const PresenceContext = createContext({
  ready: false,
  onlineUserIds: new Set(),
  lastSeenByUserId: {},
  refreshLastSeen: async () => {},
});

const readSession = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return {
      userId: user?.id || "",
      token: localStorage.getItem("token") || "",
    };
  } catch (error) {
    console.error("Could not read admin presence session:", error);
    return { userId: "", token: "" };
  }
};

export const PresenceProvider = ({ children }) => {
  const [session, setSession] = useState(readSession);
  const [ready, setReady] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [lastSeenByUserId, setLastSeenByUserId] = useState({});
  const requestedLastSeenAt = useRef(new Map());
  const sessionId = useMemo(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  useEffect(() => {
    const refreshSession = () => setSession(readSession());
    window.addEventListener("storage", refreshSession);
    window.addEventListener("support-auth-changed", refreshSession);
    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener("support-auth-changed", refreshSession);
    };
  }, []);

  const refreshLastSeen = useCallback(async (userIds, force = false) => {
    const ids = [...new Set(userIds.filter(Boolean))]
      .filter(
        (id) =>
          Date.now() -
            (requestedLastSeenAt.current.get(String(id)) || 0) >=
          (force ? 2_000 : 60_000),
      )
      .slice(0, 100)
      .map(String);
    if (!ids.length) return;
    ids.forEach((id) => requestedLastSeenAt.current.set(id, Date.now()));
    try {
      const rows = await apiRequest(
        `/presence/last-seen?userIds=${encodeURIComponent(ids.join(","))}`,
      );
      setLastSeenByUserId((current) => ({
        ...current,
        ...Object.fromEntries(
          (rows || []).map((row) => [String(row.user_id), row.last_seen_at]),
        ),
      }));
    } catch (error) {
      ids.forEach((id) => requestedLastSeenAt.current.delete(id));
      console.error("Could not load admin user last-seen data:", error);
    }
  }, []);

  useEffect(() => {
    if (!session.userId || !session.token || !supabaseClient) {
      setReady(false);
      setOnlineUserIds(new Set());
      return undefined;
    }
    let active = true;
    let visible = document.visibilityState === "visible";
    const readyFallbackTimer = window.setTimeout(() => {
      if (active) setReady(true);
    }, 5_000);
    const channel = supabaseClient.channel("global-presence", {
      config: { private: true, presence: { key: String(session.userId) } },
    });
    const syncPresence = () => {
      if (active) {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState()).map(String)));
        setReady(true);
      }
    };
    const heartbeat = async (path) => {
      try {
        await apiRequest(path, { method: "POST" });
      } catch (error) {
        console.error("Could not update admin presence:", error);
      }
    };
    const track = async () => {
      if (!active || !visible) return;
      const result = await channel.track({ sessionId });
      if (result !== "ok") {
        console.error("Could not track admin presence:", result);
      } else {
        syncPresence();
      }
      await heartbeat("/presence/heartbeat");
    };
    const untrack = async () => {
      const result = await channel.untrack();
      if (result !== "ok") console.error("Could not untrack admin presence:", result);
      await heartbeat("/presence/offline");
    };
    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          syncPresence();
          void track();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          if (error) console.error("Admin presence channel failed:", error);
        }
      });
    const onVisibilityChange = () => {
      const nextVisible = document.visibilityState === "visible";
      if (visible === nextVisible) return;
      visible = nextVisible;
      if (visible) void track();
      else void untrack();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(() => {
      if (visible) void heartbeat("/presence/heartbeat");
    }, 60_000);
    return () => {
      active = false;
      window.clearTimeout(readyFallbackTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
      void untrack();
      void supabaseClient.removeChannel(channel);
      setReady(false);
      setOnlineUserIds(new Set());
    };
  }, [session, sessionId]);

  const value = useMemo(
    () => ({ ready, onlineUserIds, lastSeenByUserId, refreshLastSeen }),
    [ready, onlineUserIds, lastSeenByUserId, refreshLastSeen],
  );
  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
