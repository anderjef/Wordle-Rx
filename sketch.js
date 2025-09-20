'use strict';

const wordLength = 5;
const maxGuesses = 7;
const numScreenDivisions = 70;
const canvasWindowWidthMultiplier = 1, canvasWindowHeightMultiplier = 7 / 10;
let validWords;
let answers;
let answers1;
let answers2;
let gameState;
let maxFrameRate = 1.25;
const qwertyKeysToIndices = {
  Q: 0,
  W: 1,
  E: 2,
  R: 3,
  T: 4,
  Y: 5,
  U: 6,
  I: 7,
  O: 8,
  P: 9,
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
const numKeyboardRows = 3;
const keyboardRowIndexToNumLetterKeys = {
  0: 10,
  1: 9,
  2: 7,
};
const keyboardRowsLeftOffset = {
  0: 0,
  1: 0.5,
  2: 1.5,
};
const indicesToQwertyKeys = {
  0: 'Q',
  1: 'W',
  2: 'E',
  3: 'R',
  4: 'T',
  5: 'Y',
  6: 'U',
  7: 'I',
  8: 'O',
  9: 'P',
  10: 'A',
  11: 'S',
  12: 'D',
  13: 'F',
  14: 'G',
  15: 'H',
  16: 'J',
  17: 'K',
  18: 'L',
  19: 'Z',
  20: 'X',
  21: 'C',
  22: 'V',
  23: 'B',
  24: 'N',
  25: 'M',
};
let lastWindowWidth, lastWindowHeight;
let refreshSquares = true;
let lastSecondsUntilNextPlayableGame;
let refreshStats = false;
let canvas;
let displayOffset = 0;
const palette = {};
const victoryPopups = ["Ace", "Eagle", "Birdie", "Par", "Bogey", "Double Bogey", "Close One"];
console.assert(victoryPopups.length === maxGuesses);

let colors;
const colorsForCopying = [];
const popups = [];
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

let darkModeButton;
let contrastButton;
let statsButton;
let clipboardButton;
let cumulativeStatsButton;
const keyboard = [];
let enterButton;
let backspaceButton;


function preload() {
  validWords = loadStrings("valid words.txt"); //all words must be exactly wordLength long
  answers1 = loadStrings("answers1.txt");
  answers2 = loadStrings("answers2.txt");
}


function setup() {
  if (document.URL.startsWith("blob:https://preview.p5js.org/")) {
    window.open(document.URL);
  }
  lastWindowWidth = windowWidth;
  lastWindowHeight = windowHeight;
  displayOffset = lastWindowWidth / 2 - min(canvasWindowWidthMultiplier * lastWindowWidth, canvasWindowHeightMultiplier * lastWindowHeight) / 2;
  canvas = createCanvas(min(canvasWindowWidthMultiplier * lastWindowWidth, canvasWindowHeightMultiplier * lastWindowHeight), min(canvasWindowWidthMultiplier * lastWindowWidth, canvasWindowHeightMultiplier * lastWindowHeight)) //the canvas size here is a decent starting approximation to be corrected slightly if the display area is tall enough relative to its width to fill the gap between the canvas bottom and the top of the on-screen keyboard
    .position(displayOffset);
  const screenDivision = width / numScreenDivisions;
  const letterButtonHeight = min(width / 6, (lastWindowHeight - height) / 3);
  const letterButtonWidth = max(width / keyboardRowIndexToNumLetterKeys[0], (canvasWindowWidthMultiplier * lastWindowWidth <= width ? 0 : min(lastWindowWidth / keyboardRowIndexToNumLetterKeys[0], letterButtonHeight * 3 / 4)));
  fillCanvasToSpace(letterButtonHeight);
  const now = new Date();
  todayIndex = ((new Date(now)).getDay() + (7 - (0 < now.getMonth() && now.getMonth() < 7 ? (new Date(now.getFullYear(), 4, 6)).getDay() : 0))) % 7;
  validWords += answers1;
  validWords += answers2;
  answers = (0 < now.getMonth() && now.getMonth() < 7 ? answers2 : answers1);
  palette.green = color(0, 127, 0);
  palette.blue = color("blue");
  palette.yellow = color(159, 159, 0);
  palette.orange = color("orange");
  palette.red = color(127, 0, 0);
  palette.darkBlue = color(0, 63, 255);
  palette.lightBlue = color(63, 127, 255);
  palette.white = color("white");
  palette.black = color("black");
  palette.gray = color("gray");
  keyboardColors = Array.from({ length: 26 }, () => (palette.gray)); //26 letters in the alphabet
  gameState = getItem('wordle-rx-state'); //TODO: rename 'mode' attribute to 'theme'
  const expectedAttributes = (gameState !== null && ((Object.keys(gameState).includes('ID') && Object.keys(gameState).includes('games') && Object.keys(gameState).includes('mode') && Object.keys(gameState).includes('contrast') && Object.keys(gameState).length === 4) || (Object.keys(gameState).includes('ID') && Object.keys(gameState).includes('games') && Object.keys(gameState).length === 2))); //ORed with a condition that permits for backwards compatibility with no dark-light or (high-low) contrast modes
  if (!expectedAttributes) {
    if (gameState !== null) {
      clearRelevantLocalStorage();
    }
    resetLocalStorage();
    colors = Array.from({ length: maxGuesses }, () => (Array.from({ length: wordLength }, () => ((gameState.mode ? palette.black : palette.white)))));
  }
  else {
    if (gameState.mode === undefined) { //for backwards compatibility with no dark/light mode distinction
      gameState.mode = true;
    }
    if (gameState.contrast === undefined) { //for backwards compatibility with no (high/low) contrast mode distinction
      gameState.contrast = false;
    }
    colors = Array.from({ length: maxGuesses }, () => (Array.from({ length: wordLength }, () => ((gameState.mode ? palette.black : palette.white)))));
    if (gameState.games[todayIndex].guess || gameState.games[todayIndex].previousGuesses.length) {
      for (let i = 0; i < gameState.games[todayIndex].previousGuesses.length; i++) {
        updateColorsForClipboardAndGUI(gameState.games[todayIndex].previousGuesses[i], i);
      }
    }
    for (let i = 0; i < gameState.games.length; i++) {
      const hasDateCompleted = gameState.games[i].dateCompleted !== undefined;
      if (hasDateCompleted && gameState.games[i].previousGuesses.length && gameState.games[i].previousGuesses.length < maxGuesses && gameState.games[i].previousGuesses.slice(-1)[0] !== answers[i]) { //backwards compatibility of giving extra guesses for completed games when maxGuesses is increased
        gameState.games[i].dateCompleted = undefined;
      }
      gamesPlayed += hasDateCompleted;
      gamesWon += (hasDateCompleted && gameState.games[i].previousGuesses.slice(-1)[0] === answers[i]);
    }
    let gamesSortedByCompletion = structuredClone(gameState.games);
    for (let i = 0; i < gamesSortedByCompletion.length; i++) {
      gamesSortedByCompletion[i].gameIndex = i; //for later comparing the final guess to the correct answer in the list of answers
    }
    gamesSortedByCompletion.sort(function (a, b) {
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
  const letterSpaceMultiplier = min(numScreenDivisions / wordLength - 1, (7 / 8 * height / screenDivision) / maxGuesses - 1);
  const gameLetterSize = 0.7 * (letterSpaceMultiplier - 1);
  darkModeButton = createButton((gameState.mode ? "\u263C" : "\u263E"))
    .mousePressed(toggleDarkMode)
    .mouseOver(blackButtonMouseOver)
    .mouseOut(blackButtonMouseOut)
    .style('border-radius', (2 * screenDivision) + 'px')
    .style('font-size', ((1.2 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2) + 'pt')
    .style('touch-action', 'manipulation')
    .style('border', 'none')
    .style('color', (gameState.mode ? palette.white : palette.black))
    .style('background-color', (gameState.mode ? palette.black : palette.white))
    .size((1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2, (3 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2)
    .position(displayOffset + 0 * (1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2), 0);
  contrastButton = createButton((gameState.contrast ? "\u25D0" : "\u25D1"))
    .mousePressed(toggleContrast)
    .mouseOver(blackButtonMouseOver)
    .mouseOut(blackButtonMouseOut)
    .style('border-radius', (2 * screenDivision) + 'px')
    .style('font-size', ((1.2 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2) + 'pt')
    .style('touch-action', 'manipulation')
    .style('border', 'none')
    .style('color', (gameState.mode ? palette.white : palette.black))
    .style('background-color', (gameState.mode ? palette.black : palette.white))
    .size((1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2, (3 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2)
    .position(displayOffset + 0.5 * (1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2), 0);
  statsButton = createImg("assets/" + (stats ? (gameState.mode ? "bar_chart_inverted" : "bar_chart") : (gameState.mode ? "bar_chart_filled_inverted" : "bar_chart_filled")) + ".ico", (stats ? "Return to game" : "See statistics"))
    .mousePressed(toggleStats)
    .mouseOver(blackButtonMouseOver)
    .mouseOut(blackButtonMouseOut)
    .style('border-radius', (2 * screenDivision) + 'px')
    .style('touch-action', 'manipulation')
    .style('border', 'none')
    .style('color', (gameState.mode ? palette.white : palette.black))
    .style('background-color', (gameState.mode ? palette.black : palette.white))
    .size(1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2, 1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2)
    .position(displayOffset + width - 1 * (1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2), 0);
  clipboardButton = createButton("Copy to clipboard")
    .mousePressed(copyDaily)
    .mouseOver(blueButtonMouseOver)
    .mouseOut(blueButtonMouseOut)
    .style('color', palette.white)
    .style('background-color', palette.darkBlue)
    .style('display', (stats && gameOver ? '' : 'none'))
    .style('border-radius', (2 * screenDivision) + 'px')
    .style('font-size', (3 / 4 * (10 * screenDivision) / 4) + 'pt')
    .style('touch-action', 'manipulation')
    .size(18 * screenDivision, 10 * screenDivision)
    .position(displayOffset + width / 2 - 18 * screenDivision, height);
  cumulativeStatsButton = createButton("Copy to-date weekly stats")
    .mousePressed(copyStats)
    .mouseOver(blueButtonMouseOver)
    .mouseOut(blueButtonMouseOut)
    .style('color', palette.white)
    .style('background-color', palette.darkBlue)
    .style('display', (stats && gameOver ? '' : 'none'))
    .style('border-radius', (2 * screenDivision) + 'px')
    .style('font-size', (3 / 4 * (10 * screenDivision) / 4) + 'pt')
    .style('touch-action', 'manipulation')
    .size(18 * screenDivision, 10 * screenDivision)
    .position(displayOffset + width / 2, height);
  for (let i = 0, keyIndex = 0; i < numKeyboardRows; i++) {
    keyboard.push([]);
    for (let j = 0; j < keyboardRowIndexToNumLetterKeys[i]; j++) {
      keyboard[i].push(
        createButton(indicesToQwertyKeys[keyIndex])
          .style('background-color', keyboardColors[keyIndex])
          .position(displayOffset + (canvasWindowWidthMultiplier * lastWindowWidth <= width ? 0 : (width - keyboardRowIndexToNumLetterKeys[0] * letterButtonWidth) / 2) + (keyboardRowsLeftOffset[i] + j) * letterButtonWidth, lastWindowHeight - (3 - i) * letterButtonHeight));
      keyIndex++;
    }
  }
  for (let i = 0; i < 10; i++) {
    keyboard[0][i].mousePressed(function () { keyTyped(this.elt.innerText); });
  }
  for (let i = 0; i < 9; i++) {
    keyboard[1][i].mousePressed(function () { keyTyped(this.elt.innerText); });
  }
  for (let i = 0; i < 7; i++) {
    keyboard[2][i].mousePressed(function () { keyTyped(this.elt.innerText); });
  }
  const keyboardFontSize = min((3 / 8 * gameLetterSize * screenDivision), 0.4 * letterButtonWidth) + 'pt'; //capping font size at 0.4 * letterButtonWidth is to keep the Enter key's text from overflowing its button width
  for (let i = 0; i < keyboard.length; i++) {
    for (let j = 0; j < keyboard[i].length; j++) {
      keyboard[i][j]
        .style('color', palette.white)
        .style('border-radius', ceil(screenDivision) + 'px')
        .style('font-size', keyboardFontSize)
        .style('touch-action', 'manipulation')
        .size(letterButtonWidth, min(letterButtonHeight, (lastWindowHeight - height) / 3));
    }
  }
  enterButton = createButton("Enter")
    .mousePressed(submitGuess)
    .style('color', palette.white)
    .style('background-color', palette.gray)
    .style('border-radius', ceil(screenDivision) + 'px')
    .style('font-size', keyboardFontSize)
    .style('touch-action', 'manipulation')
    .size(1.5 * letterButtonWidth, letterButtonHeight)
    .position(displayOffset + (canvasWindowWidthMultiplier * lastWindowWidth <= width ? 0 : (width - keyboardRowIndexToNumLetterKeys[0] * letterButtonWidth) / 2), lastWindowHeight - letterButtonHeight);
  backspaceButton = createButton("←")
    .mousePressed(removeLetterFromGuess)
    .style('color', palette.white)
    .style('background-color', palette.gray)
    .style('border-radius', ceil(screenDivision) + 'px')
    .style('font-size', keyboardFontSize)
    .style('touch-action', 'manipulation')
    .size(1.5 * letterButtonWidth, letterButtonHeight)
    .position(displayOffset + (canvasWindowWidthMultiplier * lastWindowWidth <= width ? 0 : (width - keyboardRowIndexToNumLetterKeys[0] * letterButtonWidth) / 2) + 8.5 * letterButtonWidth, lastWindowHeight - letterButtonHeight);
  textAlign(CENTER, CENTER);
}


function draw() {
  const newWindowWidth = windowWidth;
  const newWindowHeight = windowHeight;
  if (newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
    displayOffset = newWindowWidth / 2 - min(canvasWindowWidthMultiplier * newWindowWidth, canvasWindowHeightMultiplier * newWindowHeight) / 2;
    resizeCanvas(min(canvasWindowWidthMultiplier * newWindowWidth, canvasWindowHeightMultiplier * newWindowHeight), min(canvasWindowWidthMultiplier * newWindowWidth, canvasWindowHeightMultiplier * newWindowHeight)); //the canvas size here is a decent starting approximation to be corrected slightly if the display area is tall enough relative to its width to fill the gap between the canvas bottom and the top of the on-screen keyboard
    fillCanvasToSpace(width / 6);
    canvas.position(displayOffset);
    refreshSquares = !stats;
    refreshStats = stats;
  }
  const screenDivision = width / numScreenDivisions;
  maxFrameRate = floor(max(maxFrameRate, frameRate())); //must be set before call to frameRate(1.25) in case game is loaded to a completed game state to avoid a perpetually low frame rate
  if (refreshSquares || refreshStats) {
    background((gameState.mode ? 0 : 255));
  }
  const letterSpaceMultiplier = min(numScreenDivisions / wordLength - 1, (7 / 8 * height / screenDivision) / maxGuesses - 1);
  const gameLetterSize = 0.7 * (letterSpaceMultiplier - 1);
  textSize(gameLetterSize * screenDivision);
  if (refreshSquares || refreshStats || newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
    stroke((gameState.mode ? 255 : 0));
    fill((gameState.mode ? 255 : 0));
    text("Wordle Rx", width / 2, gameLetterSize * screenDivision);
  }
  if (!stats) {
    if (((gameState.games[todayIndex].previousGuesses.length && gameState.games[todayIndex].previousGuesses.slice(-1)[0] === answers[todayIndex]) || gameState.games[todayIndex].previousGuesses.length === maxGuesses) && !gameOver) {
      gameOver = true;
      justEndedGameLoopCount = 2 + 2 * (gameState.games[todayIndex].previousGuesses.slice(-1)[0] !== answers[todayIndex] && popups.length); //extra time on loss for the user to read the answer popup
      frameRate(1.25); //found to be the only way to have the program show the game's end then the stats page shortly after (as opposed to a busy wait)
    }
    if (refreshSquares) {
      refreshSquares = false;
      strokeWeight(letterSpaceMultiplier * screenDivision / 20);
      for (let y = 0; y < maxGuesses; y++) {
        for (let x = 0; x < wordLength; x++) {
          stroke((y < gameState.games[todayIndex].previousGuesses.length ? colors[y][x] : (y === gameState.games[todayIndex].previousGuesses.length ? (gameState.games[todayIndex].guess.length !== wordLength ? (x < gameState.games[todayIndex].guess.length ? (gameState.mode ? 192 : 63) : (gameState.mode ? 92 : 163)) : (!validWords.includes(gameState.games[todayIndex].guess) ? palette.red : (gameState.mode ? 192 : 63))) : (gameState.mode ? 92 : 163))));
          fill(colors[y][x]);
          square(((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + x * (letterSpaceMultiplier + 1)) * screenDivision, (1.6 * gameLetterSize + y * (letterSpaceMultiplier + 1)) * screenDivision, letterSpaceMultiplier * screenDivision);
        }
      }
      strokeWeight(1);
      stroke((gameState.mode ? 255 : 0));
      fill((gameState.mode ? 255 : 0));
      for (let i = 0; i < gameState.games[todayIndex].previousGuesses.length; i++) {
        const y = (1.6 * gameLetterSize + letterSpaceMultiplier / 2 + i * (letterSpaceMultiplier + 1)) * screenDivision;
        for (let j = 0; j < wordLength; j++) {
          const x = ((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + letterSpaceMultiplier / 2 + j * (letterSpaceMultiplier + 1)) * screenDivision;
          text(gameState.games[todayIndex].previousGuesses[i][j], x, y);
        }
      }
    }
    stroke((gameState.games[todayIndex].guess.length === wordLength && !validWords.includes(gameState.games[todayIndex].guess) ? palette.red : (gameState.mode ? 255 : 0)));
    fill((gameState.games[todayIndex].guess.length === wordLength && !validWords.includes(gameState.games[todayIndex].guess) ? palette.red : (gameState.mode ? 255 : 0)));
    for (let i = 0; i < gameState.games[todayIndex].guess.length; i++) {
      const x = ((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + letterSpaceMultiplier / 2 + i * (letterSpaceMultiplier + 1)) * screenDivision;
      const y = (1.6 * gameLetterSize + letterSpaceMultiplier / 2 + gameState.games[todayIndex].previousGuesses.length * (letterSpaceMultiplier + 1)) * screenDivision;
      text(gameState.games[todayIndex].guess[i], x, y);
    }
    let numPopupsToDiscard = 0; //depends on popups being in order of decreasing age
    for (let i = 0; i < popups.length; i++) {
      const label = Object.keys(popups[i])[0];
      if (Date.now() - popups[i][label] > 1000) { //popups expire after 1000 milliseconds
        numPopupsToDiscard = i + 1;
      }
      else {
        stroke((gameState.mode ? 255 : 0));
        fill((gameState.mode ? 255 : 0));
        rect(width / 2 - 7 * screenDivision, (gameLetterSize + (i - numPopupsToDiscard + 1) * 6) * screenDivision, 14 * screenDivision, 4 * screenDivision, screenDivision / 2);
        stroke((gameState.mode ? 0 : 255));
        fill((gameState.mode ? 0 : 255));
        textSize(1.65 * screenDivision);
        text(label, width / 2, (gameLetterSize + 2 + (i - numPopupsToDiscard + 1) * 6) * screenDivision);
      }
    }
    if (numPopupsToDiscard > 0) {
      popups.splice(0, numPopupsToDiscard);
      refreshSquares = true;
    }
    if (newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
      const letterButtonHeight = min(width / 6, (newWindowHeight - height) / 3);
      const letterButtonWidth = max(width / keyboardRowIndexToNumLetterKeys[0], (canvasWindowWidthMultiplier * newWindowWidth <= width ? 0 : min(newWindowWidth / keyboardRowIndexToNumLetterKeys[0], letterButtonHeight * 3 / 4)));
      const keyboardFontSize = min((3 / 8 * gameLetterSize * screenDivision), 0.4 * letterButtonWidth) + 'pt'; //capping font size at 0.4 * letterButtonWidth is to keep the Enter key's text from overflowing its button width
      for (let i = 0; i < keyboard.length; i++) {
        for (let j = 0; j < keyboard[i].length; j++) {
          keyboard[i][j]
            .style('border-radius', ceil(screenDivision) + 'px')
            .style('font-size', keyboardFontSize)
            .size(letterButtonWidth, min(letterButtonHeight, (newWindowHeight - height) / 3))
            .position(displayOffset + (canvasWindowWidthMultiplier * newWindowWidth <= width ? 0 : (width - keyboardRowIndexToNumLetterKeys[0] * letterButtonWidth) / 2) + (keyboardRowsLeftOffset[i] + j) * letterButtonWidth, newWindowHeight - (3 - i) * min(letterButtonHeight, (newWindowHeight - height) / 3));
        }
      }
      enterButton
        .style('border-radius', ceil(screenDivision) + 'px')
        .style('font-size', keyboardFontSize)
        .size(1.5 * letterButtonWidth, min(letterButtonHeight, (newWindowHeight - height) / 3))
        .position(displayOffset + (canvasWindowWidthMultiplier * newWindowWidth <= width ? 0 : (width - keyboardRowIndexToNumLetterKeys[0] * letterButtonWidth) / 2), newWindowHeight - min(letterButtonHeight, (newWindowHeight - height) / 3));
      backspaceButton
        .style('border-radius', ceil(screenDivision) + 'px')
        .style('font-size', keyboardFontSize)
        .size(1.5 * letterButtonWidth, min(letterButtonHeight, (newWindowHeight - height) / 3))
        .position(displayOffset + (canvasWindowWidthMultiplier * newWindowWidth <= width ? 0 : (width - keyboardRowIndexToNumLetterKeys[0] * letterButtonWidth) / 2) + 8.5 * letterButtonWidth, newWindowHeight - min(letterButtonHeight, (newWindowHeight - height) / 3));
    }
    for (let i = 0; i < keyboard.length; i++) {
      const indexOffset = (i > 0 ? keyboard[0].length + (i > 1 ? keyboard[1].length : 0) : 0);
      for (let j = 0; j < keyboard[i].length; j++) {
        keyboard[i][j].style('background-color', keyboardColors[j + indexOffset]);
      }
    }
  }
  else {
    const screenDivisionByHeight = height / numScreenDivisions;
    if (refreshStats) {
      stroke((gameState.mode ? 0 : 255));
      const letterSpaceMultiplier = min(numScreenDivisions / wordLength - 1, (7 / 8 * height / screenDivision) / maxGuesses - 1);
      const gameLetterSize = 0.7 * (letterSpaceMultiplier - 1);
      textSize(3 * screenDivisionByHeight);
      text("STATISTICS", width / 2, (gameLetterSize + 6) * screenDivisionByHeight);
      textSize(4 * screenDivisionByHeight);
      text(gamesPlayed, width / 5, (gameLetterSize + 12) * screenDivisionByHeight);
      text(round(100 * gamesWon / max(gamesPlayed, 1)), 2 * width / 5, (gameLetterSize + 12) * screenDivisionByHeight);
      text(currentStreak, 3 * width / 5, (gameLetterSize + 12) * screenDivisionByHeight);
      text(maxStreak, 4 * width / 5, (gameLetterSize + 12) * screenDivisionByHeight);
      textSize(2 * screenDivisionByHeight);
      text("Played", width / 5, (gameLetterSize + 16) * screenDivisionByHeight);
      text("Win %", 2 * width / 5, (gameLetterSize + 16) * screenDivisionByHeight);
      text("Current", 3 * width / 5, (gameLetterSize + 16) * screenDivisionByHeight);
      text("Streak", 3 * width / 5, (gameLetterSize + 18) * screenDivisionByHeight);
      text("Max", 4 * width / 5, (gameLetterSize + 16) * screenDivisionByHeight);
      text("Streak", 4 * width / 5, (gameLetterSize + 18) * screenDivisionByHeight);
      textSize(3 * screenDivisionByHeight);
      text("GUESS DISTRIBUTION", width / 2, (gameLetterSize + 24) * screenDivisionByHeight);
      textSize(2 * screenDivisionByHeight);
      let mode = 0;
      let guessDistribution = Array.from({ length: maxGuesses }, () => (0)); //could use a different array construction method due to not filling with an object and hence not needing to ensure objects are distinct, but went with this method for stylistic consistency
      for (let i = 0; i < answers.length; i++) {
        if (gameState.games[i].previousGuesses.length && gameState.games[i].previousGuesses.slice(-1)[0] === answers[i]) {
          guessDistribution[gameState.games[i].previousGuesses.length - 1] += (gameState.games[i].dateCompleted !== undefined);
        }
      }
      for (let i = 0; i < maxGuesses; i++) {
        text(i + 1, ((numScreenDivisions - 5 * (maxGuesses - 1)) / 2 + i * 5) * screenDivision, (gameLetterSize + 42) * screenDivisionByHeight);
        mode = max(mode, guessDistribution[i]);
      }
      for (let i = 0; i < maxGuesses; i++) {
        fill((i + 1 === gameState.games[todayIndex].previousGuesses.length ? (gameState.contrast ? palette.orange : palette.green) : (gameState.mode ? 63 : 192)));
        rect(((numScreenDivisions - 5 * (maxGuesses - 1)) / 2 - 1 + i * 5) * screenDivision, (gameLetterSize + 40) * screenDivisionByHeight, 2 * screenDivision, -guessDistribution[i] / max(mode, 1) * 12 * screenDivisionByHeight);
        fill((gameState.mode ? 255 : 0));
        text(guessDistribution[i], ((numScreenDivisions - 5 * (maxGuesses - 1)) / 2 + i * 5) * screenDivision, ((gameLetterSize + 39) - guessDistribution[i] / max(mode, 1) * 12) * screenDivisionByHeight);
      }
      if (gameState.games[todayIndex].dateCompleted !== undefined && gamesPlayed !== gameState.games.length) {
        textSize(3 * screenDivisionByHeight);
        text("NEXT DAILY", width / 2, (gameLetterSize + 48) * screenDivisionByHeight);
      }
      else if (gamesPlayed === gameState.games.length) {
        textSize(3 * screenDivisionByHeight);
        const congratulationsText = "Congratulations, you have completed Wordle Rx! Use the blue button on the right to copy your final results for sharing. The game will automatically be reset in thirty-two days after the last completed game.";
        text(congratulationsText, 0, (gameLetterSize + 41) * screenDivisionByHeight, width, height / 3);
      }
    }
    if (gameState.games[todayIndex].dateCompleted !== undefined && gamesPlayed !== gameState.games.length) {
      let offset = 0;
      for (; offset < gameState.games.length && gameState.games[(todayIndex + offset) % gameState.games.length].dateCompleted === undefined; offset++) { } //because the number of played games does not equal the number of playable games, offset here will never be set to the number of playable games
      const now = new Date();
      now.setHours(24, 0, 0, 0);
      createCountdownTimerGUI(now.setDate(now.getDate() + offset) - (new Date()).getTime(), (gameLetterSize + 54) * screenDivisionByHeight, screenDivisionByHeight);
    }
    else if (gamesPlayed === gameState.games.length) { //resetPoint will have been set if gamesPlayed === gameState.games.length
      createCountdownTimerGUI(resetPoint - (new Date()).getTime(), height - 2 * screenDivisionByHeight, screenDivisionByHeight);
    }
  }
  switch (justEndedGameLoopCount) {
    case 0:
      setStatsGUI(screenDivision, height / numScreenDivisions, gameLetterSize, letterSpaceMultiplier, newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight);
      break;
    case 1:
      toggleStats();
      statsButton //re-enable statsButton
        .mousePressed(toggleStats)
        .mouseOver(blackButtonMouseOver)
        .mouseOut(blackButtonMouseOut);
      frameRate(floor(maxFrameRate)); //reset frame rate to an optimistic approximation
      setStatsGUI(screenDivision, height / numScreenDivisions, gameLetterSize, letterSpaceMultiplier, newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight);
      justEndedGameLoopCount--;
      break;
    default:
      statsButton //disable statsButton during countdown/"animation"
        .mousePressed(function () { })
        .mouseOver(false)
        .mouseOut(false);
      justEndedGameLoopCount--;
      break;
  }
  if (newWindowWidth !== lastWindowWidth || newWindowHeight !== lastWindowHeight) {
    lastWindowWidth = newWindowWidth;
    lastWindowHeight = newWindowHeight;
  }
  const now = new Date();
  todayIndex = ((new Date(now)).getDay() + (7 - (0 < now.getMonth() && now.getMonth() < 7 ? (new Date(now.getFullYear(), 4, 6)).getDay() : 0))) % 7; //updated at the end of the loop for being initialized before first iteration of the draw loop/function
  if (gamesPlayed === answers.length && resetPoint - (new Date(now)).getTime() < 0) { //if resetPoint is undefined, the subtraction becomes NaN which equivalates to false any way it is compared to zero
    resetPoint = undefined;
    resetLocalStorage();
  }
}

/**
 * 
 * @param {int} letterButtonHeight The height of the letter buttons
 */
function fillCanvasToSpace(letterButtonHeight) {
  if (height < windowHeight - letterButtonHeight * 3) {
    resizeCanvas(width, windowHeight - letterButtonHeight * 3);
  }
}


/**
 * 
 * @param {boolean} [alert=true] Whether to show an alert regarding mismatched local storage data
 */
function clearRelevantLocalStorage(alert = true) {
  if (alert) {
    window.alert("Properties of game state local storage did not match expected attributes, so clearing all local storage Wordle Rx data.");
  }
  removeItem('wordle-rx-state');
  removeItem('wordle-rx-statep5TypeID');
}


function resetLocalStorage() {
  gameState = {
    ID: Math.floor(Math.random() * 10 ** 12), //ID is one in a trillion
    games: [], //at the index indicating the day, contains a map of the final state of the unsubmitted guess and the previous guesses as well as the date the game was completed (if it was completed)
    mode: true, //whether to use dark mode
    contrast: false, //whether to use high contrast
  };
  gameState.games = Array.from({ length: answers.length }, () => ({ guess: "", previousGuesses: [] }));
}


/**
 * 
 * @param {number} millisecondsUntilNextPlayableGame The number of milliseconds until the next playable game
 * @param {number} y The base y coordinate of the top left corner of the region to be occupied by the countdown timer, to be reduced by two screen division heights
 * @param {number} screenDivisionByHeight The height of a screen division
 */
function createCountdownTimerGUI(millisecondsUntilNextPlayableGame, y, screenDivisionByHeight) {
  const secondsUntilNextPlayableGame = Math.floor(millisecondsUntilNextPlayableGame / 1000);
  if (secondsUntilNextPlayableGame !== lastSecondsUntilNextPlayableGame || refreshStats) { //lastSecondsUntilNextPlayableGame is initially undefined
    refreshStats = false;
    lastSecondsUntilNextPlayableGame = secondsUntilNextPlayableGame;
    const countdownHours = Math.floor(secondsUntilNextPlayableGame / 3600);
    const countdownMinutes = Math.floor((secondsUntilNextPlayableGame / 60) % 60);
    const countdownSeconds = secondsUntilNextPlayableGame % 60;
    textSize(4.5 * screenDivisionByHeight);
    fill((gameState.mode ? 0 : 255));
    rect(0, y - 2 * screenDivisionByHeight, width, 4.5 * screenDivisionByHeight)
    fill((gameState.mode ? 255 : 0));
    text(`${countdownHours.toString().padStart(2, "0")}:${countdownMinutes.toString().padStart(2, "0")}:${countdownSeconds.toString().padStart(2, "0")}`, width / 2, y);
  }
}


/**
 * 
 * @param {int} screenDivision The width of a screen division
 * @param {number} screenDivisionByHeight The height of a screen division
 * @param {int} gameLetterSize The size of game letters, in screen divisions
 * @param {int} letterSpaceMultiplier A multiplier for the amount of space that letters are given, other than for the game title text
 * @param {boolean} scaleChanged Whether the scale has changed since the last time the stats GUI was styled
 */
function setStatsGUI(screenDivision, screenDivisionByHeight, gameLetterSize, letterSpaceMultiplier, scaleChanged) {
  if (scaleChanged) {
    const maxScreenDivision = max(screenDivision, screenDivisionByHeight);
    darkModeButton
      .style('color', (gameState.mode ? palette.white : palette.black))
      .style('background-color', (gameState.mode ? palette.black : palette.white))
      .style('border-radius', (2 * screenDivision) + 'px')
      .style('font-size', ((1.2 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2) + 'pt')
      .size((1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2, (3 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2)
      .position(displayOffset + 0 * (1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2), 0);
    contrastButton
      .style('color', (gameState.mode ? palette.white : palette.black))
      .style('background-color', (gameState.mode ? palette.black : palette.white))
      .style('border-radius', (2 * screenDivision) + 'px')
      .style('font-size', ((1.2 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2) + 'pt')
      .size((1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2, (3 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2) / 2)
      .position(displayOffset + 0.5 * (1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2), 0);
    statsButton
      .style('color', (gameState.mode ? palette.white : palette.black))
      .style('background-color', (gameState.mode ? palette.black : palette.white))
      .style('border-radius', (2 * screenDivision) + 'px')
      .size(1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2, 1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2)
      .position(displayOffset + width - 1 * (1.6 * gameLetterSize * screenDivision - letterSpaceMultiplier * screenDivision / 20 / 2), 0);
    clipboardButton
      .style('border-radius', (2 * maxScreenDivision) + 'px')
      .style('font-size', (3 / 4 * (10 * maxScreenDivision) / 4) + 'pt')
      .size(18 * maxScreenDivision, 10 * maxScreenDivision)
      .position(displayOffset + width / 2 - 18 * maxScreenDivision, height);
    cumulativeStatsButton
      .style('border-radius', (2 * maxScreenDivision) + 'px')
      .style('font-size', (3 / 4 * (10 * maxScreenDivision) / 4) + 'pt')
      .size(18 * maxScreenDivision, 10 * maxScreenDivision)
      .position(displayOffset + width / 2, height);
  }
}


/**
 * 
 * @param {string} guess The current guess
 * @param {int} guessIndex The index of the current guess
 * @param {boolean} [isWinningGuess=false] Whether the current guess matches the answer
 */
function updateColorsForClipboardAndGUI(guess, guessIndex, isWinningGuess = false) {
  colorsForCopying.push([]);
  if (isWinningGuess) {
    for (let i = 0; i < wordLength; i++) {
      colors[guessIndex][i] = (gameState.contrast ? palette.orange : palette.green);
      colorsForCopying[guessIndex].push("🟩");
      keyboardColors[qwertyKeysToIndices[guess[i]]] = (gameState.contrast ? palette.orange : palette.green);
    }
  }
  else {
    let guessCharactersBag = guess;
    let answerCharactersBag = answers[todayIndex];
    const matchedIndices = [];
    for (let i = 0; i < wordLength; i++) {
      if (guess[i] === answers[todayIndex][i]) {
        colors[guessIndex][i] = (gameState.contrast ? palette.orange : palette.green);
        colorsForCopying[guessIndex].push("🟩");
        keyboardColors[qwertyKeysToIndices[guess[i]]] = (gameState.contrast ? palette.orange : palette.green);
        matchedIndices.push(i);
        guessCharactersBag = guessCharactersBag.replace(guess[i], "");
        answerCharactersBag = answerCharactersBag.replace(guess[i], "");
      }
      else {
        colors[guessIndex][i] = (gameState.mode ? color(63) : color(192));
        colorsForCopying[guessIndex].push("⬛");
      }
    }
    for (let i = 0; i < wordLength; i++) {
      if (!matchedIndices.includes(i) && answerCharactersBag.includes(guess[i])) {
        colors[guessIndex][i] = (gameState.contrast ? palette.blue : palette.yellow);
        colorsForCopying[guessIndex][i] = "🟨";
        if (keyboardColors[qwertyKeysToIndices[guess[i]]].toString() !== (gameState.contrast ? palette.orange : palette.green).toString()) {
          keyboardColors[qwertyKeysToIndices[guess[i]]] = (gameState.contrast ? palette.blue : palette.yellow);
        }
        guessCharactersBag = guessCharactersBag.replace(guess[i], "");
        answerCharactersBag = answerCharactersBag.replace(guess[i], "");
      }
    }
    for (const g of guessCharactersBag) {
      if (keyboardColors[qwertyKeysToIndices[g]].toString() !== (gameState.contrast ? palette.orange : palette.green).toString() && keyboardColors[qwertyKeysToIndices[g]].toString() !== (gameState.contrast ? palette.blue : palette.yellow).toString()) {
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
    const now = new Date();
    const startOfOctober = new Date(now.getFullYear() + (now.getMonth() < 9 ? 0 : 1), 9, 1);
    const startOfApril = new Date(now.getFullYear() + (now.getMonth() < 3 ? 0 : 1), 3, 1);
    if (0 < startOfApril - now && startOfApril - now < 24 * 3600 * 1000 || 0 < startOfOctober - now && startOfOctober - now < 24 * 3600 * 1000) { //if the start of April or October is less than a day in the future
      resetPoint = (new Date()).setDate(now.getDate() + 32); //thirty-two days in the future
    }
    else {
      resetPoint = min((new Date(now.getFullYear() + (now.getMonth() < 3 ? 0 : 1), 3, 1)).getTime(), new Date(now.getFullYear() + (now.getMonth() < 9 ? 0 : 1), 9, 1).getTime()); //reset to the next beginning of the month of April or October (so as to reset at the beginning of either U.S. National Nurses Month or U.S. American Pharmacists Month or with plenty of time before either National Nurses Week in the second week of May or National Pharmacy Week in the third week of October)
    }
  }
}


/**
 * 
 * @param {boolean} won Whether the current game was won
 */
function completedDaily(won) {
  gameState.games[todayIndex].dateCompleted = (new Date()).toDateString().slice(4); //it is irrelevant if the date has changed since todayIndex was last set because the purpose of dateCompleted is only ever to check whether a certain amount of time has passed
  gamesWon += won;
  gamesPlayed++;
  currentStreak = (won ? currentStreak + 1 : 0);
  maxStreak = max(maxStreak, currentStreak);
  determineResetPoint();
}


function submitGuess() {
  if (gameState.games[todayIndex].guess.length === wordLength) {
    if (validWords.includes(gameState.games[todayIndex].guess)) {
      const guessMatchesAnswer = (gameState.games[todayIndex].guess === answers[todayIndex]);
      updateColorsForClipboardAndGUI(gameState.games[todayIndex].guess, gameState.games[todayIndex].previousGuesses.length, guessMatchesAnswer);
      gameState.games[todayIndex].previousGuesses.push(gameState.games[todayIndex].guess);
      gameState.games[todayIndex].guess = "";
      //TODO: word-submitted animation
      if (guessMatchesAnswer) { //won
        completedDaily(true);
        popups.push({ [victoryPopups[gameState.games[todayIndex].previousGuesses.length - 1]]: Date.now() });
      }
      else if (gameState.games[todayIndex].previousGuesses.length === maxGuesses) { //lost
        completedDaily(false);
        popups.push({ [answers[todayIndex]]: Date.now() });
      }
      refreshSquares = true;
    }
    else {
      popups.push({ "Not in word list": Date.now() });
      //TODO: not-in-word-list error animation
    }
  }
  else {
    popups.push({ "Not enough letters": Date.now() });
    //TODO: not-enough-letters error animation
  }
}


function removeLetterFromGuess() {
  gameState.games[todayIndex].guess = gameState.games[todayIndex].guess.slice(0, gameState.games[todayIndex].guess.length - 1);
  saveState();
  refreshSquares = true;
}


function saveState() {
  storeItem('wordle-rx-state', gameState);
  if (!gamesPlayed && !gameState.games[todayIndex].previousGuesses.length && !gameState.games[todayIndex].guess.length && getItem('wordle-rx-state') !== null) {
    clearRelevantLocalStorage(false);
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


function isLetter(str) {
  switch (str) {
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
      return true;
    default:
      return false;
  }
}


function pressedKey(key) {
  if (!stats && !gameOver) {
    if (gameState.games[todayIndex].guess.length < wordLength) {
      gameState.games[todayIndex].guess += key.toUpperCase();
      //TODO: letter-appended-to-guess animation
      saveState();
    }
    refreshSquares = true;
  }
}


/**
 * 
 * @param {string} k The typed key
 */
function keyTyped(k) {
  if (isLetter(key)) {
    if (!stats && !gameOver) {
      pressedKey(key);
    }
  }
  else {
    if (isLetter(k)) {
      if (!stats && !gameOver) {
        pressedKey(k);
      }
    }
  }
}


function toggleDarkMode() {
  gameState.mode = !gameState.mode;
  saveState();
  if (stats) {
    refreshStats = true;
  }
  else {
    refreshSquares = true;
  }
  for (let i = 0; i < colors.length; i++) {
    for (let j = 0; j < colors[i].length; j++) {
      if (colors[i][j].toString() === (gameState.mode ? color(192) : color(63)).toString()) {
        colors[i][j] = (gameState.mode ? color(63) : color(192));
      }
      else if (colors[i][j].toString() === (gameState.mode ? palette.white : palette.black).toString()) {
        colors[i][j] = (gameState.mode ? palette.black : palette.white);
      }
    }
  }
  darkModeButton
    .style('color', (gameState.mode ? palette.white : palette.black))
    .style('background-color', (gameState.mode ? palette.black : palette.white));
  contrastButton
    .style('color', (gameState.mode ? palette.white : palette.black))
    .style('background-color', (gameState.mode ? palette.black : palette.white));
  statsButton
    .style('color', (gameState.mode ? palette.white : palette.black))
    .style('background-color', (gameState.mode ? palette.black : palette.white));
  darkModeButton.elt.innerText = (gameState.mode ? "\u263C" : "\u263E");
  statsButton.elt.src = "assets/" + (stats ? (gameState.mode ? "bar_chart_inverted" : "bar_chart") : (gameState.mode ? "bar_chart_filled_inverted" : "bar_chart_filled")) + ".ico";
}


function toggleContrast() {
  gameState.contrast = !gameState.contrast;
  saveState();
  if (stats) {
    refreshStats = true;
  }
  else {
    refreshSquares = true;
  }
  for (let i = 0; i < colors.length; i++) {
    for (let j = 0; j < colors[i].length; j++) {
      if (colors[i][j].toString() === (gameState.contrast ? palette.yellow : palette.blue).toString()) {
        colors[i][j] = (gameState.contrast ? palette.blue : palette.yellow);
      }
      else if (colors[i][j].toString() === (gameState.contrast ? palette.green : palette.orange).toString()) {
        colors[i][j] = (gameState.contrast ? palette.orange : palette.green);
      }
    }
  }
  for (let i = 0; i < keyboardColors.length; i++) {
    if (keyboardColors[i].toString() === (gameState.contrast ? palette.yellow : palette.blue).toString()) {
      keyboardColors[i] = (gameState.contrast ? palette.blue : palette.yellow);
    }
    else if (keyboardColors[i].toString() === (gameState.contrast ? palette.green : palette.orange).toString()) {
      keyboardColors[i] = (gameState.contrast ? palette.orange : palette.green);
    }
  }
  contrastButton.elt.innerText = (gameState.contrast ? "\u25D0" : "\u25D1");
}


function toggleStats() {
  stats = !stats;
  refreshSquares = !stats;
  refreshStats = stats;
  lastWindowWidth = -1; //trigger resize of elements
  lastWindowHeight = -1; //trigger resize of elements; redundant
  statsButton.elt.src = "assets/" + (stats ? (gameState.mode ? "bar_chart_inverted" : "bar_chart") : (gameState.mode ? "bar_chart_filled_inverted" : "bar_chart_filled")) + ".ico";
  statsButton.elt.alt = (stats ? "Return to game" : "See statistics");
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


function blackButtonMouseOver() {
  this.style('background-color', color((gameState.mode ? 63 : 192)));
}


function blackButtonMouseOut() {
  this.style('background-color', (gameState.mode ? palette.black : palette.white));
}


/**
 * 
 * @param {string} text The text to copy to the clipboard
 * @param {string} [alertText=""] The text to show in an alert, if any
 */
async function setClipboard(text, alertText = "") {
  await navigator.clipboard.writeText(text)
    .then(() => {
      if (alertText) {
        window.alert(alertText);
      }
    }, () => new Promise((resolve) => setTimeout(resolve, 200)))
    .catch(e => console.error(e.message));
}


function copyDaily() {
  clipboardButton.style('background-color', palette.darkBlue); //reset button background color to indicate button was pressed
  if (gameState.mode) {
    for (let i = 0; i < colorsForCopying.length; i++) {
      colorsForCopying[i] = colorsForCopying[i].join("").replaceAll("⬜", "⬛").split("");
    }
  }
  else {
    for (let i = 0; i < colorsForCopying.length; i++) {
      colorsForCopying[i] = colorsForCopying[i].join("").replaceAll("⬛", "⬜").split("");
    }
  }
  if (gameState.contrast) {
    for (let i = 0; i < colorsForCopying.length; i++) {
      colorsForCopying[i] = colorsForCopying[i].join("").replaceAll("🟨", "🟦").replaceAll("🟩", "🟧").split("");
    }
  }
  else {
    for (let i = 0; i < colorsForCopying.length; i++) {
      colorsForCopying[i] = colorsForCopying[i].join("").replaceAll("🟦", "🟨").replaceAll("🟧", "🟩").split("");
    }
  }
  let colorsJoined = "";
  for (const c of colorsForCopying) {
    colorsJoined += c.join("") + "\r\n";
  }
  setClipboard(`Wordle Rx  #${todayIndex + 1}  ${(gameState.games[todayIndex].previousGuesses.slice(-1)[0] === answers[todayIndex] ? gameState.games[todayIndex].previousGuesses.length : "X")}/${maxGuesses}\r\nanderjef.github.io/Wordle-Rx\r\n${colorsJoined}`, "Results copied to clipboard!");
}


function copyStats() { //expects gamesWon !== 0
  cumulativeStatsButton.style('background-color', palette.darkBlue); //reset button background color to indicate button was pressed
  let mean = 0;
  const guessCountsSorted = [];
  let modeTempArray = Array.from({ length: gameState.games.length }, () => (0)); //could use a different array construction method due to not filling with an object and hence not needing to ensure objects are distinct, but went with this method for stylistic consistency
  const scores = []; //"x" for unattempted, "X" for failed attempt, one more than how many guesses were taken with "+" appended for started but incomplete games, or how many guesses it took
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
  guessCountsSorted.sort(function (a, b) { return a - b; });
  guessCountsSorted.concat(new Array(gamesPlayed - gamesWon).fill("X"));
  let median = (gamesPlayed ? "X" : null);
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
  const mode = [];
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
  setClipboard(`Wordle Rx  ${gamesPlayed}/${gameState.games.length}\r\nanderjef.github.io/Wordle-Rx\r\nID: ${gameState.ID}\r\nHash: ${hashCode(gameState.ID + "\r\n" + scores)}\r\nMax streak: ${maxStreak}\r\nMean (successful): ${(mean ? mean : "N/A")}\r\nMedian (completed): ${(median ? median : "N/A")}\r\nMode (completed): ${(mode.length ? mode : "N/A")}\r\nScores: ${scores}`, "Stats copied to clipboard!");
}


/**
 * 
 * @param {string} str What to hash
 * @returns The hash
 */
function hashCode(str) { //inspired by https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
  }
  return hash;
}


function blueButtonMouseOver() {
  this.style('background-color', palette.lightBlue);
}


function blueButtonMouseOut() {
  this.style('background-color', palette.darkBlue);
}
