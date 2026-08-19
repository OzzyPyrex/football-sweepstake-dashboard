const API_URL = "https://api.football-data.org/v4/competitions/WC/matches";

const baseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  Vary: "Accept-Encoding"
};

function response(statusCode, body, cacheHeaders = {}) {
  return {
    statusCode,
    headers: { ...baseHeaders, ...cacheHeaders },
    body: JSON.stringify(body)
  };
}

function noStore() {
  return { "Cache-Control": "no-store" };
}

function liveDataCache() {
  return {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
    "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=300"
  };
}

function normaliseScore(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normaliseMatch(match) {
  if (!match || typeof match !== "object" || match.id === undefined || match.id === null) {
    return null;
  }

  return {
    id: String(match.id),
    utcDate: typeof match.utcDate === "string" ? match.utcDate : null,
    status: typeof match.status === "string" ? match.status : "SCHEDULED",
    stage: typeof match.stage === "string" ? match.stage : "UNKNOWN",
    homeTeam: typeof match.homeTeam?.name === "string" ? match.homeTeam.name : "TBC",
    awayTeam: typeof match.awayTeam?.name === "string" ? match.awayTeam.name : "TBC",
    homeScore: normaliseScore(
      match.score?.fullTime?.home ?? match.score?.regularTime?.home
    ),
    awayScore: normaliseScore(
      match.score?.fullTime?.away ?? match.score?.regularTime?.away
    )
  };
}

export async function handler(event = {}) {
  const method = event.httpMethod || "GET";
  if (method !== "GET") {
    return response(405, { error: "Method not allowed." }, { ...noStore(), Allow: "GET" });
  }

  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    return response(503, {
      error: "Live match data is not configured.",
      hint: "Add FOOTBALL_DATA_API_TOKEN to the Netlify environment."
    }, noStore());
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    let apiResponse;
    try {
      apiResponse = await fetch(API_URL, {
        headers: { "X-Auth-Token": token },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!apiResponse.ok) {
      return response(apiResponse.status, {
        error: "The live football provider returned an error."
      }, noStore());
    }

    const payload = await apiResponse.json();
    const matches = Array.isArray(payload.matches)
      ? payload.matches.map(normaliseMatch).filter(Boolean)
      : [];

    return response(200, {
      source: "football-data.org",
      updatedAt: new Date().toISOString(),
      matches
    }, liveDataCache());
  } catch (error) {
    return response(502, {
      error: error?.name === "AbortError" ? "Live data request timed out." : "Live data request failed."
    }, noStore());
  }
}
