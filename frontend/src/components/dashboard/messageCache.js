const prefix = "support_message_cache_v1";

export const readMessageCache = (key) => {
  try {
    const value = window.sessionStorage.getItem(`${prefix}:${key}`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn("Could not read cached support messages:", error);
    return null;
  }
};

export const writeMessageCache = (key, value) => {
  try {
    window.sessionStorage.setItem(`${prefix}:${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not save cached support messages:", error);
  }
};
