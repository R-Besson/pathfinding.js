// http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
let diagDiff = Math.SQRT2 - 1
export function getHeuristic(dx, dy, type) {
    switch (type) {
        case "euclidean":
            return Math.sqrt((dx ** 2) + (dy ** 2))
        case "manhattan":
            return dx + dy
        case "octile":
            return (dx < dy) ? diagDiff * dx + dy : diagDiff * dy + dx
        case "chebyshev":
            return Math.max(dx, dy)
        default:
            console.error("Don't know this distance heuristic type");
    }
}