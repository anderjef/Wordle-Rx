//Jeffrey Andersen

const wordLength = 5;
const maxGuesses = 6;
const numScreenDivisions = 70;
const additionalScreenDivisionsForStatsButton = 9;
const canvasWindowWidthMultiplier = 1, canvasWindowHeightMultiplier = 7 / 10;
let validWords;
let answers;
let gameState;
let maxFrameRate = 1.25;
const qwertyKeysToIndices = {
  Q:  0,
  W:  1,
  E:  2,
  R:  3,
  T:  4,
  Y:  5,
  U:  6,
  I:  7,
  O:  8,
  P:  9,
  A: 10,
  S: 11,
  D: 12,
  F: 13,
  G: 14,
  H: 15,
  J: 16,
  K: 17,
  L: 18,
  Z: 19,
  X: 20,
  C: 21,
  V: 22,
  B: 23,
  N: 24,
  M: 25,
};
let lastWindowWidth, lastWindowHeight;
let refreshSquares = true;
let lastSecondsUntilNextPlayableGame;
let refreshStats = false;
let canvas;
let displayOffset = 0;

let colors;
let colorsForCopying = [];
let popups = [];
let keyboardColors; //in the order of the Qwerty keyboard read left to right then top to bottom
let todayIndex;
let gameOver = false;
let justEndedGameLoopCount = 0;
let stats = gameOver; //whether the stats display is open
let gamesPlayed = 0;
let gamesWon = 0;
let currentStreak = 0;
let maxStreak = 0;
let resetPoint;

let statsButton;
let clipboardButton;
let cumulativeStatsButton;
let keyboard = [];
let enterButton;
let backspaceButton;


function preload() {
  validWords = loadStrings("valid words.txt"); //all words must be exactly wordLength long; from https://raw.githubusercontent.com/tabatkins/wordle-list/main/words
  answers = loadStrings("answers.txt");
}


