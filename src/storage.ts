// -- Persistent high score storage (localStorage) --
const HIGH_SCORE_KEY = 'pixelRogue-highScore'
const BEST_FLOOR_KEY = 'pixelRogue-bestFloor'

export interface HighScoreData {
  highScore: number
  bestFloor: number
}

export function loadHighScore(): HighScoreData {
  const hs = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10)
  const bf = parseInt(localStorage.getItem(BEST_FLOOR_KEY) ?? '0', 10)
  return { highScore: isNaN(hs) ? 0 : hs, bestFloor: isNaN(bf) ? 0 : bf }
}

export function saveHighScore(score: number, floor: number): HighScoreData {
  const prev = loadHighScore()
  const highScore = Math.max(prev.highScore, score)
  const bestFloor = Math.max(prev.bestFloor, floor)
  localStorage.setItem(HIGH_SCORE_KEY, String(highScore))
  localStorage.setItem(BEST_FLOOR_KEY, String(bestFloor))
  return { highScore, bestFloor }
}
