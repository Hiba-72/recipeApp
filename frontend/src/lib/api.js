// Where the Taktouka server lives.
//
// Empty string in production on purpose: the built frontend is served by that
// same server, so "/api/..." is a same-origin request and no cross-origin
// configuration is needed. Set REACT_APP_API_URL only when the two are
// deployed separately.
export const API_BASE_URL =
  process.env.REACT_APP_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");
