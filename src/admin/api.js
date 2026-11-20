export class AdminRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createAdminApi(base, fetchRequest = fetch) {
  async function request(path, { method = "GET", body, key, signal } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (key) headers["Idempotency-Key"] = key;
    const response = await fetchRequest(base + path, {
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      if (response.status === 401) window.location.replace("/login");
      const fallback = {
        401: "Your session ended. Sign in again.",
        403: "You do not have permission to perform this action.",
        404: "This account, role, or venue is no longer available.",
        409: "This request conflicts with the current account state.",
        503: "The service is temporarily unavailable.",
      };
      throw new AdminRequestError(
        response.status,
        data?.error || fallback[response.status] || "The request failed.",
      );
    }
    return response.status === 204 ? undefined : response.json();
  }

  return {
    request,
    async list(path, signal) {
      const records = new Map();
      const limit = 100;
      for (let offset = 0; ; offset += limit) {
        const batch = await request(`${path}?limit=${limit}&offset=${offset}`, {
          signal,
        });
        for (const record of batch) records.set(record.id, record);
        if (batch.length < limit) return [...records.values()];
      }
    },
  };
}

export const usersPath = "/api/admin/users";
export const userPath = (id) => `${usersPath}/${encodeURIComponent(id)}`;

export async function directoryPage(api, path, page, size, filters, signal) {
  const query = new URLSearchParams({
    view: "directory",
    limit: String(size),
    offset: String((page - 1) * size),
  });
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  const result = await api.request(`${path}?${query}`, { signal });
  if (
    !Array.isArray(result?.items) ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0
  ) {
    throw new Error(
      "This backend did not return a directory page. Update or restart the API and try again.",
    );
  }
  return result;
}

export const venuePageSize = 6;

// Keep a small cache for the first pages and recently visited search results.
export function createVenuePageLoader(api) {
  const pages = new Map();
  const maxCachedPages = 12;

  return function loadVenuePage(page, search = "", region = "") {
    const query = search.trim();
    const key = JSON.stringify([query, region, page]);
    const cached = pages.get(key);
    if (cached) {
      pages.delete(key);
      pages.set(key, cached);
      return cached;
    }

    const request = directoryPage(
      api,
      "/api/admin/venues",
      page,
      venuePageSize,
      {
        search: query,
        active: "true",
        region,
      },
    ).catch((error) => {
      if (pages.get(key) === request) pages.delete(key);
      throw error;
    });
    pages.set(key, request);
    if (pages.size > maxCachedPages) pages.delete(pages.keys().next().value);
    return request;
  };
}

export function prefetchNextVenuePage(loadVenuePage, page, total, search, region) {
  if (page * venuePageSize < total) {
    return loadVenuePage(page + 1, search, region).catch(() => {});
  }
}

export async function prefetchMoreVenuePages(loadVenuePage) {
  const { total } = await loadVenuePage(1);
  const nextPages = [2, 3].filter((page) => (page - 1) * venuePageSize < total);
  await Promise.allSettled(nextPages.map((page) => loadVenuePage(page)));
}

export function loadUserPage(api, page, size, filters, signal) {
  return directoryPage(
    api,
    usersPath,
    page,
    size,
    {
      search: filters.query.trim(),
      role: filters.role,
      // The API uses "inactive" for linked accounts awaiting reactivation.
      status:
        filters.status === "Deactivated" ? "inactive" : filters.status.toLowerCase(),
      venueId: filters.venue,
      canPublish: filters.publish,
    },
    signal,
  );
}

export function invitationRetryKeys(userId, storage = () => window.sessionStorage) {
  const memory = new Map();
  const prefix = `wedgewood:admin-invitation:${userId}:`;
  return {
    get(operation) {
      if (memory.has(operation)) return memory.get(operation);
      try {
        return storage().getItem(prefix + operation);
      } catch {
        return undefined;
      }
    },
    set(operation, key) {
      memory.set(operation, key);
      try {
        storage().setItem(prefix + operation, key);
      } catch {
        // Keep retries available in memory when browser storage is blocked.
      }
    },
    delete(operation) {
      memory.delete(operation);
      try {
        storage().removeItem(prefix + operation);
      } catch {
        // The in-memory entry has already been removed.
      }
    },
  };
}

// Keep the same operation key across ambiguous failures and page reloads.
// A successful resend or a corrected request gets a fresh key.
export async function requestInvitation(
  api,
  keys,
  endpoint,
  body,
  newKey = () => crypto.randomUUID(),
) {
  if (body?.roles) {
    body = {
      ...body,
      roles: [...body.roles].sort((a, b) =>
        (a.venueId ?? "").localeCompare(b.venueId ?? "") ||
        a.roleId.localeCompare(b.roleId),
      ),
    };
  }
  // Persist the fingerprint and UUID without saving the invitation payload.
  const payload = new TextEncoder().encode(JSON.stringify([endpoint, body]));
  const hash = await crypto.subtle.digest("SHA-256", payload);
  const operation = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const key = keys.get(operation) ?? newKey();
  keys.set(operation, key);
  try {
    await api.request(endpoint, { method: "POST", body, key });
    keys.delete(operation);
  } catch (error) {
    if (
      error.status === 400 ||
      (error.status === 409 && error.message === "invitation can no longer be completed")
    ) {
      keys.delete(operation);
    }
    throw error;
  }
}
