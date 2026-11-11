import { apiRequest } from "./apiRequest";
import { supabaseClient } from "../../supabaseClient/supabase.config";

const originalFetch = global.fetch;

jest.mock("../../supabaseClient/supabase.config", () => ({
  supabaseClient: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe("apiRequest", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    window.history.replaceState({}, "", "/messages");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("clears the session and emits an expiration event on HTTP 401", async () => {
    localStorage.setItem("token", "expired-token");
    localStorage.setItem("user", JSON.stringify({ role: "admin" }));
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "INVALID_TOKEN" }),
    });
    const onExpired = jest.fn();
    window.addEventListener("support-auth-expired", onExpired);

    await expect(apiRequest("/admin/conversations")).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(supabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    expect(onExpired).toHaveBeenCalledTimes(1);
    window.removeEventListener("support-auth-expired", onExpired);
  });

  it("does not clear the session for non-auth request failures", async () => {
    localStorage.setItem("token", "valid-token");
    global.fetch = jest.fn().mockResolvedValue({
      status: 403,
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "FORBIDDEN" }),
    });

    await expect(apiRequest("/admin/conversations")).rejects.toThrow(
      "FORBIDDEN",
    );

    expect(localStorage.getItem("token")).toBe("valid-token");
    expect(supabaseClient.auth.signOut).not.toHaveBeenCalled();
  });
});
