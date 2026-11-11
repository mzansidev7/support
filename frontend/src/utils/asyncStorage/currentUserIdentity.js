const addId = (ids, value) => {
  if (typeof value === "string" && value.trim()) {
    ids.add(value.trim().toLowerCase());
  }
};

export const getCurrentUserIds = () => {
  const ids = new Set();
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    addId(ids, user?.id);
    addId(ids, user?.user_id);
    addId(ids, user?.user?.id);
    addId(ids, user?.admin_profile?.id);
    addId(ids, user?.admin_profile?.user_id);
  } catch {
    // The access token can still identify the user if the profile cache is invalid.
  }

  const token = localStorage.getItem("token");
  const payload = token?.split(".")[1];
  if (payload) {
    try {
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(
        atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
      );
      addId(ids, decoded.id);
      addId(ids, decoded.user_id);
      addId(ids, decoded.sub);
    } catch {
      // Ignore malformed token payloads; valid cached profile IDs remain usable.
    }
  }

  return ids;
};

export const isCurrentUserId = (value, ids = getCurrentUserIds()) =>
  typeof value === "string" && ids.has(value.trim().toLowerCase());
