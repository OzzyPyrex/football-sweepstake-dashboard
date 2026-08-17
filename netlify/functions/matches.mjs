const API_URL = "https://api.football-data.org/v4/competitions/WC/matches";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=45, stale-while-revalidate=120"
};

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

export async function handler() {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    return response(503, {
      error: "Live match data is not configured.",
      hint: "Add FOOTBALL_DATA_API_TOKEN to the Netlify environment."
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const apiResponse = await fetch(API_URL, {
      headers: { "X-Auth-Token": token },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!apiResponse.ok) {
      return response(apiResponse.status, {
        error: "The live football provider returned an error."
      });
    }

    const payload = await apiResponse.json();
    const matches = (payload.matches || []).map((match) => ({
      id: String(match.id),
      utcDate: match.utcDate,
      status: match.status,
      stage: match.stage,
      homeTeam: match.homeTeam?.name || "TBC",
      awayTeam: match.awayTeam?.name || "TBC",
      homeScore:
        match.score?.fullTime?.home ?? match.score?.regularTime?.home ?? null,
      awayScore:
        match.score?.fullTime?.away ?? match.score?.regularTime?.away ?? null
    }));

    return response(200, {
      source: "football-data.org",
      updatedAt: new Date().toISOString(),
      matches
    });
  } catch (error) {
    return response(502, {
      error: error?.name === "AbortError" ? "Live data request timed out." : "Live data request failed."
    });
  }
}

