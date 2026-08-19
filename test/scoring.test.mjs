import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLeaderboard,
  buildTeamTable,
  getMatchSummary,
  normalizeStatus
} from "../scoring.js";

const matches = [
  {
    status: "FINISHED",
    homeTeam: "Portugal",
    awayTeam: "Japan",
    homeScore: 2,
    awayScore: 1
  },
  {
    status: "FINISHED",
    homeTeam: "Brazil",
    awayTeam: "France",
    homeScore: 0,
    awayScore: 0
  },
  {
    status: "IN_PLAY",
    homeTeam: "Portugal",
    awayTeam: "Brazil",
    homeScore: 1,
    awayScore: 0
  }
];

test("normalizes provider statuses", () => {
  assert.equal(normalizeStatus("IN_PLAY"), "LIVE");
  assert.equal(normalizeStatus("FINISHED"), "FINISHED");
  assert.equal(normalizeStatus("TIMED"), "SCHEDULED");
});

test("calculates table points from finished matches only", () => {
  const table = buildTeamTable(matches);
  assert.equal(table.get("Portugal").points, 3);
  assert.equal(table.get("Portugal").played, 1);
  assert.equal(table.get("Brazil").points, 1);
  assert.equal(table.get("France").points, 1);
});

test("ranks participants by points then goal difference", () => {
  const participants = [
    { id: "a", name: "Ava", team: "France" },
    { id: "b", name: "Ben", team: "Portugal" },
    { id: "c", name: "Cara", team: "Brazil" }
  ];
  const leaderboard = buildLeaderboard(participants, matches);
  assert.deepEqual(leaderboard.map((row) => row.name), ["Ben", "Ava", "Cara"]);
  assert.equal(leaderboard[0].rank, 1);
});

test("formats scheduled and scored matches", () => {
  assert.equal(getMatchSummary({ status: "SCHEDULED" }), "vs");
  assert.equal(getMatchSummary({ status: "FINISHED", homeScore: 3, awayScore: 2 }), "3–2");
});
