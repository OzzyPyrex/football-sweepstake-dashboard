import { buildLeaderboard, getMatchSummary, normalizeStatus } from "./scoring.js";

const SAMPLE_MATCHES_URL = "./data/sample-matches.json";
const PARTICIPANTS_URL = "./data/participants.json";
const LIVE_MATCHES_URL = "/api/matches";
const STORAGE_KEY = "office-sweep-fictional-selections-v1";
const REFRESH_INTERVAL = 60_000;

const elements = {
  autoRefresh: document.querySelector("#autoRefresh"),
  emptyState: document.querySelector("#emptyState"),
  finishedCount: document.querySelector("#finishedCount"),
  fixtureList: document.querySelector("#fixtureList"),
  fixtureTemplate: document.querySelector("#fixtureTemplate"),
  formMessage: document.querySelector("#formMessage"),
  heroLeader: document.querySelector("#heroLeader"),
  heroLeaderTeam: document.querySelector("#heroLeaderTeam"),
  lastUpdated: document.querySelector("#lastUpdated"),
  leaderboardBody: document.querySelector("#leaderboardBody"),
  liveCount: document.querySelector("#liveCount"),
  matchCount: document.querySelector("#matchCount"),
  participantCount: document.querySelector("#participantCount"),
  participantSelect: document.querySelector("#participantSelect"),
  refreshButton: document.querySelector("#refreshButton"),
  resetSelections: document.querySelector("#resetSelections"),
  selectionForm: document.querySelector("#selectionForm"),
  sourceLabel: document.querySelector("#sourceLabel"),
  sourcePill: document.querySelector("#sourcePill"),
  statusFilter: document.querySelector("#statusFilter"),
  teamSearch: document.querySelector("#teamSearch"),
  teamSelect: document.querySelector("#teamSelect")
};

const state = {
  matches: [],
  participants: [],
  source: "loading",
  updatedAt: null,
  timer: null
};

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function readSelections() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function currentParticipants() {
  const saved = readSelections();
  return state.participants.map((participant) => ({
    ...participant,
    team: saved[participant.id] || participant.team
  }));
}

function setSource(mode, label) {
  state.source = mode;
  elements.sourcePill.dataset.mode = mode;
  elements.sourceLabel.textContent = label;
}

function setLoading(isLoading) {
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.classList.toggle("is-loading", isLoading);
  if (isLoading) setSource("loading", "Syncing");
}

