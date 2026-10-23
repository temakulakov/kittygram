const TOKEN_KEY = "auth_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, data) {
    super(errorText(data) || `Ошибка ${status}`);
    this.status = status;
    this.data = data || {};
  }
}

export const errorText = (data) => {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(errorText).join(" ");
  if (data.detail) return data.detail;
  return Object.values(data).map(errorText).filter(Boolean).join(" ");
};

const request = async (path, { method = "GET", body, query } = {}) => {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });
  const url = `/api/${path}${params.toString() ? `?${params}` : ""}`;
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new ApiError(res.status, data);
  }
  return data;
};

export const api = {
  login: async (username, password) => {
    const data = await request("token/login/", {
      method: "POST",
      body: { username, password },
    });
    localStorage.setItem(TOKEN_KEY, data.auth_token);
    return data;
  },
  logout: async () => {
    try {
      await request("token/logout/", { method: "POST" });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  register: (username, password) =>
    request("users/", { method: "POST", body: { username, password } }),
  me: () => request("users/me/"),

  cats: (query) => request("cats/", { query }),
  cat: (id) => request(`cats/${id}/`),
  createCat: (data) => request("cats/", { method: "POST", body: data }),
  updateCat: (id, data) =>
    request(`cats/${id}/`, { method: "PATCH", body: data }),
  deleteCat: (id) => request(`cats/${id}/`, { method: "DELETE" }),
  achievements: () => request("achievements/"),

  events: (query) => request("events/", { query }),
  event: (id) => request(`events/${id}/`),
  createEvent: (data) => request("events/", { method: "POST", body: data }),
  updateEvent: (id, data) =>
    request(`events/${id}/`, { method: "PATCH", body: data }),
  deleteEvent: (id) => request(`events/${id}/`, { method: "DELETE" }),
  cancelEvent: (id) => request(`events/${id}/cancel/`, { method: "POST" }),
  joinEvent: (id, cat) =>
    request(`events/${id}/join/`, { method: "POST", body: { cat } }),
  leaveEvent: (id, cat) =>
    request(`events/${id}/leave/`, { method: "POST", body: { cat } }),
  participants: (id, page = 1) =>
    request(`events/${id}/participants/`, { query: { page } }),
  waitlist: (id, page = 1) =>
    request(`events/${id}/waitlist/`, { query: { page } }),
  myEvents: (query) => request("events/my/", { query }),
  registrations: (query) => request("registrations/", { query }),
};

export const fetchAll = async (loader, query = {}) => {
  const items = [];
  let page = 1;
  for (;;) {
    const data = await loader({ ...query, page });
    items.push(...data.results);
    if (!data.next) return items;
    page += 1;
  }
};
