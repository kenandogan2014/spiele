const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;
const STORAGE_KEY = "splash-imposter-players";
const TIMER_STORAGE_KEY = "splash-imposter-timer";
const DEFAULT_TIMER_SECONDS = 180;

const WORDS = [
  "Pizza",
  "Strand",
  "Kino",
  "Schule",
  "Flughafen",
  "Supermarkt",
  "Burger",
  "Kaffee",
  "Fußball",
  "Zahnarzt",
  "Geburtstag",
  "Hotel",
  "Bus",
  "Museum",
  "Schokolade",
  "Swimmingpool",
  "Bäckerei",
  "Camping",
  "Bibliothek",
  "Konsole",
  "Eiscreme",
  "Restaurant",
  "Krankenhaus",
  "Konzert",
  "Spielplatz",
  "Bahnhof",
  "Mathe",
  "Winter",
  "Sommer",
  "Handy",
  "Küche",
  "Dschungel",
  "Rakete",
  "Zauberei",
  "Detektiv",
  "Roboter",
  "Berg",
  "Fahrrad",
  "Meer",
  "Party"
];

const state = {
  players: loadPlayers(),
  screen: "setup",
  currentIndex: 0,
  imposterIndex: -1,
  word: "",
  timerSeconds: loadTimerSeconds(),
  remainingSeconds: DEFAULT_TIMER_SECONDS,
  timerDeadline: 0
};

let timerInterval = null;

const screens = {
  setup: document.getElementById("setupScreen"),
  handoff: document.getElementById("handoffScreen"),
  reveal: document.getElementById("revealScreen"),
  discussion: document.getElementById("discussionScreen"),
  result: document.getElementById("resultScreen")
};

const roundStatus = document.getElementById("roundStatus");
const playerList = document.getElementById("playerList");
const playerCount = document.getElementById("playerCount");
const setupHint = document.getElementById("setupHint");
const addPlayerButton = document.getElementById("addPlayerButton");
const startRoundButton = document.getElementById("startRoundButton");
const timerButtons = Array.from(document.querySelectorAll("[data-seconds]"));
const roleProgress = document.getElementById("roleProgress");
const currentPlayerName = document.getElementById("currentPlayerName");
const showRoleButton = document.getElementById("showRoleButton");
const secretOwner = document.getElementById("secretOwner");
const secretCard = document.getElementById("secretCard");
const secretLabel = document.getElementById("secretLabel");
const secretValue = document.getElementById("secretValue");
const hideRoleButton = document.getElementById("hideRoleButton");
const discussionPlayers = document.getElementById("discussionPlayers");
const timerPanel = document.getElementById("timerPanel");
const timerLabel = document.getElementById("timerLabel");
const timerDisplay = document.getElementById("timerDisplay");
const finishRoundButton = document.getElementById("finishRoundButton");
const imposterName = document.getElementById("imposterName");
const finalWord = document.getElementById("finalWord");
const editPlayersButton = document.getElementById("editPlayersButton");
const newRoundButton = document.getElementById("newRoundButton");

addPlayerButton.addEventListener("click", () => {
  if (state.players.length >= MAX_PLAYERS) return;
  state.players.push("");
  renderSetup();
  focusLastInput();
});

startRoundButton.addEventListener("click", startRound);
showRoleButton.addEventListener("click", showCurrentRole);
hideRoleButton.addEventListener("click", hideCurrentRole);
finishRoundButton.addEventListener("click", showResult);
editPlayersButton.addEventListener("click", () => setScreen("setup"));
newRoundButton.addEventListener("click", startRound);
timerButtons.forEach((button) => {
  button.addEventListener("click", () => setTimerSeconds(Number(button.dataset.seconds)));
});

renderSetup();
updateTimerChoice();
setScreen("setup");

function loadPlayers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length >= MIN_PLAYERS) {
      return saved.slice(0, MAX_PLAYERS).map((name) => String(name));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return ["", "", ""];
}

function savePlayers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanPlayers()));
}

function loadTimerSeconds() {
  const savedSeconds = Number(localStorage.getItem(TIMER_STORAGE_KEY));
  return savedSeconds === 300 ? 300 : DEFAULT_TIMER_SECONDS;
}

function saveTimerSeconds() {
  localStorage.setItem(TIMER_STORAGE_KEY, String(state.timerSeconds));
}

function cleanPlayers() {
  return state.players
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, MAX_PLAYERS);
}

