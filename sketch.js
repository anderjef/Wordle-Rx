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

let colors = [];
let colorsForCopying = [];
let popups = [];
let keyboardColors = []; //in the order of the Qwerty keyboard read left to right then top to bottom
let gameOver = false;
let justEndedGameLoopCount = 0;
let stats = gameOver; //whether the stats display is open

let statsButton;
let clipboardButton;
let keyboard = [];
let enterButton;
let backspaceButton;


function preload() {
  validWords = loadStrings("valid words.txt"); //from https://raw.githubusercontent.com/tabatkins/wordle-list/main/words
  answers = loadStrings("answers.txt");
}


function setup() {
  createCanvas(min(canvasWindowWidthMultiplier * windowWidth, canvasWindowHeightMultiplier * windowHeight), min(canvasWindowWidthMultiplier * windowWidth, canvasWindowHeightMultiplier * windowHeight));
  validWords += answers;
  for (let i = 0; i < maxGuesses; i++) {
    colors.push([]);
    for (let j = 0; j < wordLength; j++) {
      colors[i].push(color(0));
    }
  }
  for (let i = 0; i < 26; i++) { //26 letters in the alphabet
    keyboardColors.push(color(127));
  }
  gameState = getItem('wordle-rx-state');
  if (gameState === null) {
    gameState = {
      answer: answers[(new Date().getDay())],
      guess: "",
      previousGuesses: [],
      gameWon: null,
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: [],
      lastGame: (new Date()).toDateString().substring(4),
    };
    for (let i = 0; i < maxGuesses; i++) {
      gameState.guessDistribution.push(0);
    }
  }
  else {
    if ((new Date()).toDateString().substring(4) === gameState.lastGame) {
      for (let i = 0; i < gameState.previousGuesses.length; i++) {
        updateColorsForClipboardAndGUI(gameState.previousGuesses[i], i);
      }
    }
    else {
      gameState.answer = answers[(new Date()).getDay()];
      gameState.guess = "";
      gameState.previousGuesses = [];
      gameState.gameWon = null;
      gameState.currentStreak = 0;
      gameState.lastGame = (new Date()).toDateString().substring(4);
    }
  }
  const screenDivision = width / numScreenDivisions;
  statsButton = createButton((stats ? "x" : "Stats")).mousePressed(toggleStats).mouseOver(statsMouseOver).mouseOut(statsMouseOut).style('color', color(255)).style('background-color', color(0)).style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').size(additionalScreenDivisionsForStatsButton * screenDivision, additionalScreenDivisionsForStatsButton * screenDivision).position(width - additionalScreenDivisionsForStatsButton * screenDivision, 0);
  clipboardButton = createButton("Copy to clipboard").mousePressed(setClipboard).mouseOver(copyMouseOver).mouseOut(copyMouseOut).style('color', color(255)).style('background-color', color("blue")).style('display', (stats && gameOver ? '' : 'none')).style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').size(14 * screenDivision, 7 * screenDivision).position(width / 2 - 7 * screenDivision, height);
  const letterButtonWidth = (numScreenDivisions / 10) * screenDivision;
  const letterButtonHeight = (numScreenDivisions / 7) * screenDivision;
  keyboard.push([]);
  keyboard[0].push(createButton("Q").mousePressed(pressedQ).style('color', color(255)).style('background-color', keyboardColors[ 0]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(0 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("W").mousePressed(pressedW).style('color', color(255)).style('background-color', keyboardColors[ 1]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(1 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("E").mousePressed(pressedE).style('color', color(255)).style('background-color', keyboardColors[ 2]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(2 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("R").mousePressed(pressedR).style('color', color(255)).style('background-color', keyboardColors[ 3]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(3 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("T").mousePressed(pressedT).style('color', color(255)).style('background-color', keyboardColors[ 4]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(4 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("Y").mousePressed(pressedY).style('color', color(255)).style('background-color', keyboardColors[ 5]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(5 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("U").mousePressed(pressedU).style('color', color(255)).style('background-color', keyboardColors[ 6]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(6 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("I").mousePressed(pressedI).style('color', color(255)).style('background-color', keyboardColors[ 7]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(7 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("O").mousePressed(pressedO).style('color', color(255)).style('background-color', keyboardColors[ 8]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(8 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard[0].push(createButton("P").mousePressed(pressedP).style('color', color(255)).style('background-color', keyboardColors[ 9]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(9 * letterButtonWidth, windowHeight - 3 * letterButtonHeight));
  keyboard.push([]);
  keyboard[1].push(createButton("A").mousePressed(pressedA).style('color', color(255)).style('background-color', keyboardColors[10]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(0.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("S").mousePressed(pressedS).style('color', color(255)).style('background-color', keyboardColors[11]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(1.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("D").mousePressed(pressedD).style('color', color(255)).style('background-color', keyboardColors[12]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(2.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("F").mousePressed(pressedF).style('color', color(255)).style('background-color', keyboardColors[13]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(3.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("G").mousePressed(pressedG).style('color', color(255)).style('background-color', keyboardColors[14]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(4.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("H").mousePressed(pressedH).style('color', color(255)).style('background-color', keyboardColors[15]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(5.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("J").mousePressed(pressedJ).style('color', color(255)).style('background-color', keyboardColors[16]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(6.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("K").mousePressed(pressedK).style('color', color(255)).style('background-color', keyboardColors[17]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(7.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard[1].push(createButton("L").mousePressed(pressedL).style('color', color(255)).style('background-color', keyboardColors[18]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(8.5 * letterButtonWidth, windowHeight - 2 * letterButtonHeight));
  keyboard.push([]);
  keyboard[2].push(createButton("Z").mousePressed(pressedZ).style('color', color(255)).style('background-color', keyboardColors[19]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(1.5 * letterButtonWidth, windowHeight - letterButtonHeight));
  keyboard[2].push(createButton("X").mousePressed(pressedX).style('color', color(255)).style('background-color', keyboardColors[20]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(2.5 * letterButtonWidth, windowHeight - letterButtonHeight));
  keyboard[2].push(createButton("C").mousePressed(pressedC).style('color', color(255)).style('background-color', keyboardColors[21]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(3.5 * letterButtonWidth, windowHeight - letterButtonHeight));
  keyboard[2].push(createButton("V").mousePressed(pressedV).style('color', color(255)).style('background-color', keyboardColors[22]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(4.5 * letterButtonWidth, windowHeight - letterButtonHeight));
  keyboard[2].push(createButton("B").mousePressed(pressedB).style('color', color(255)).style('background-color', keyboardColors[23]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(5.5 * letterButtonWidth, windowHeight - letterButtonHeight));
  keyboard[2].push(createButton("N").mousePressed(pressedN).style('color', color(255)).style('background-color', keyboardColors[24]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(6.5 * letterButtonWidth, windowHeight - letterButtonHeight));
  keyboard[2].push(createButton("M").mousePressed(pressedM).style('color', color(255)).style('background-color', keyboardColors[25]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(7.5 * letterButtonWidth, windowHeight - letterButtonHeight));
  enterButton = createButton("Enter").mousePressed(submitGuess).style('color', color(255)).style('background-color', color(127)).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(1.5 * letterButtonWidth, letterButtonHeight).position(0, windowHeight - letterButtonHeight);
  backspaceButton = createButton("←").mousePressed(removeLetterFromGuess).style('color', color(255)).style('background-color', color(127)).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(1.5 * letterButtonWidth, letterButtonHeight).position(8.5 * letterButtonWidth, windowHeight - letterButtonHeight);
  textAlign(CENTER, CENTER);
}


function draw() {
  resizeCanvas(min(canvasWindowWidthMultiplier * windowWidth, canvasWindowHeightMultiplier * windowHeight), min(canvasWindowWidthMultiplier * windowWidth, canvasWindowHeightMultiplier * windowHeight));
  maxFrameRate = floor(max(maxFrameRate, frameRate())); //must be set before call to frameRate(1.25) in case game is loaded to a completed game state to avoid a perpetually low frame rate
  background(0);
  const screenDivision = width / numScreenDivisions;
  textSize((numScreenDivisions / 15) * screenDivision);
  strokeWeight(1);
  stroke(255);
  fill(255);
  text("Wordle Rx", width / 2, (numScreenDivisions / 16) * screenDivision);
  if (!stats) {
    if (gameState.gameWon !== null && !gameOver) {
      gameOver = true;
      justEndedGameLoopCount = 2 + 2 * (!gameState.gameWon && popups.length); //extra time on loss for the user to read the answer popup
      frameRate(1.25); //found to be the only way to have the program show the game's end then the stats page shortly after (as opposed to a busy wait)
    }
    strokeWeight(2);
    const letterSpaceMultiplier = 9;
    for (let y = 0; y < maxGuesses; y++) {
      for (let x = 0; x < wordLength; x++) {
        stroke((y < gameState.previousGuesses.length ? colors[y][x] : (y === gameState.previousGuesses.length ? (gameState.guess.length !== wordLength ? (x < gameState.guess.length ? 127 : 63) : (!validWords.includes(gameState.guess) ? color(127, 0, 0) : 127)) : 63)));
        fill(colors[y][x]);
        square(((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + x * (letterSpaceMultiplier + 1)) * screenDivision, ((numScreenDivisions / 8) + y * (letterSpaceMultiplier + 1)) * screenDivision, letterSpaceMultiplier * screenDivision);
      }
    }
    stroke(255);
    strokeWeight(1);
    fill(255);
    for (let i = 0; i < gameState.previousGuesses.length; i++) {
      const y = (numScreenDivisions / 8 + letterSpaceMultiplier / 2 + i * (letterSpaceMultiplier + 1)) * screenDivision;
      for (let j = 0; j < wordLength; j++) {
        const x = ((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + letterSpaceMultiplier / 2 + j * (letterSpaceMultiplier + 1)) * screenDivision;
        text(gameState.previousGuesses[i][j], x, y);
      }
    }
    stroke((gameState.guess.length === wordLength && !validWords.includes(gameState.guess) ? color(127, 0, 0) : 255));
    fill((gameState.guess.length === wordLength && !validWords.includes(gameState.guess) ? color(127, 0, 0) : 255));
    for (let i = 0; i < gameState.guess.length; i++) {
      const x = ((numScreenDivisions - (wordLength * (letterSpaceMultiplier + 1) - 1)) / 2 + letterSpaceMultiplier / 2 + i * (letterSpaceMultiplier + 1)) * screenDivision;
      const y = (numScreenDivisions / 8 + letterSpaceMultiplier / 2 + gameState.previousGuesses.length * (letterSpaceMultiplier + 1)) * screenDivision;
      text(gameState.guess[i], x, y);
    }
    let numPopupsToDiscard = 0; //depends on popups being in order of decreasing age
    for (let i = 0; i < popups.length; i++) {
      stroke(255);
      fill(255);
      rect(width / 2 - 7 * screenDivision, (5 + i * 6) * screenDivision, 14 * screenDivision, 4 * screenDivision, screenDivision / 2);
      stroke(0);
      fill(0);
      textSize(1.5 * screenDivision);
      const label = Object.keys(popups[i])[0];
      text(label, width / 2, (7 + i * 6) * screenDivision);
      if (Date.now() - popups[i][label] > 1000) { //popups expire after 1000 milliseconds
        numPopupsToDiscard = i + 1;
      }
    }
    if (numPopupsToDiscard > 0) {
      popups.splice(0, numPopupsToDiscard);
    }
    const letterButtonWidth = 7 * screenDivision;
    const letterButtonHeight = 10 * screenDivision;
    for (let i = 0; i < keyboard[0].length; i++) {
      keyboard[0][i].style('background-color', keyboardColors[i]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position(i * letterButtonWidth, windowHeight - 3 * letterButtonHeight);
    }
    for (let i = 0; i < keyboard[1].length; i++) {
      keyboard[1][i].style('background-color', keyboardColors[keyboard[0].length + i]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position((0.5 + i) * letterButtonWidth, windowHeight - 2 * letterButtonHeight);
    }
    for (let i = 0; i < keyboard[2].length; i++) {
      keyboard[2][i].style('background-color', keyboardColors[keyboard[0].length + keyboard[1].length + i]).style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(letterButtonWidth, letterButtonHeight).position((1.5 + i) * letterButtonWidth, windowHeight - letterButtonHeight);
    }
    enterButton.style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(1.5 * letterButtonWidth, letterButtonHeight).position(0, windowHeight - letterButtonHeight);
    backspaceButton.style('border-radius', screenDivision + 'px').style('font-size', (1.5 * screenDivision) + 'pt').size(1.5 * letterButtonWidth, letterButtonHeight).position(8.5 * letterButtonWidth, windowHeight - letterButtonHeight);
  }
  else {
    stroke(0);
    textSize(3 * screenDivision);
    text("STATISTICS", width / 2, 10 * screenDivision);
    textSize(4 * screenDivision);
    text(gameState.gamesPlayed, width / 5, 16 * screenDivision);
    text(round(100 * gameState.gamesWon / max(gameState.gamesPlayed, 1)), 2 * width / 5, 16 * screenDivision);
    text(gameState.currentStreak, 3 * width / 5, 16 * screenDivision);
    text(gameState.maxStreak, 4 * width / 5, 16 * screenDivision);
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
    let modeScore = 0;
    for (let i = 0; i < maxGuesses; i++) {
      text(i + 1, (22.5 + i * 5) * screenDivision, 46 * screenDivision);
      modeScore = max(modeScore, gameState.guessDistribution[i]);
    }
    for (let i = 0; i < maxGuesses; i++) {
      fill((i + 1 === gameState.previousGuesses.length ? "green" : 63));
      rect((21.5 + i * 5) * screenDivision, 44 * screenDivision, 2 * screenDivision, -gameState.guessDistribution[i] / max(modeScore, 1) * 12 * screenDivision);
      fill(255);
      text(gameState.guessDistribution[i], (22.5 + i * 5) * screenDivision, (43 - gameState.guessDistribution[i] / max(modeScore, 1) * 12) * screenDivision);
    }
    textSize(3 * screenDivision);
    text("NEXT DAILY", width / 2, 52 * screenDivision);
    textSize(4.5 * screenDivision);
    const secondsUntilTomorrow = Math.floor(((new Date()).setHours(24, 0, 0, 0) - (new Date()).getTime()) / 1000);
    const countdownHours = Math.floor(secondsUntilTomorrow / 3600);
    const countdownMinutes = Math.floor((secondsUntilTomorrow / 60) % 60);
    const countdownSeconds = secondsUntilTomorrow % 60;
    text((countdownHours < 10 ? (countdownHours < 1 ? "00" : "0" + countdownHours) : countdownHours) + ":" + (countdownMinutes < 10 ? (countdownMinutes < 1 ? "00" : "0" + countdownMinutes) : countdownMinutes) + ":" + (countdownSeconds < 10 ? (countdownSeconds < 1 ? "00" : "0" + countdownSeconds) : countdownSeconds), width / 2, 58 * screenDivision);
  }
  if (justEndedGameLoopCount === 1) {
    toggleStats();
    statsButton.mousePressed(toggleStats).mouseOver(statsMouseOver).mouseOut(statsMouseOut); //re-enable statsButton interactions
    frameRate(floor(maxFrameRate)); //reset frame rate to an optimistic approximation
    toggleStatsGUI(screenDivision);
    justEndedGameLoopCount--;
  }
  else if (justEndedGameLoopCount > 0) {
    statsButton.mousePressed(emptyFunction).mouseOver(emptyFunction).mouseOut(emptyFunction); //disable statsButton interaction during countdown/"animation"
    justEndedGameLoopCount--;
  }
  else {
    toggleStatsGUI(screenDivision);
  }
}


function toggleStatsGUI(screenDivision) {
  statsButton.style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').size(additionalScreenDivisionsForStatsButton * screenDivision, additionalScreenDivisionsForStatsButton * screenDivision).position(width - additionalScreenDivisionsForStatsButton * screenDivision, 0);
  clipboardButton.style('border-radius', (2 * screenDivision) + 'px').style('font-size', (2 * screenDivision) + 'pt').size(14 * screenDivision, 7 * screenDivision).position(width / 2 - 7 * screenDivision, height);
  statsButton.html((stats ? "x" : "Stats"));
  clipboardButton.style('display', (stats && gameOver ? '' : 'none'));
  for (let i = 0; i < keyboard.length; i++) {
    for (let j = 0; j < keyboard[i].length; j++) {
      keyboard[i][j].style('display', (stats ? 'none' : ''));
    }
  }
  enterButton.style('display', (stats ? 'none' : ''));
  backspaceButton.style('display', (stats ? 'none' : ''));
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
    let answerCharactersBag = gameState.answer;
    let matchedIndices = [];
    for (let i = 0; i < wordLength; i++) {
      if (guess[i] === gameState.answer[i]) {
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
    for (let i = 0; i < guessCharactersBag.length; i++) {
      if (keyboardColors[qwertyKeysToIndices[guessCharactersBag[i]]].toString() !== color(0, 127, 0).toString() && keyboardColors[qwertyKeysToIndices[guessCharactersBag[i]]].toString() !== color(127, 127, 0).toString()) {
        keyboardColors[qwertyKeysToIndices[guessCharactersBag[i]]] = color(63);
      }
    }
  }
}


function setClipboard() { //inspired by https://www.codegrepper.com/code-examples/html/p5.js+copy+value+to+clipboard
  clipboardButton.style('background-color', color("blue")); //reset button background color to indicate button was pressed
  let temp = document.createElement("textarea");
  document.body.appendChild(temp);
  let colorsJoined = "";
  for (let i = 0; i < colorsForCopying.length; i++) {
    colorsJoined += colorsForCopying[i].join("") + "\r\n";
  }
  temp.value = "Wordle Rx  " + ((new Date()).getDay() + 1) + "  " + (gameState.previousGuesses[gameState.previousGuesses.length - 1] === gameState.answer ? gameState.previousGuesses.length : "X") + "/" + maxGuesses + "\r\nhttps://anderjef.github.io/Wordle-Rx\r\n" + colorsJoined;
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
}


function submitGuess() {
  if (gameState.guess.length === wordLength) {
    if (validWords.includes(gameState.guess)) {
      if (gameState.guess === gameState.answer) { //won
        updateColorsForClipboardAndGUI(gameState.guess, gameState.previousGuesses.length, true);
        gameState.previousGuesses.push(gameState.guess);
        gameState.guess = "";
        gameState.gameWon = true;
        gameState.gamesPlayed++;
        gameState.gamesWon++;
        gameState.currentStreak++;
        gameState.maxStreak = max(gameState.maxStreak, gameState.currentStreak);
        gameState.guessDistribution[gameState.previousGuesses.length - 1]++;
      }
      else {
        updateColorsForClipboardAndGUI(gameState.guess, gameState.previousGuesses.length);
        gameState.previousGuesses.push(gameState.guess);
        gameState.guess = "";
      }
      //future consideration: show word-submitted animation
      if (gameState.previousGuesses.length === maxGuesses) { //lost
        popups.push({ [gameState.answer] : Date.now() });
        gameState.gameWon = false;
        gameState.gamesPlayed++;
        gameState.currentStreak = 0;
        gameState.maxStreak = max(gameState.maxStreak, gameState.currentStreak);
      }
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
  gameState.guess = gameState.guess.substring(0, gameState.guess.length - 1);
}


function keyPressed() {
  switch (keyCode) {
    case ENTER:
    case RETURN:
      if (!stats && !gameOver) {
        submitGuess();
        storeItem('wordle-rx-state', gameState);
      }
      break;
    case BACKSPACE:
      if (!stats && !gameOver) {
        removeLetterFromGuess();
        storeItem('wordle-rx-state', gameState);
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
    if (gameState.guess.length < wordLength) {
      gameState.guess += key.toUpperCase();
      //future consideration: show letter-appended-to-guess animation
      storeItem('wordle-rx-state', gameState);
    }
  }
}


function keyTyped() {
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
  }
}


function toggleStats() {
  stats = !stats;
}


function statsMouseOver() {
  statsButton.style('background-color', color(63));
}


function statsMouseOut() {
  statsButton.style('background-color', color(0));
}


function emptyFunction() {}


function copyMouseOver() {
  clipboardButton.style('background-color', color(91, 91, 255));
}


function copyMouseOut() {
  clipboardButton.style('background-color', color("blue"));
}


function pressedQ() { pressedKey("Q"); }
function pressedW() { pressedKey("W"); }
function pressedE() { pressedKey("E"); }
function pressedR() { pressedKey("R"); }
function pressedT() { pressedKey("T"); }
function pressedY() { pressedKey("Y"); }
function pressedU() { pressedKey("U"); }
function pressedI() { pressedKey("I"); }
function pressedO() { pressedKey("O"); }
function pressedP() { pressedKey("P"); }
function pressedA() { pressedKey("A"); }
function pressedS() { pressedKey("S"); }
function pressedD() { pressedKey("D"); }
function pressedF() { pressedKey("F"); }
function pressedG() { pressedKey("G"); }
function pressedH() { pressedKey("H"); }
function pressedJ() { pressedKey("J"); }
function pressedK() { pressedKey("K"); }
function pressedL() { pressedKey("L"); }
function pressedZ() { pressedKey("Z"); }
function pressedX() { pressedKey("X"); }
function pressedC() { pressedKey("C"); }
function pressedV() { pressedKey("V"); }
function pressedB() { pressedKey("B"); }
function pressedN() { pressedKey("N"); }
function pressedM() { pressedKey("M"); }
