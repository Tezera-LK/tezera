import { fetchAuthSession } from "aws-amplify/auth";

// Call the Tezera API with the signed-in user's access token.
// "/api/..." is rewritten to the API in next.config.ts.
export async function apiFetch(path: string, init: RequestInit = {}) {
  const { tokens } = await fetchAuthSession();
  const token = tokens?.accessToken.toString();
  return fetch(`/api${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}
