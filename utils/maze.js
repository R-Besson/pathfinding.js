/* ------------------------------------------------------------------------------------

Author  : Romain Besson

Date    : 10/24/2021

Algorithm: Jarník's algorithm

------------------------------------------------------------------------------------ */

Math.randInt = function (min, max) {
	const r = Math.random() // 0-1
	const d = Math.round(r * (max - min))
	return min + d
}
Array.prototype.GetRandom = function () {
	let randomInt = Math.randInt(0, this.length - 1)
	return this[randomInt]
}
Set.prototype.GetRandom = function () {
	let randomInt = Math.randInt(0, this.size - 1)
	return [...this.values()][randomInt]
}

class Cell {
	constructor(x, y) {
		this.x = x
		this.y = y
		this.visited = false
		this.wall = true
	}
}

function GetNeighbours(cell, maze, width, height, Visited) {
	let neighbours = []

	// Neighbour Left
	if (
		cell.x >= 2 &&
		maze[cell.x - 2] &&
		maze[cell.x - 2][cell.y] &&
		(Visited ? maze[cell.x - 2][cell.y].visited : !maze[cell.x - 2][cell.y].visited)
	) neighbours.push(maze[cell.x - 2][cell.y])

	// Neighbour Right
	if (
		cell.x <= width - 3 &&
		maze[cell.x + 2] &&
		maze[cell.x + 2][cell.y] &&
		(Visited ? maze[cell.x + 2][cell.y].visited : !maze[cell.x + 2][cell.y].visited)
	) neighbours.push(maze[cell.x + 2][cell.y])

	// Neighbour Top
	if (
		cell.y >= 2 &&
		maze[cell.x] &&
		maze[cell.x][cell.y - 2] &&
		(Visited ? maze[cell.x][cell.y - 2].visited : !maze[cell.x][cell.y - 2].visited)
	) neighbours.push(maze[cell.x][cell.y - 2])

	// Neighbour Bottom
	if (
		cell.y <= height - 3 &&
		maze[cell.x] &&
		maze[cell.x][cell.y + 2] &&
		(Visited ? maze[cell.x][cell.y + 2].visited : !maze[cell.x][cell.y + 2].visited)
	) neighbours.push(maze[cell.x][cell.y + 2])

	return neighbours
}
function GetXYInBetween(cell1, cell2) {
	const diffX = cell2.x - cell1.x
	const diffY = cell2.y - cell1.y

	return { x: cell1.x + diffX / 2, y: cell1.y + diffY / 2 }
}

class Maze {
	constructor(width, height) {
		// Make a new two-dimensional array (x, y)
		let grid = []
		for (let x = 0; x < width; x++) {
			grid[x] = [] // Initialize a new row
			for (let y = 0; y < height; y++) {
				grid[x][y] = new Cell(x, y) // Initialize a cell in the new row
			}
		}

		let pathSet = new Set() // Set that will contain all frontier (neighbour) nodes

		// ALGORITHM // 

		// [STEP 1]: Choose a random start cell AND add it to the path
		let startCell = grid.GetRandom().GetRandom()
		pathSet.add(startCell)

		// [STEP 2]: While there is cell ...
		while (pathSet.size > 0) {
			// [STEP 3]: Pick a random cell from the path AND mark it as a visited cell AND make it a passage
			let current = pathSet.GetRandom()
			current.visited = true
			current.wall = false

			pathSet.delete(current)

			// [STEP 4]: Get neighbors that are visited
			let neighbours = GetNeighbours(current, grid, width, height, true)
			if (neighbours.length > 0) {
				let rNeighbour = neighbours.GetRandom()

				// [STEP 4.A]: Connect the randomly chosen neighbour with the current Cell AND set it as a passage
				let connection = GetXYInBetween(current, rNeighbour)
				connection = grid[connection.x][connection.y]
				connection.wall = false
			}

			// [STEP 5]: Add all Unvisited neighbors to the path Set
			GetNeighbours(current, grid, width, height, false).forEach(neighbour => {
				pathSet.add(neighbour)
			})
		}

		for (let c = 0; c < grid.length; c++) { // Columns
			this[c] = []
			for (let r = 0; r < grid[c].length; r++) { // Rows
				this[c][r] = grid[c][r].wall
			}
		}
	}
}

export { Maze };