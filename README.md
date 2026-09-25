# Wordle Rx

Wordle Rx allows playing a Wordle-style game, but where the answers (repeated weekly) are seven common medical/nursing terms repeated for National Nurses Week and seven common medical/pharmacy terms for National Pharmacy Week.  
Start date: 2022-08-23  

## Demo

![The main display GUI responding to a sequence of varied viewport dimensions](Picture1.gif)

The black is the provided display area.

## Dependencies

- The editor of your choice, such as [p5.js Web Editor](https://editor.p5js.org/);

## Installation

Open the repository with the editor of your choice, or skip installation altogether by visiting [the deployed version](https://anderjef.github.io/Wordle-Rx/).

### Configuration

- Set National Nurses Week answers in [answers1.txt](answers1.txt).
- Set National Pharmacy Week answers in [answers2.txt](answers2.txt).
- Set acceptable guesses in [valid words.txt](valid%20words.txt). Be sure to include answers so that players know that such words are valid guesses.

## Usage

1. You can visit the production build at <https://anderjef.github.io/Wordle-Rx/> or, if you have gone through the [installation](#installation), render [index.html](./index.html).
1. Type letters or use the provided on-screen keyboard to append to the current guess. Use backspace to correct errors, and press enter/return to submit a guess, looking to match the answer. Hints are provided for submitted guesses where green indicates a letter found in the correct postiion, while yellow indicates a letter in the answer but in a different position.
1. Share your game by copying it to your device's clipboard.

## Deployment

<https://anderjef.github.io/Wordle-Rx/> is continuously deployed to via a GitHub Action workflow.

## Acknowledgements

- Inspired by [Wordle from *The New York Times*](https://www.nytimes.com/games/wordle/index.html).
- Inspired by [Quordle](https://www.quordle.com/).
- [valid words.txt](valid%20words.txt) from <https://raw.githubusercontent.com/tabatkins/wordle-list/main/words>
- Generating a hash from a string inspired by <https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/>.

## Author

- **Jeffrey Andersen** &mdash; [GitHub Profile](https://github.com/anderjef) &bull; [Website](https://anderjef.github.io)

## License

For copyright, license, and warranty, see [LICENSE.md](LICENSE.md).
