import { API_URL } from "../../Urls";
import { expireSupportSession } from "./authSession";

export const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Your support session has expired. Please sign in again.");
  }
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    expireSupportSession();
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new Error(result.message || result.error || "The request failed.");
  }
  return result;
};
