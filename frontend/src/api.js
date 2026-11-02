let csrfToken = "";
export async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({
    error: {
      message:
        "Server response unavailable. Check that the backend is running.",
    },
  }));
  if (!response.ok) {
    const error = new Error(data.error?.message || "Request failed.");
    error.status = response.status;
    error.fields = data.error?.fields;
    if (response.status === 401 && !path.startsWith("/auth"))
      window.dispatchEvent(new Event("session-expired"));
    throw error;
  }
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
export const displayDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(date + "T00:00:00Z"))
    : "Not recorded";
