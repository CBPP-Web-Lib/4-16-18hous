/*https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array*/

const seedrandom = require("seedrandom")

function shuffle(array, seed) {
  var rng = new seedrandom(seed)
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(rng() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

module.exports = { shuffle }