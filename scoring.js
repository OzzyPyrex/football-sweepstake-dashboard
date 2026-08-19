const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);
const FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

export function normalizeStatus(status = "SCHEDULED") {
  const value = String(status).toUpperCase();
  if (LIVE_STATUSES.has(value)) return "LIVE";
  if (FINISHED_STATUSES.has(value)) return "FINISHED";
  return "SCHEDULED";
}

function emptyTeam(team) {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  };
}

export function buildTeamTable(matches = []) {
  const table = new Map();

  for (const match of matches) {
    const home = String(match.homeTeam || "").trim();
    const away = String(match.awayTeam || "").trim();
    if (!home || !away) continue;

    if (!table.has(home)) table.set(home, emptyTeam(home));
    if (!table.has(away)) table.set(away, emptyTeam(away));
    if (normalizeStatus(match.status) !== "FINISHED") continue;

    const homeScore = Number(match.homeScore);
    const awayScore = Number(match.awayScore);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;

    const homeRow = table.get(home);
    const awayRow = table.get(away);
    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += homeScore;
    homeRow.goalsAgainst += awayScore;
    awayRow.goalsFor += awayScore;
    awayRow.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeRow.won += 1;
      homeRow.points += 3;
      awayRow.lost += 1;
    } else if (homeScore < awayScore) {
      awayRow.won += 1;
      awayRow.points += 3;
      homeRow.lost += 1;
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  }

  for (const row of table.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return table;
}

export function buildLeaderboard(participants = [], matches = []) {
  const table = buildTeamTable(matches);
  return participants
    .map((participant) => {
      const stats = table.get(participant.team) || emptyTeam(participant.team);
      return { ...participant, ...stats };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getMatchSummary(match) {
  const status = normalizeStatus(match.status);
  if (status === "SCHEDULED") return "vs";
  return `${Number(match.homeScore) || 0}–${Number(match.awayScore) || 0}`;
}
