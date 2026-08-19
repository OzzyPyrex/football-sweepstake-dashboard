import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../netlify/functions/matches.mjs";

const originalFetch = globalThis.fetch;
const originalToken = process.env.FOOTBALL_DATA_API_TOKEN;

function restoreEnvironment() {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.FOOTBALL_DATA_API_TOKEN;
  else process.env.FOOTBALL_DATA_API_TOKEN = originalToken;
}

test.afterEach(restoreEnvironment);

test("allows only GET requests", async () => {
  const result = await handler({ httpMethod: "POST" });

  assert.equal(result.statusCode, 405);
  assert.equal(result.headers.Allow, "GET");
  assert.equal(result.headers["Cache-Control"], "no-store");
});

test("does not attempt a provider request without a server token", async () => {
  delete process.env.FOOTBALL_DATA_API_TOKEN;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
  };

  const result = await handler({ httpMethod: "GET" });

  assert.equal(result.statusCode, 503);
  assert.equal(called, false);
});

test("returns a minimal normalized match payload with controlled caching", async () => {
  process.env.FOOTBALL_DATA_API_TOKEN = "test-token";
  globalThis.fetch = async (url, options) => {
    assert.match(url, /football-data\.org/);
    assert.equal(options.headers["X-Auth-Token"], "test-token");
    return new Response(JSON.stringify({
      matches: [
        {
          id: 42,
          utcDate: "2026-06-11T18:00:00Z",
          status: "FINISHED",
          stage: "GROUP_STAGE",
          homeTeam: { name: "Example Home" },
          awayTeam: { name: "Example Away" },
          score: { fullTime: { home: 2, away: 1 } },
          confidentialProviderField: "must not be exposed"
        },
        { id: null, confidentialProviderField: "discarded" }
      ]
    }), { status: 200 });
  };

  const result = await handler({ httpMethod: "GET" });
  const body = JSON.parse(result.body);

  assert.equal(result.statusCode, 200);
  assert.equal(result.headers["Netlify-CDN-Cache-Control"], "public, s-maxage=300, stale-while-revalidate=300");
  assert.equal(result.headers["x-ratelimit-remaining"], undefined);
  assert.deepEqual(body.matches, [{
    id: "42",
    utcDate: "2026-06-11T18:00:00Z",
    status: "FINISHED",
    stage: "GROUP_STAGE",
    homeTeam: "Example Home",
    awayTeam: "Example Away",
    homeScore: 2,
    awayScore: 1
  }]);
});
