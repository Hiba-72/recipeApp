// Where the Taktouka API lives.
//
// The two halves are deployed separately now: this bundle is static files on
// Cloudflare Pages, and the API is a Worker on its own hostname. That split is
// what removed the cold start — a static page has nothing to wake up — but it
// does mean every /api call is cross-origin, so the Worker keeps an explicit
// ALLOWED_ORIGINS allowlist that has to include the Pages URL.
//
// REACT_APP_API_URL is baked in at build time by Create React App, so it is
// set in the Pages build configuration, not at runtime. There is no sensible
// default for production: a missing value would silently produce same-origin
// requests to Pages, which serves no API and would 404 every call with no clue
// why. Failing loudly in the console is more useful than that.
const configured = process.env.REACT_APP_API_URL;

if (process.env.NODE_ENV === 'production' && !configured) {
  // eslint-disable-next-line no-console
  console.error(
    'REACT_APP_API_URL is not set. Recipe requests will go to this origin, ' +
      'which serves no API. Set it in the Cloudflare Pages build settings to ' +
      "the Worker's URL and redeploy."
  );
}

export const API_BASE_URL =
  configured ??
  // `wrangler dev` default port. The old Express server was on 5000.
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : '');