async function syncData() {
  setLoading(true);
  elements.formMessage.textContent = "";

  try {
    if (!state.participants.length) {
      const participantPayload = await getJson(PARTICIPANTS_URL);
      state.participants = participantPayload.participants || [];
    }

    try {
      const livePayload = await getJson(LIVE_MATCHES_URL);
      if (!Array.isArray(livePayload.matches) || !livePayload.matches.length) {
        throw new Error("Live provider returned no matches");
      }
      state.matches = livePayload.matches;
      state.updatedAt = livePayload.updatedAt || new Date().toISOString();
      setSource("live", "Live API");
    } catch {
      const samplePayload = await getJson(SAMPLE_MATCHES_URL);
      state.matches = samplePayload.matches || [];
      state.updatedAt = samplePayload.updatedAt || null;
      setSource("sample", "Sample data");
    }

    render();
  } catch (error) {
    setSource("error", "Data unavailable");
    elements.lastUpdated.textContent = "Unable to load dashboard data";
    elements.fixtureList.replaceChildren();
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "The dashboard data could not be loaded. Try refreshing.";
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function render() {
  const participants = currentParticipants();
  const leaderboard = buildLeaderboard(participants, state.matches);
  renderMetrics(participants, leaderboard);
  renderLeaderboard(leaderboard);
  renderFixtures();
  renderSelectionForm(participants);
  elements.lastUpdated.textContent = formatDateTime(state.updatedAt);
}

function renderMetrics(participants, leaderboard) {
  const live = state.matches.filter((match) => normalizeStatus(match.status) === "LIVE").length;
  const finished = state.matches.filter((match) => normalizeStatus(match.status) === "FINISHED").length;
  elements.participantCount.textContent = participants.length;
  elements.matchCount.textContent = state.matches.length;
  elements.liveCount.textContent = live;
  elements.finishedCount.textContent = finished;

  const leader = leaderboard[0];
  elements.heroLeader.textContent = leader?.name || "—";
  elements.heroLeaderTeam.textContent = leader
    ? `${leader.team} · ${leader.points} ${leader.points === 1 ? "point" : "points"}`
    : "Calculating standings";
}

function renderLeaderboard(leaderboard) {
  const rows = leaderboard.map((entry) => {
    const row = document.createElement("tr");
    if (entry.rank === 1) row.classList.add("leader-row");

    const rank = document.createElement("td");
    const rankBadge = document.createElement("span");
    rankBadge.className = "rank-badge";
    rankBadge.textContent = entry.rank;
    rank.append(rankBadge);

    const participant = document.createElement("td");
    const participantWrap = document.createElement("span");
    participantWrap.className = "participant-cell";
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.style.setProperty("--avatar-accent", entry.accent || "#b8f35b");
    avatar.textContent = entry.name.slice(0, 1).toUpperCase();
    const name = document.createElement("strong");
    name.textContent = entry.name;
    participantWrap.append(avatar, name);
    participant.append(participantWrap);

    const team = document.createElement("td");
    team.textContent = entry.team;
    const played = document.createElement("td");
    played.textContent = entry.played;
    const goalDifference = document.createElement("td");
    goalDifference.textContent = entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference;
    const points = document.createElement("td");
    const pointsBadge = document.createElement("strong");
    pointsBadge.className = "points-badge";
    pointsBadge.textContent = entry.points;
    points.append(pointsBadge);

    row.append(rank, participant, team, played, goalDifference, points);
    return row;
  });

  elements.leaderboardBody.replaceChildren(...rows);
}

function renderFixtures() {
  const wantedStatus = elements.statusFilter.value;
  const query = elements.teamSearch.value.trim().toLowerCase();
  const filtered = [...state.matches]
    .filter((match) => wantedStatus === "ALL" || normalizeStatus(match.status) === wantedStatus)
    .filter((match) => `${match.homeTeam} ${match.awayTeam}`.toLowerCase().includes(query))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

  const cards = filtered.map((match) => {
    const card = elements.fixtureTemplate.content.firstElementChild.cloneNode(true);
    const status = normalizeStatus(match.status);
    card.dataset.status = status;
    card.querySelector(".match-status").textContent = status === "SCHEDULED" ? "UPCOMING" : status;
    card.querySelector("time").textContent = formatFixtureDate(match.utcDate);
    card.querySelector("time").dateTime = match.utcDate;
    card.querySelector(".home-team").textContent = match.homeTeam;
    card.querySelector(".away-team").textContent = match.awayTeam;
    card.querySelector(".fixture-score").textContent = getMatchSummary(match);
    card.querySelector(".stage-label").textContent = formatStage(match.stage);
    return card;
  });

  elements.fixtureList.replaceChildren(...cards);
  elements.emptyState.hidden = cards.length > 0;
}

function renderSelectionForm(participants) {
  const selectedParticipant = elements.participantSelect.value;
  const teams = [...new Set(state.matches.flatMap((match) => [match.homeTeam, match.awayTeam]))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  elements.participantSelect.replaceChildren(
    ...participants.map((participant) => new Option(participant.name, participant.id))
  );
  if (participants.some((participant) => participant.id === selectedParticipant)) {
    elements.participantSelect.value = selectedParticipant;
  }

  elements.teamSelect.replaceChildren(...teams.map((team) => new Option(team, team)));
  syncTeamSelect();
}

function syncTeamSelect() {
  const participant = currentParticipants().find(
    (item) => item.id === elements.participantSelect.value
  );
  if (participant && [...elements.teamSelect.options].some((option) => option.value === participant.team)) {
    elements.teamSelect.value = participant.team;
  }
}

function saveSelection(event) {
  event.preventDefault();
  const participantId = elements.participantSelect.value;
  const team = elements.teamSelect.value;
  if (!participantId || !team) return;

  const selections = readSelections();
  selections[participantId] = team;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  const participant = state.participants.find((item) => item.id === participantId);
  elements.formMessage.textContent = `${participant?.name || "Participant"} is now assigned to ${team}.`;
  render();
}

function resetSelections() {
  localStorage.removeItem(STORAGE_KEY);
  elements.formMessage.textContent = "Fictional selections restored.";
  render();
}

function setAutoRefresh() {
  clearInterval(state.timer);
  state.timer = elements.autoRefresh.checked
    ? setInterval(syncData, REFRESH_INTERVAL)
    : null;
}

function formatDateTime(value) {
  if (!value) return "Waiting for data";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatFixtureDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStage(stage = "MATCH") {
  return String(stage).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

elements.refreshButton.addEventListener("click", syncData);
elements.statusFilter.addEventListener("change", renderFixtures);
elements.teamSearch.addEventListener("input", renderFixtures);
elements.participantSelect.addEventListener("change", syncTeamSelect);
elements.selectionForm.addEventListener("submit", saveSelection);
elements.resetSelections.addEventListener("click", resetSelections);
elements.autoRefresh.addEventListener("change", setAutoRefresh);

setAutoRefresh();
syncData();