function setup() {
  lastWindowWidth = windowWidth;
  lastWindowHeight = windowHeight;
  displayOffset = lastWindowWidth / 2 - min(canvasWindowWidthMultiplier * lastWindowWidth, canvasWindowHeightMultiplier * lastWindowHeight) / 2;
  canvas = createCanvas(min(canvasWindowWidthMultiplier * lastWindowWidth, canvasWindowHeightMultiplier * lastWindowHeight), min(canvasWindowWidthMultiplier * lastWindowWidth, canvasWindowHeightMultiplier * lastWindowHeight)).position(displayOffset);
  validWords += answers;
  const now = new Date();
  todayIndex = (new Date(now)).getDay();
  colors = Array.from({length: maxGuesses}, () => (Array.from({length: wordLength}, () => (color(0)))));
  keyboardColors = Array.from({length: 26}, () => (color(127))); //26 letters in the alphabet
  gameState = getItem('wordle-rx-state');
  const expectedAttributes = (gameState !== null && (Object.keys(gameState).includes('ID') && Object.keys(gameState).includes('games') && Object.keys(gameState).length === 2));
  if (!expectedAttributes) {
    if (gameState !== null) {
      clearRelevantLocalStorage();
    }
    resetLocalStorage();
  }
  else {
    if (gameState.games[todayIndex].guess || gameState.games[todayIndex].previousGuesses.length) {
      for (let i = 0; i < gameState.games[todayIndex].previousGuesses.length; i++) {
        updateColorsForClipboardAndGUI(gameState.games[todayIndex].previousGuesses[i], i);
      }
    }
    for (let i = 0; i < gameState.games.length; i++) {
      gamesPlayed += (gameState.games[i].dateCompleted !== undefined);
      gamesWon += (gameState.games[i].dateCompleted !== undefined && gameState.games[i].previousGuesses.slice(-1)[0] === answers[i]);
    }
    let gamesSortedByCompletion = structuredClone(gameState.games);
    for (let i = 0; i < gamesSortedByCompletion.length; i++) {
      gamesSortedByCompletion[i].gameIndex = i; //for later comparing the final guess to the correct answer in the list of answers
    }
    gamesSortedByCompletion.sort(function(a, b) {
      if (a.dateCompleted !== undefined && b.dateCompleted !== undefined) {
        return (new Date(a.dateCompleted)) - (new Date(b.dateCompleted));
      }
      else if (a.dateCompleted !== undefined) {
        return -1;
      }
      else if (b.dateCompleted !== undefined) {
        return 1;
      }
      else {
        return 0;
      }
    });
    for (let i = 0; i < gamesSortedByCompletion.length && gamesSortedByCompletion[i].dateCompleted !== undefined; i++) { //all the games with undefined completion dates were sorted to the end
      if (gamesSortedByCompletion[i].previousGuesses.slice(-1)[0] === answers[gamesSortedByCompletion[i].gameIndex]) { //previousGuesses will have some length because the game was already confirmed to be completed
        currentStreak++;
      }
      else {
        currentStreak = 0;
        maxStreak = max(maxStreak, currentStreak);
      }
    }
    maxStreak = max(maxStreak, currentStreak); //if the existing streak is the largest streak
    if (gamesPlayed === answers.length) {
      determineResetPoint();
      if (resetPoint - (new Date(now)).getTime() < 0) { //if resetPoint is undefined, the subtraction becomes NaN which equivalates to false any way it is compared to zero
        resetPoint = undefined;
        clearRelevantLocalStorage();
        resetLocalStorage();
      }
    }
  }
  const screenDivision = width / numScreenDivisions;
  statsButton = createButton((stats ? "x" : "Stats")).mousePressed(toggleStats).mouseOver(statsMouseOver).mouseOut(statsMouseOut).style('color', color(255)).style('background-color', color(0)).style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').style('touch-action', 'manipulation').size(additionalScreenDivisionsForStatsButton * screenDivision, additionalScreenDivisionsForStatsButton * screenDivision).position(displayOffset + width - additionalScreenDivisionsForStatsButton * screenDivision, 0); //future consideration: bugfix "Stats" button label on mobile not seeming to be centered on the button
  clipboardButton = createButton("Copy to clipboard").mousePressed(copyDaily).mouseOver(blueButtonMouseOver).mouseOut(blueButtonMouseOut).style('color', color(255)).style('background-color', color(0, 63, 255)).style('display', (stats && gameOver ? '' : 'none')).style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').style('touch-action', 'manipulation').size(18 * screenDivision, 10 * screenDivision).position(displayOffset + width / 2 - 18 * screenDivision, height);
  cumulativeStatsButton = createButton("Copy to-date weekly stats").mousePressed(copyStats).mouseOver(blueButtonMouseOver).mouseOut(blueButtonMouseOut).style('color', color(255)).style('background-color', color(0, 63, 255)).style('display', (stats && gameOver ? '' : 'none')).style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').style('touch-action', 'manipulation').size(18 * screenDivision, 10 * screenDivision).position(displayOffset + width / 2, height);
  const letterButtonWidth = (numScreenDivisions / 10) * screenDivision;
  const letterButtonHeight = (numScreenDivisions / 7) * screenDivision;
  keyboard.push([]);
  keyboard[0].push(createButton("Q").mousePressed(function() { keyTyped("Q"); }).style('background-color', keyboardColors[ 0]).position(displayOffset + 0 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("W").mousePressed(function() { keyTyped("W"); }).style('background-color', keyboardColors[ 1]).position(displayOffset + 1 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("E").mousePressed(function() { keyTyped("E"); }).style('background-color', keyboardColors[ 2]).position(displayOffset + 2 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("R").mousePressed(function() { keyTyped("R"); }).style('background-color', keyboardColors[ 3]).position(displayOffset + 3 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("T").mousePressed(function() { keyTyped("T"); }).style('background-color', keyboardColors[ 4]).position(displayOffset + 4 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("Y").mousePressed(function() { keyTyped("Y"); }).style('background-color', keyboardColors[ 5]).position(displayOffset + 5 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("U").mousePressed(function() { keyTyped("U"); }).style('background-color', keyboardColors[ 6]).position(displayOffset + 6 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("I").mousePressed(function() { keyTyped("I"); }).style('background-color', keyboardColors[ 7]).position(displayOffset + 7 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("O").mousePressed(function() { keyTyped("O"); }).style('background-color', keyboardColors[ 8]).position(displayOffset + 8 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("P").mousePressed(function() { keyTyped("P"); }).style('background-color', keyboardColors[ 9]).position(displayOffset + 9 * letterButtonWidth, lastWindowHeight - 3 * letterButtonHeight));
  keyboard.push([]);
  keyboard[1].push(createButton("A").mousePressed(function() { keyTyped("A"); }).style('background-color', keyboardColors[10]).position(displayOffset + 0.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("S").mousePressed(function() { keyTyped("S"); }).style('background-color', keyboardColors[11]).position(displayOffset + 1.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("D").mousePressed(function() { keyTyped("D"); }).style('background-color', keyboardColors[12]).position(displayOffset + 2.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("F").mousePressed(function() { keyTyped("F"); }).style('background-color', keyboardColors[13]).position(displayOffset + 3.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("G").mousePressed(function() { keyTyped("G"); }).style('background-color', keyboardColors[14]).position(displayOffset + 4.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("H").mousePressed(function() { keyTyped("H"); }).style('background-color', keyboardColors[15]).position(displayOffset + 5.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("J").mousePressed(function() { keyTyped("J"); }).style('background-color', keyboardColors[16]).position(displayOffset + 6.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("K").mousePressed(function() { keyTyped("K"); }).style('background-color', keyboardColors[17]).position(displayOffset + 7.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("L").mousePressed(function() { keyTyped("L"); }).style('background-color', keyboardColors[18]).position(displayOffset + 8.5 * letterButtonWidth, lastWindowHeight - 2 * letterButtonHeight));
  keyboard.push([]);
  keyboard[2].push(createButton("Z").mousePressed(function() { keyTyped("Z"); }).style('background-color', keyboardColors[19]).position(displayOffset + 1.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight));
  keyboard[2].push(createButton("X").mousePressed(function() { keyTyped("X"); }).style('background-color', keyboardColors[20]).position(displayOffset + 2.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight));
  keyboard[2].push(createButton("C").mousePressed(function() { keyTyped("C"); }).style('background-color', keyboardColors[21]).position(displayOffset + 3.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight));
  keyboard[2].push(createButton("V").mousePressed(function() { keyTyped("V"); }).style('background-color', keyboardColors[22]).position(displayOffset + 4.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight));
  keyboard[2].push(createButton("B").mousePressed(function() { keyTyped("B"); }).style('background-color', keyboardColors[23]).position(displayOffset + 5.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight));
  keyboard[2].push(createButton("N").mousePressed(function() { keyTyped("N"); }).style('background-color', keyboardColors[24]).position(displayOffset + 6.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight));
  keyboard[2].push(createButton("M").mousePressed(function() { keyTyped("M"); }).style('background-color', keyboardColors[25]).position(displayOffset + 7.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight));
  for (let i = 0; i < keyboard.length; i++) {
    for (let j = 0; j < keyboard[i].length; j++) {
      keyboard[i][j].style('color', color(255)).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').style('touch-action', 'manipulation').size(letterButtonWidth, letterButtonHeight);
    }
  }
  enterButton = createButton("Enter").mousePressed(submitGuess).style('color', color(255)).style('background-color', color(127)).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').style('touch-action', 'manipulation').size(1.5 * letterButtonWidth, letterButtonHeight).position(displayOffset, lastWindowHeight - letterButtonHeight);
  backspaceButton = createButton("←").mousePressed(removeLetterFromGuess).style('color', color(255)).style('background-color', color(127)).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').style('touch-action', 'manipulation').size(1.5 * letterButtonWidth, letterButtonHeight).position(displayOffset + 8.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight);
  textAlign(CENTER, CENTER);
}


function draw() {
  const newWindowWidth = windowWidth;
  const newWindowHeight = windowHeight;
  if (newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
    resizeCanvas(min(canvasWindowWidthMultiplier * newWindowWidth, canvasWindowHeightMultiplier * newWindowHeight), min(canvasWindowWidthMultiplier * newWindowWidth, canvasWindowHeightMultiplier * newWindowHeight));
    displayOffset = newWindowWidth / 2 - min(canvasWindowWidthMultiplier * newWindowWidth, canvasWindowHeightMultiplier * newWindowHeight) / 2;
    canvas.position(displayOffset);
    refreshSquares = !stats;
    refreshStats = stats;
  }
  maxFrameRate = floor(max(maxFrameRate, frameRate())); //must be set before call to frameRate(1.25) in case game is loaded to a completed game state to avoid a perpetually low frame rate
  if (refreshSquares || refreshStats) {
    background(0);
  }
  const screenDivision = width / numScreenDivisions;
  textSize((numScreenDivisions / 15) * screenDivision);
  if (refreshSquares || refreshStats || newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
    stroke(255);
    fill(255);
    text("Wordle Rx", width / 2, (numScreenDivisions / 16) * screenDivision);
  }
  if (!stats) {
    if (gameState.games[todayIndex].previousGuesses.length && gameState.games[todayIndex].previousGuesses.slice(-1)[0] === answers[todayIndex] && !gameOver) {
      gameOver = true;
      justEndedGameLoopCount = 2 + 2 * (!gameState.games[todayIndex].previousGuesses.slice(-1)[0] && popups.length); //extra time on loss for the user to read the answer popup
      frameRate(1.25); //found to be the only way to have the program show the game's end then the stats page shortly after (as opposed to a busy wait)
    }
    const letterSpaceMultiplier = 9;
    if (refreshSquares) {
      refreshSquares = false;
      strokeWeight(3);
      for (let y = 0; y < maxGuesses; y++) {
        for (let x = 0; x < wordLength; x++) {
          stroke((y < gameState.games[todayIndex].previousGuesses.length ? colors[y][x] : (y === gameState.games[todayIndex].previousGuesses.length ? (gameState.games[todayIndex].guess.length !== wordLength ? (x < gameState.games[todayIndex].guess.length ? 191 : 91) : (!validWords.includes(gameState.games[todayIndex].guess) ? color(127, 0, 0) : 191)) : 91)));
          fill(colors[y][x]);
          square(((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + x * (letterSpaceMultiplier + 1)) * screenDivision, ((numScreenDivisions / 8) + y * (letterSpaceMultiplier + 1)) * screenDivision, letterSpaceMultiplier * screenDivision);
        }
      }
      strokeWeight(1);
      stroke(255);
      fill(255);
      for (let i = 0; i < gameState.games[todayIndex].previousGuesses.length; i++) {
        const y = (numScreenDivisions / 8 + letterSpaceMultiplier / 2 + i * (letterSpaceMultiplier + 1)) * screenDivision;
        for (let j = 0; j < wordLength; j++) {
          const x = ((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + letterSpaceMultiplier / 2 + j * (letterSpaceMultiplier + 1)) * screenDivision;
          text(gameState.games[todayIndex].previousGuesses[i][j], x, y);
        }
      }
    }
    stroke((gameState.games[todayIndex].guess.length === wordLength && !validWords.includes(gameState.games[todayIndex].guess) ? color(127, 0, 0) : 255));
    fill((gameState.games[todayIndex].guess.length === wordLength && !validWords.includes(gameState.games[todayIndex].guess) ? color(127, 0, 0) : 255));
    for (let i = 0; i < gameState.games[todayIndex].guess.length; i++) {
      const x = ((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + letterSpaceMultiplier / 2 + i * (letterSpaceMultiplier + 1)) * screenDivision;
      const y = (numScreenDivisions / 8 + letterSpaceMultiplier / 2 + gameState.games[todayIndex].previousGuesses.length * (letterSpaceMultiplier + 1)) * screenDivision;
      text(gameState.games[todayIndex].guess[i], x, y);
    }
    let numPopupsToDiscard = 0; //depends on popups being in order of decreasing age
    for (let i = 0; i < popups.length; i++) {
      const label = Object.keys(popups[i])[0];
      if (Date.now() - popups[i][label] > 1000) { //popups expire after 1000 milliseconds
        numPopupsToDiscard = i + 1;
      }
      else {
        stroke(255);
        fill(255);
        rect(width / 2 - 7 * screenDivision, (5 + (i - numPopupsToDiscard + 1) * 6) * screenDivision, 14 * screenDivision, 4 * screenDivision, screenDivision / 2);
        stroke(0);
        fill(0);
        textSize(1.5 * screenDivision);
        text(label, width / 2, (7 + (i - numPopupsToDiscard + 1) * 6) * screenDivision);
      }
    }
    if (numPopupsToDiscard > 0) {
      popups.splice(0, numPopupsToDiscard);
      refreshSquares = true;
    }
    if (newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
      const letterButtonWidth = 7 * screenDivision;
      const letterButtonHeight = 10 * screenDivision;
      for (let i = 0; i < keyboard[0].length; i++) {
        keyboard[0][i].style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(displayOffset + i * letterButtonWidth, newWindowHeight - 3 * letterButtonHeight);
      }
      for (let i = 0; i < keyboard[1].length; i++) {
        keyboard[1][i].style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(displayOffset + (0.5 + i) * letterButtonWidth, newWindowHeight - 2 * letterButtonHeight);
      }
      for (let i = 0; i < keyboard[2].length; i++) {
        keyboard[2][i].style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(displayOffset + (1.5 + i) * letterButtonWidth, newWindowHeight - letterButtonHeight);
      }
      enterButton.style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(1.5 * letterButtonWidth, letterButtonHeight).position(displayOffset, newWindowHeight - letterButtonHeight);
      backspaceButton.style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(1.5 * letterButtonWidth, letterButtonHeight).position(displayOffset + 8.5 * letterButtonWidth, newWindowHeight - letterButtonHeight);
    }
    for (let j = 0; j < keyboard.length; j++) {
      const indexOffset = (j > 0 ? keyboard[0].length + (j > 1 ? keyboard[1].length : 0) : 0);
      for (let i = 0; i < keyboard[j].length; i++) {
        keyboard[j][i].style('background-color', keyboardColors[i + indexOffset]);
      }
    }
  }
  else {
    if (refreshStats) {
      stroke(0);
      textSize(3 * screenDivision);
      text("STATISTICS", width / 2, 10 * screenDivision);
      textSize(4 * screenDivision);
      text(gamesPlayed, width / 5, 16 * screenDivision);
      text(round(100 * gamesWon / max(gamesPlayed, 1)), 2 * width / 5, 16 * screenDivision);
      text(currentStreak, 3 * width / 5, 16 * screenDivision);
      text(maxStreak, 4 * width / 5, 16 * screenDivision);
      textSize(2 * screenDivision);
      text("Played", width / 5, 20 * screenDivision);
      text("Win %", 2 * width / 5, 20 * screenDivision);
      text("Current", 3 * width / 5, 20 * screenDivision);
      text("Streak", 3 * width / 5, 22 * screenDivision);
      text("Max", 4 * width / 5, 20 * screenDivision);
      text("Streak", 4 * width / 5, 22 * screenDivision);
      textSize(3 * screenDivision);
      text("GUESS DISTRIBUTION", width / 2, 28 * screenDivision);
      textSize(2 * screenDivision);
      let mode = 0;
      let guessDistribution = Array.from({length: maxGuesses}, () => (0)); //could use a different array construction method due to not filling with an object and hence not needing to ensure objects are distinct, but went with this method for stylistic consistency
      for (let i = 0; i < maxGuesses; i++) {
        guessDistribution[gameState.games[i].previousGuesses.length - 1] += (gameState.games[i].dateCompleted !== undefined);
      }
      for (let i = 0; i < maxGuesses; i++) {
        text(i + 1, (22.5 + i * 5) * screenDivision, 46 * screenDivision);
        mode = max(mode, guessDistribution[i]);
      }
      for (let i = 0; i < maxGuesses; i++) {
        fill((i + 1 === gameState.games[todayIndex].previousGuesses.length ? "green" : 63));
        rect((21.5 + i * 5) * screenDivision, 44 * screenDivision, 2 * screenDivision, -guessDistribution[i] / max(mode, 1) * 12 * screenDivision);
        fill(255);
        text(guessDistribution[i], (22.5 + i * 5) * screenDivision, (43 - guessDistribution[i] / max(mode, 1) * 12) * screenDivision);
      }
      if (gameState.games[todayIndex].dateCompleted !== undefined && gamesPlayed !== gameState.games.length) {
        textSize(3 * screenDivision);
        text("NEXT DAILY", width / 2, 52 * screenDivision);
        textSize(4.5 * screenDivision);
      }
      else if (gamesPlayed === gameState.games.length) {
        textSize(3 * screenDivision);
        const congratulationsText = "Congratulations, you have completed Wordle Rx! Use the blue button on the right to copy your final results for sharing. The game will automatically be reset in thirty-two days after the last completed game.";
        text(congratulationsText, 0, 45 * screenDivision, width, height / 3);
        textSize(4.5 * screenDivision);
      }
    }
    if (gameState.games[todayIndex].dateCompleted !== undefined && gamesPlayed !== gameState.games.length) {
      let offset = 0;
      for (; offset < gameState.games.length && gameState.games[(todayIndex + offset) % gameState.games.length].dateCompleted === undefined; offset++) {} //because the number of played games does not equal the number of playable games, offset here will never be set to the number of playable games
      const now = new Date();
      now.setHours(24, 0, 0, 0);
      createCountdownTimerGUI(now.setDate(now.getDate() + offset) - (new Date()).getTime(), 58 * screenDivision, screenDivision);
    }
    else if (gamesPlayed === gameState.games.length) { //resetPoint will have been set if gamesPlayed === gameState.games.length
      createCountdownTimerGUI(resetPoint - (new Date()).getTime(), height - 2 * screenDivision, screenDivision);
    }
  }
  switch (justEndedGameLoopCount) {
    case 0:
      setStatsGUI(screenDivision, newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight);
      break;
    case 1:
      toggleStats();
      statsButton.mousePressed(toggleStats).mouseOver(statsMouseOver).mouseOut(statsMouseOut); //re-enable statsButton interactions
      frameRate(floor(maxFrameRate)); //reset frame rate to an optimistic approximation
      setStatsGUI(screenDivision, newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight);
      justEndedGameLoopCount--;
      break;
    default:
      statsButton.mousePressed(emptyFunction).mouseOver(false).mouseOut(false); //disable statsButton interaction during countdown/"animation"
      justEndedGameLoopCount--;
      break;
  }
  if (newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
    lastWindowWidth = newWindowWidth;
    lastWindowHeight = newWindowHeight;
  }
  const now = new Date();
  todayIndex = (new Date(now)).getDay(); //updated at the end of the loop for being initialized before first iteration of the draw loop/function
  if (gamesPlayed === answers.length && resetPoint - (new Date(now)).getTime() < 0) { //if resetPoint is undefined, the subtraction becomes NaN which equivalates to false any way it is compared to zero
    resetPoint = undefined;
    resetLocalStorage();
  }
}


function clearRelevantLocalStorage() {
  window.alert("Properties of game state local storage did not match expected attributes, so clearing all saved local storage game data.");
  removeItem('wordle-rx-state');
  removeItem('wordle-rx-statep5TypeID');
}


function resetLocalStorage() {
  gameState = {
    ID: Math.floor(Math.random() * 10 ** 12), //ID is one in a trillion
    games: [], //at the index indicating the day, contains a map of the final state of the unsubmitted guess and the previous guesses as well as the date the game was completed (if it was completed)
  };
  gameState.games = Array.from({length: answers.length}, () => ({guess: "", previousGuesses: []}));
}


function createCountdownTimerGUI(millisecondsUntilNextPlayableGame, y, screenDivision) {
  const secondsUntilNextPlayableGame = Math.floor(millisecondsUntilNextPlayableGame / 1000);
  if (secondsUntilNextPlayableGame !== lastSecondsUntilNextPlayableGame || refreshStats) { //lastSecondsUntilNextPlayableGame is initially undefined
    refreshStats = false;
    lastSecondsUntilNextPlayableGame = secondsUntilNextPlayableGame;
    const countdownHours = Math.floor(secondsUntilNextPlayableGame / 3600);
    const countdownMinutes = Math.floor((secondsUntilNextPlayableGame / 60) % 60);
    const countdownSeconds = secondsUntilNextPlayableGame % 60;
    //future consideration: bugfix slight size increase of countdown timer upon opening the stats page
    fill(0);
    rect(0, y - 2.25 * screenDivision, width, 4.5 * screenDivision)
    fill(255);
    text((countdownHours < 10 ? (countdownHours < 1 ? "00" : "0" + countdownHours) : countdownHours) + ":" + (countdownMinutes < 10 ? (countdownMinutes < 1 ? "00" : "0" + countdownMinutes) : countdownMinutes) + ":" + (countdownSeconds < 10 ? (countdownSeconds < 1 ? "00" : "0" + countdownSeconds) : countdownSeconds), width / 2, y);
  }
}


function setStatsGUI(screenDivision, scaleChanged) {
  if (scaleChanged) {
    statsButton.style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').size(additionalScreenDivisionsForStatsButton * screenDivision, additionalScreenDivisionsForStatsButton * screenDivision).position(displayOffset + width - additionalScreenDivisionsForStatsButton * screenDivision, 0);
    clipboardButton.style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').size(18 * screenDivision, 10 * screenDivision).position(displayOffset + width / 2 - 18 * screenDivision, height);
    cumulativeStatsButton.style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').size(18 * screenDivision, 10 * screenDivision).position(displayOffset + width / 2, height);
  }
}


function updateColorsForClipboardAndGUI(guess, guessIndex, isWinningGuess = false) {
  colorsForCopying.push([]);
  if (isWinningGuess) {
    for (let i = 0; i < wordLength; i++) {
      colors[guessIndex][i] = color(0, 127, 0);
      colorsForCopying[guessIndex].push("🟩");
      keyboardColors[qwertyKeysToIndices[guess[i]]] = color(0, 127, 0);
    }
  }
  else {
    let guessCharactersBag = guess;
    let answerCharactersBag = answers[todayIndex];
    let matchedIndices = [];
    for (let i = 0; i < wordLength; i++) {
      if (guess[i] === answers[todayIndex][i]) {
        colors[guessIndex][i] = color(0, 127, 0);
        colorsForCopying[guessIndex].push("🟩");
        keyboardColors[qwertyKeysToIndices[guess[i]]] = color(0, 127, 0);
        matchedIndices.push(i);
        guessCharactersBag = guessCharactersBag.replace(guess[i], "");
        answerCharactersBag = answerCharactersBag.replace(guess[i], "");
      }
      else {
        colors[guessIndex][i] = color(63);
        colorsForCopying[guessIndex].push("⬛");
      }
    }
    for (let i = 0; i < wordLength; i++) {
      if (!matchedIndices.includes(i) && answerCharactersBag.includes(guess[i])) {
        colors[guessIndex][i] = color(127, 127, 0);
        colorsForCopying[guessIndex][i] = "🟨";
        if (keyboardColors[qwertyKeysToIndices[guess[i]]].toString() !== color(0, 127, 0).toString()) {
          keyboardColors[qwertyKeysToIndices[guess[i]]] = color(127, 127, 0);
        }
        guessCharactersBag = guessCharactersBag.replace(guess[i], "");
        answerCharactersBag = answerCharactersBag.replace(guess[i], "");
      }
    }
    for (const g of guessCharactersBag) {
      if (keyboardColors[qwertyKeysToIndices[g]].toString() !== color(0, 127, 0).toString() && keyboardColors[qwertyKeysToIndices[g]].toString() !== color(127, 127, 0).toString()) {
        keyboardColors[qwertyKeysToIndices[g]] = color(63);
      }
    }
  }
}


function determineResetPoint() {
  if (gameState.games.length === answers.length) {
    for (const game of gameState.games) {
      if (game.dateCompleted === undefined) {
        return;
      }
    }
    resetPoint = (new Date()).setDate((new Date()).getDate() + 32).getTime();
  }
}


function completedDaily(won) {
  determineResetPoint();
  gameState.games[todayIndex].dateCompleted = (new Date()).toDateString().substring(4); //it's irrelevant if the date has changed since todayIndex was last set because the purpose of dateCompleted is only ever to check whether a certain amount of time has passed
  gamesWon += won;
  gamesPlayed++;
  currentStreak = (won ? currentStreak + 1 : 0);
  maxStreak = max(maxStreak, currentStreak);
}


function submitGuess() {
  if (gameState.games[todayIndex].guess.length === wordLength) {
    if (validWords.includes(gameState.games[todayIndex].guess)) {
      const guessMatchesAnswer = (gameState.games[todayIndex].guess === answers[todayIndex]);
      updateColorsForClipboardAndGUI(gameState.games[todayIndex].guess, gameState.games[todayIndex].previousGuesses.length, guessMatchesAnswer);
      gameState.games[todayIndex].previousGuesses.push(gameState.games[todayIndex].guess);
      gameState.games[todayIndex].guess = "";
      //future consideration: show word-submitted animation
      if (guessMatchesAnswer) { //won
        completedDaily(true);
      }
      else if (gameState.games[todayIndex].previousGuesses.length === maxGuesses) { //lost
        completedDaily(false);
        popups.push({ [answers[todayIndex]] : Date.now() });
      }
      refreshSquares = true;
    }
    else {
      popups.push({ "Not in word list" : Date.now() });
      //future consideration: show not-in-word-list error animation
    }
  }
  else {
      popups.push({ "Not enough letters" : Date.now() });
    //future consideration: show not-enough-letters error animation
  }
}


function removeLetterFromGuess() {
  gameState.games[todayIndex].guess = gameState.games[todayIndex].guess.substring(0, gameState.games[todayIndex].guess.length - 1);
  saveState();
  refreshSquares = true;
}


function saveState() {
  storeItem('wordle-rx-state', gameState);
  if (!gamesPlayed && !gameState.games[todayIndex].previousGuesses.length && !gameState.games[todayIndex].guess.length && getItem('wordle-rx-state') !== null) {
    removeItem('wordle-rx-state');
    removeItem('wordle-rx-statep5TypeID');
  }
}


function keyPressed() {
  switch (keyCode) {
    case ENTER:
    case RETURN:
      if (!stats && !gameOver) {
        submitGuess();
        saveState();
      }
      break;
    case BACKSPACE:
      if (!stats && !gameOver) {
        removeLetterFromGuess();
        saveState();
      }
      break;
    case ESCAPE:
      if (stats) {
        toggleStats();
      }
      break;
  }
}


function pressedKey(key) {
  if (!stats && !gameOver) {
    if (gameState.games[todayIndex].guess.length < wordLength) {
      gameState.games[todayIndex].guess += key.toUpperCase();
      //future consideration: show letter-appended-to-guess animation
      saveState();
    }
    refreshSquares = true;
  }
}


function keyTyped(k) {
  switch (key) {
    case 'a':
    case 'b':
    case 'c':
    case 'd':
    case 'e':
    case 'f':
    case 'g':
    case 'h':
    case 'i':
    case 'j':
    case 'k':
    case 'l':
    case 'm':
    case 'n':
    case 'o':
    case 'p':
    case 'q':
    case 'r':
    case 's':
    case 't':
    case 'u':
    case 'v':
    case 'w':
    case 'x':
    case 'y':
    case 'z':
    case 'A':
    case 'B':
    case 'C':
    case 'D':
    case 'E':
    case 'F':
    case 'G':
    case 'H':
    case 'I':
    case 'J':
    case 'K':
    case 'L':
    case 'M':
    case 'N':
    case 'O':
    case 'P':
    case 'Q':
    case 'R':
    case 'S':
    case 'T':
    case 'U':
    case 'V':
    case 'W':
    case 'X':
    case 'Y':
    case 'Z':
      if (!stats && !gameOver) {
        pressedKey(key);
      }
      break;
    default:
      switch (k) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
          if (!stats && !gameOver) {
            pressedKey(k);
          }
          break;
      }
      break;
  }
}


function toggleStats() {
  stats = !stats;
  refreshSquares = !stats;
  refreshStats = stats;
  lastWindowWidth = -1; //trigger resize of elements
  lastWindowHeight = -1; //trigger resize of elements; redundant
  statsButton.html((stats ? "x" : "Stats"));
  clipboardButton.style('display', (stats && gameOver ? '' : 'none'));
  cumulativeStatsButton.style('display', (stats && gameOver ? '' : 'none'));
  for (let i = 0; i < keyboard.length; i++) {
    for (let j = 0; j < keyboard[i].length; j++) {
      keyboard[i][j].style('display', (stats ? 'none' : ''));
    }
  }
  enterButton.style('display', (stats ? 'none' : ''));
  backspaceButton.style('display', (stats ? 'none' : ''));
}


function statsMouseOver() {
  statsButton.style('background-color', color(63));
}


function statsMouseOut() {
  statsButton.style('background-color', color(0));
}


function emptyFunction() {}


function setClipboard(text) {
  let temp = document.createElement("textarea");
  document.body.appendChild(temp);
  temp.value = text;
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
}


function copyDaily() { //inspired by https://www.codegrepper.com/code-examples/html/p5.js+copy+value+to+clipboard
  clipboardButton.style('background-color', color(0, 63, 255)); //reset button background color to indicate button was pressed
  let colorsJoined = "";
  for (const c of colorsForCopying) {
    colorsJoined += c.join("") + "\r\n";
  }
  setClipboard("Wordle Rx  #" + (todayIndex + 1) + "  " + (gameState.games[todayIndex].previousGuesses.slice(-1)[0] === answers[todayIndex] ? gameState.games[todayIndex].previousGuesses.length : "X") + "/" + maxGuesses + "\r\nanderjef.github.io/Wordle-Rx\r\n" + colorsJoined);
  window.alert("Results copied to clipboard!");
}


function copyStats() { //inspired by https://www.codegrepper.com/code-examples/html/p5.js+copy+value+to+clipboard
  cumulativeStatsButton.style('background-color', color(0, 63, 255)); //reset button background color to indicate button was pressed
  let mean = 0;
  let guessCountsSorted = [];
  let modeTempArray = Array.from({length: gameState.games.length}, () => (0)); //could use a different array construction method due to not filling with an object and hence not needing to ensure objects are distinct, but went with this method for stylistic consistency
  let scores = []; //"x" for unattempted, "X" for failed attempt, one more than how many guesses were taken with "+" appended for started but incomplete games, or how many guesses it took
  for (let i = 0; i < gameState.games.length; i++) {
    if (gameState.games[i].previousGuesses.length && gameState.games[i].previousGuesses.slice(-1)[0] === answers[i]) {
      mean += gameState.games[i].previousGuesses.length;
      scores.push(gameState.games[i].previousGuesses.length);
      guessCountsSorted.push(gameState.games[i].previousGuesses.length);
      modeTempArray[gameState.games[i].previousGuesses.length - 1]++;
    }
    else if (gameState.games[i].previousGuesses.length) {
      scores.push((gameState.games[i].previousGuesses.length === maxGuesses ? "X" : gameState.games[i].previousGuesses.length + "+"));
    }
    else {
      scores.push("x");
    }
  }
  mean /= gamesWon;
  mean.toFixed(2);
  guessCountsSorted.sort(function(a, b) { return a - b; });
  guessCountsSorted.concat(new Array(gamesPlayed - gamesWon).fill("X"));
  let median = (gamesPlayed ? "X" : undefined);
  if (guessCountsSorted.length) {
    if (guessCountsSorted.length % 2 === 0) {
      const leftMiddle = guessCountsSorted[guessCountsSorted.length / 2 - 1];
      const rightMiddle = guessCountsSorted[guessCountsSorted.length / 2];
      if (leftMiddle === "X" && rightMiddle === "X") {
        median = "X";
      }
      else if (leftMiddle === "X") { //given that the array was sorted numerically ascending (left to right), this condition shouldn't occur, but is here for clarification
        median = (rightMiddle + maxGuesses) / 2 + "+"; //averaged with maxGuesses because had the number of guesses not been constrained, the best the player could have done would be to have guessed the word on the next guess
      }
      else if (rightMiddle === "X") {
        median = (leftMiddle + maxGuesses) / 2 + "+"; //averaged with maxGuesses because had the number of guesses not been constrained, the best the player could have done would be to have guessed the word on the next guess
      }
      else {
        median = (leftMiddle + rightMiddle) / 2;
      }
    }
    else {
      median = guessCountsSorted[(guessCountsSorted.length - 1) / 2];
    }
  }
  let modeCount = 0;
  for (const i of modeTempArray) {
    modeCount = max(modeCount, i);
  }
  let mode = [];
  if (modeCount) {
    for (let i = 0; i < modeTempArray.length; i++) {
      if (modeTempArray[i] === modeCount) {
        mode.push(i + 1);
      }
    }
    if (gamesPlayed - gamesWon === modeCount) {
      mode.push("X"); //append the count of the loss condition (if necessary)
    }
  }
  setClipboard("Wordle Rx  " + gamesPlayed + "/" + gameState.games.length + "\r\nanderjef.github.io/Wordle-Rx\r\nID: " + gameState.ID + "\r\nHash: " + hashCode(gameState.ID + "\r\n" + scores) + "\r\nMax streak: " + maxStreak + "\r\nMean (successful): " + (mean ? mean : "N/A") + "\r\nMedian (completed): " + (median ? median : "N/A") + "\r\nMode (completed): " + (mode.length ? mode : "N/A") + "\r\nScores: " + scores);
  window.alert("Stats copied to clipboard!");
}


function hashCode(str) { //inspired by https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
  }
  return hash;
}


function blueButtonMouseOver() {
  this.style('background-color', color(63, 127, 255));
}


function blueButtonMouseOut() {
  this.style('background-color', color(0, 63, 255));
}