function renderSetup() {
  playerList.innerHTML = "";

  state.players.forEach((name, index) => {
    const row = document.createElement("div");
    row.className = "player-row";

    const number = document.createElement("span");
    number.className = "player-number";
    number.textContent = index + 1;

    const input = document.createElement("input");
    input.type = "text";
    input.value = name;
    input.placeholder = `Spieler ${index + 1}`;
    input.autocomplete = "off";
    input.maxLength = 18;
    input.ariaLabel = `Name fuer Spieler ${index + 1}`;
    input.addEventListener("input", () => {
      state.players[index] = input.value;
      updateSetupState();
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove-player";
    removeButton.type = "button";
    removeButton.textContent = "x";
    removeButton.ariaLabel = `Spieler ${index + 1} entfernen`;
    removeButton.disabled = state.players.length <= MIN_PLAYERS;
    removeButton.addEventListener("click", () => {
      state.players.splice(index, 1);
      renderSetup();
    });

    row.append(number, input, removeButton);
    playerList.append(row);
  });

  updateSetupState();
}

function updateSetupState() {
  const players = cleanPlayers();
  const missing = MIN_PLAYERS - players.length;
  playerCount.textContent = `${players.length}/${MAX_PLAYERS}`;
  startRoundButton.disabled = players.length < MIN_PLAYERS;
  addPlayerButton.disabled = state.players.length >= MAX_PLAYERS;

  if (missing > 0) {
    setupHint.textContent = `Noch ${missing} Name${missing === 1 ? "" : "n"} bis zur ersten Runde.`;
  } else {
    setupHint.textContent = "Ein Spieler wird geheim zum Imposter. Gebt das Handy nacheinander weiter.";
  }
}

function setTimerSeconds(seconds) {
  state.timerSeconds = seconds === 300 ? 300 : DEFAULT_TIMER_SECONDS;
  saveTimerSeconds();
  updateTimerChoice();
}

function updateTimerChoice() {
  timerButtons.forEach((button) => {
    const isActive = Number(button.dataset.seconds) === state.timerSeconds;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function focusLastInput() {
  const inputs = playerList.querySelectorAll("input");
  const lastInput = inputs[inputs.length - 1];
  if (lastInput) lastInput.focus();
}

function startRound() {
  const players = cleanPlayers();
  if (players.length < MIN_PLAYERS) {
    renderSetup();
    return;
  }

  state.players = players;
  state.currentIndex = 0;
  state.imposterIndex = randomIndex(players.length);
  state.word = WORDS[randomIndex(WORDS.length)];
  state.remainingSeconds = state.timerSeconds;
  savePlayers();
  saveTimerSeconds();
  renderHandoff();
  setScreen("handoff");
}

function renderHandoff() {
  const currentPlayer = state.players[state.currentIndex];
  roleProgress.textContent = `Spieler ${state.currentIndex + 1} von ${state.players.length}`;
  currentPlayerName.textContent = currentPlayer;
}

function showCurrentRole() {
  const currentPlayer = state.players[state.currentIndex];
  const isImposter = state.currentIndex === state.imposterIndex;

  secretOwner.textContent = currentPlayer;
  secretCard.classList.toggle("imposter", isImposter);
  secretLabel.textContent = isImposter ? "Rolle" : "Geheimes Wort";
  secretValue.textContent = isImposter ? "Imposter" : state.word;

  setScreen("reveal");
}

function hideCurrentRole() {
  state.currentIndex += 1;

  if (state.currentIndex >= state.players.length) {
    renderDiscussion();
    setScreen("discussion");
    startDiscussionTimer();
    return;
  }

  renderHandoff();
  setScreen("handoff");
}

function renderDiscussion() {
  discussionPlayers.innerHTML = "";
  timerPanel.classList.remove("time-up");
  timerLabel.textContent = "Diskussionszeit";
  timerDisplay.textContent = formatTime(state.timerSeconds);

  state.players.forEach((player) => {
    const chip = document.createElement("div");
    chip.className = "name-chip";
    chip.textContent = player;
    discussionPlayers.append(chip);
  });
}

function showResult() {
  stopDiscussionTimer();
  imposterName.textContent = state.players[state.imposterIndex];
  finalWord.textContent = state.word;
  setScreen("result");
}

function setScreen(name) {
  if (name !== "discussion") {
    stopDiscussionTimer();
  }

  state.screen = name;

  Object.entries(screens).forEach(([screenName, element]) => {
    element.classList.toggle("hidden", screenName !== name);
  });

  const statusMap = {
    setup: "Setup",
    handoff: "Rollen",
    reveal: "Geheim",
    discussion: "Diskussion",
    result: "Aufloesung"
  };
  roundStatus.textContent = statusMap[name];

  requestAnimationFrame(() => {
    const button = screens[name].querySelector("button:not(:disabled)");
    if (button) button.focus();
  });
}

function startDiscussionTimer() {
  stopDiscussionTimer();
  state.remainingSeconds = state.timerSeconds;
  state.timerDeadline = Date.now() + state.timerSeconds * 1000;
  updateDiscussionTimer();

  timerInterval = window.setInterval(updateDiscussionTimer, 250);
}

function updateDiscussionTimer() {
  const secondsLeft = Math.max(0, Math.ceil((state.timerDeadline - Date.now()) / 1000));
  state.remainingSeconds = secondsLeft;
  timerDisplay.textContent = formatTime(secondsLeft);

  if (secondsLeft === 0) {
    stopDiscussionTimer();
    timerPanel.classList.add("time-up");
    timerLabel.textContent = "Zeit vorbei";
  }
}

function stopDiscussionTimer() {
  if (!timerInterval) return;
  window.clearInterval(timerInterval);
  timerInterval = null;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function randomIndex(length) {
  return Math.floor(Math.random() * length);
}
