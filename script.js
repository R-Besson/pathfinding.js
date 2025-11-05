/* ------------------------------------------------------------------------------------

Author     : Romain Besson

Date       : 4/11/2021

Published  : 19/11/2021

Algorithms : A*, Dijkstra's Algorithm, Greedy Best-First Search, BFS, DFS

------------------------------------------------------------------------------------ */

import anime from './utils/anime.es.js';
import {Maze} from './utils/maze.js';
import {getHeuristic} from './utils/heuristics.js'

// Global Variables //
let G_Nodes = []
let G_NodeMap = []

let G_Options = {
	NodeSize: 40,
	Algorithm: "AStar",
	MoveDiagonally: true,
	DistanceHeuristic: "euclidean"
}
let G_StartSet = false
let G_EndSet = false
let G_nInterations = 0

let G_NodesDragged = []
let G_Dragging = false

let G_Safety = {
	GeneratingMaze: false,
	Searching: false,
}

let G_Config; fetch('cfg.json').then(res => res.json()).then(dat => G_Config = dat)

// ---------------- //

// Global Elements //
let E_nodeContainer = document.getElementById("container")
let E_FindPath      = document.getElementById("FindPath")
let E_ClearPath     = document.getElementById("ClearPath")
let E_Reset         = document.getElementById("ClearWalls")
let E_Maze          = document.getElementById("Maze")
let E_Regen         = document.getElementById("Regen")
let E_Status        = document.getElementById("Status")
let E_ScreenTime    = document.getElementById("ScreenTime")
let E_PathLength    = document.getElementById("PathLength")
let E_Iterations    = document.getElementById("Iterations")
let E_TopBar        = document.getElementById("input-topbar")
let E_ToggleTopBar  = document.getElementById("top-bar-toggle")
// ----------- //

Math.clamp = function(n, min, max) {
	return Math.min(Math.max(n, min), max);
}

// Classes //
class Node {
	constructor (x, y) {
		this.score = 0
		this.c1 = Infinity
		this.c2 = 0
		this.x = x
		this.y = y
		this.object = null
		this.cycle = 1
		this.isBlocked = false
		this.isStart = false
		this.isEnd = false
		this.previousNode = null

		this.visited = false
	}
}

class Vector2 {
	constructor (x, y) {
		this.x = x
		this.y = y
	}
}

// Slider Input //
let sliders = Array.from(document.getElementsByClassName('slider'))

sliders.forEach(slider => {
	let output = slider.parentNode.children[0].children[0]
	slider.addEventListener("input", () => {
		const option = slider.attributes.name.value
		G_Options[option] = slider.value

		output.innerHTML = slider.value
	})
})
// ------------ //

// Dropdown Input //
let dropdowns = Array.from(document.getElementsByClassName('dropdown'))

dropdowns.forEach(dropdown => {
	dropdown.addEventListener("change", () => {
		const option = dropdown.attributes.name.value
		G_Options[option] = dropdown.value
	})
})
// -------------- //

// Button Input //
let buttons = Array.from(document.getElementsByClassName('checkbox'))

buttons.forEach(button => {
	button.addEventListener("change", () => {
		const option = button.attributes.name.value
		G_Options[option] = button.checked
	})
})
// ------------ //
function getMagnitude(x1, y1, x2, y2) {
	return Math.sqrt((x2-x1)**2 + (y2-y1)**2)
}
function colorNode(node, color, duration) {
	if (duration === 0) {node.object.style.backgroundColor = color; return}
	anime({
		targets: [node.object],
		backgroundColor: color,
		duration: duration,
		easing: 'easeInOutQuad',
	});
}
function blowUpNode(node, duration) {
	duration = Math.clamp(duration, 1, Infinity)
	node.object.style.zIndex = "10";
	anime({
		targets: [node.object],
		scale: 1.1,
		duration: duration,
		easing: 'easeInOutQuad',
		complete: function () {
			anime({
				targets: [node.object],
				scale: 1,
				duration: duration,
				easing: 'easeInOutQuad',
				complete: function () {
					node.object.style.zIndex = "0";
				}
			})
		},
	});
	
}
function getStartNode() {
	for (let n = 0; n < G_Nodes.length; n++) {
		let node = G_Nodes[n]
		if (node.isStart === true) {
			return node
		}
	}
}
function getEndNode() {
	for (let n = 0; n < G_Nodes.length; n++) {
		let node = G_Nodes[n]
		if (node.isEnd === true) {
			return node
		}
	}
}
function getNeighbourNodes(node, Algo, MoveDiagonally) {
	let checkedMoves =[]

	let Moves = [
		new Vector2(1, 0), // Right
		new Vector2(0, -1), // Top
		new Vector2(-1, 0), // Left
		new Vector2(0, 1), // Bottom
	]

	let diagonalMoves = [
		new Vector2(1, 1), // Bottom Right
		new Vector2(1, -1), // Top Right
		new Vector2(-1, -1), // Top Left
		new Vector2(-1, 1), // Bottom Left
	]

	let neighbours = []
	for (let n = 0; n < G_Nodes.length; n++) {
		let neighbour = G_Nodes[n]

		if (neighbour.isBlocked || (neighbour.visited && (Algo === "Greedy" || Algo === "BFS" || Algo === "DFS")) || neighbours.includes(neighbour)) {
			continue
		}

		let moveFound = false
		for (let i = 0; i < 4; i++) {
			let move = Moves[i]
			
			if (neighbour.x - node.x === move.x && neighbour.y - node.y === move.y) {
				checkedMoves[i] = neighbour
				neighbours.push(neighbour)
				moveFound = true
				break
			}
		}

		if (MoveDiagonally && !moveFound) {
			for (let i = 0; i < 4; i++) {
				
				let move = diagonalMoves[i], checkDiagonals = true

				if (neighbour.x - node.x === move.x && neighbour.y - node.y === move.y) {
				
					switch (move.x) {
						case 1:
							if (move.y === 1) {
								if (G_NodeMap[neighbour.x][neighbour.y-1].isBlocked && G_NodeMap[neighbour.x-1][neighbour.y].isBlocked) checkDiagonals = false
							} else {
								if (G_NodeMap[neighbour.x][neighbour.y+1].isBlocked && G_NodeMap[neighbour.x-1][neighbour.y].isBlocked) checkDiagonals = false
							}
							break
						case -1:
							if (move.y === 1) {
								if (G_NodeMap[neighbour.x+1][neighbour.y].isBlocked && G_NodeMap[neighbour.x][neighbour.y-1].isBlocked) checkDiagonals = false
							} else {
								if (G_NodeMap[neighbour.x+1][neighbour.y].isBlocked && G_NodeMap[neighbour.x][neighbour.y+1].isBlocked) checkDiagonals = false
							}

							break
					}

					if (checkDiagonals) {
						checkedMoves[i] = neighbour
						neighbours.push(neighbour)
						moveFound = true
					}
					break
				}
			}
		}
	}

	return neighbours
}

function clearNodes() {
	G_Nodes.forEach(node => {
		if (node.object) node.object.remove()
	})
	G_Nodes = []; G_NodeMap = []

	G_StartSet = false; G_EndSet = false
}

// MAZE GEN //
function generateMaze() {
	if (G_Safety.GeneratingMaze || G_Safety.Searching) return

	clearPath()
	resetWalls()

	G_Safety.GeneratingMaze = true

	let width = G_NodeMap.length, height = G_NodeMap[0].length
	let newMaze = new Maze(width, height)

	let startNode = getStartNode()
	let endNode = getEndNode() 



	for (let n = 0; n < G_Nodes.length; n++) {
		let node = G_Nodes[n]
		
		if (node.isStart || node.isEnd || (startNode && endNode && ((Math.abs(node.x-startNode.x) <= 1 && Math.abs(node.y-startNode.y) <= 1) || (Math.abs(node.x-endNode.x) <= 1 && Math.abs(node.y-endNode.y) <= 1)))) continue

		if (newMaze[node.x][node.y]) {
			node.isBlocked = true; node.isStart = false; node.isEnd = false
			colorNode(node, "rgb(0, 0, 0)", 5)
			node.cycle = 4
		}
	}

	G_Safety.GeneratingMaze = false
}
// -------- //

function nodeSwitch(_node) {
	switch (_node.cycle) {
		case 1: // [CASE 1]: Make the selected Node a Blocked Node (Black Node)

			if (_node.isStart) G_StartSet = false // If the selected node is a Start Node, the Start Node is no longer set since we convert it back to a regular white node
			if (_node.isEnd) G_EndSet = false     // Same if its an End Node

			_node.isBlocked = true; _node.isStart = false; _node.isEnd = false
			colorNode(_node, "rgb(0, 0, 0)", 75)
			blowUpNode(_node, 75)

			_node.cycle++ // Go forward in the next cycle (-> CASE 2)
			break

		case 2: // [CASE 2]: Make the selected Node the Start Node (Green Node)

			if (!G_StartSet) { // If Start Node is not set then ...
				G_StartSet = true

				if (_node.isEnd) G_EndSet = false

				_node.isBlocked = false; _node.isStart = true; _node.isEnd = false
				colorNode(_node, "rgb(0, 255, 0)", 75)
				blowUpNode(_node, 75)

				_node.cycle++ // Go forward in the next cycle (-> CASE 3)
				break
			} else {
				_node.cycle++ // ... else move to the next case directly (-> CASE 3)
			}

		case 3: // [CASE 3]: Make the selected Node the End Node (Red Node)

			if (!G_EndSet) { // If End Node is not set then ...
				G_EndSet = true

				if (_node.isStart) G_StartSet = false 

				_node.isBlocked = false; _node.isStart = false; _node.isEnd = true
				colorNode(_node, "rgb(255, 0, 0)", 75)
				blowUpNode(_node, 75)

				_node.cycle++ // Go forward in the next cycle (-> CASE 4)
				break
			} else {
				_node.cycle++ // ... else move to the next case directly (-> CASE 4)
			}

		case 4: // [CASE 4]: Revert the selected Node back to a Regular Node (White Node)

			if (_node.isStart) G_StartSet = false // If the selected node is a Start Node, the Start Node is no longer set since we convert it back to a regular white node
			if (_node.isEnd) G_EndSet = false     // Same if its an End Node

			_node.isBlocked = false; _node.isStart = false; _node.isEnd = false
			colorNode(_node, "rgb(255, 255, 255)", 75)
			blowUpNode(_node, 75)

			_node.cycle = 1 // We go back to the start (-> CASE 1)
			break
	}
}

document.body.onmousedown = function(event) { 
	G_Dragging = true
	G_NodesDragged = []
}
document.body.onmouseup = function(event) {
	G_Dragging = false
	G_NodesDragged = []
}

function newNode(x, y, nodeDimensions) {
	let _node = new Node(x, y, nodeDimensions)

	// Create Actual button Element // 
	_node.object = document.createElement("rect")
	_node.object.style.width = nodeDimensions+"px"
	_node.object.style.height = nodeDimensions+"px"
	_node.object.style.left = (x*nodeDimensions)+"px"
	_node.object.style.top = (y*nodeDimensions)+"px"

	$(E_nodeContainer).append(_node.object)

	$(_node.object).mouseup(function (event) {
		if (G_Safety.GeneratingMaze || G_Safety.Searching) return

		if (!G_NodesDragged.includes(_node)) {
			G_NodesDragged.push(_node)

			clearPath()
			nodeSwitch(_node)
		}
		event.preventDefault()
	})
	$(_node.object).mousemove(function (event) {
		if (G_Safety.GeneratingMaze || G_Safety.Searching) return

		if (G_Dragging && !G_NodesDragged.includes(_node)) {
			G_NodesDragged.push(_node)

			if (_node.cycle === 2 || _node.cycle === 3) {
				if (_node.isBlocked) {
					_node.cycle = 4
				} else { _node.cycle = 1 }
			}

			clearPath()
			nodeSwitch(_node)
		}
		event.preventDefault()
	})

	G_Nodes.push(_node)
	if (!G_NodeMap[_node.x]) G_NodeMap[_node.x] = []
	G_NodeMap[_node.x][_node.y] = _node
}

function createBaseNodes() {
	if (G_Safety.GeneratingMaze || G_Safety.Searching) return
	clearNodes()

	let containerWidth = E_nodeContainer.clientWidth
	let containerHeight = E_nodeContainer.clientHeight

	const nodeDimensions = G_Options.NodeSize

	const fitInX = Math.floor(containerWidth/nodeDimensions)
	const fitInY = Math.floor(containerHeight/nodeDimensions)

	for (let nX = 0; nX < fitInX; nX++) {
		for (let nY = 0; nY < fitInY; nY++) {
			newNode(nX, nY, nodeDimensions)
		}
	}
}

// Start Node Search //
function PushRec(node, startNode, endNode, list) {
	if (!node.previousNode) return

	if (node === startNode) {
		return
	} else if (node === endNode) {
		PushRec(node.previousNode, startNode, endNode, list)
		return
	} else {
		PushRec(node.previousNode, startNode, endNode, list)
		list.push(node)
		return
	}
}
function drawPath(startNode, endNode, Colors, Delays, startT) {
	let path = []
	PushRec(endNode, startNode, endNode, path) // Recursive path reconstruction

	E_PathLength.innerHTML = path.length // Path Length Stat
	E_Iterations.innerHTML = G_nInterations

	if (path.length > 0) {
		displayTime(startT); setStatus(3)
		var i = 0
		function drawNextNode() {
			setTimeout(function() {
				if (path[i] && path[i] !== startNode && path[i] !== endNode) colorNode(path[i], Colors.Path, Delays.ColorNode)

				i++;
				if (i <= path.length) {
					drawNextNode()
				} else {
					setTimeout(function() {G_Safety.Searching = false}, Delays.DrawPath)
				}
			}, Delays.DrawPath)
		}
		drawNextNode()
	} else {displayTime(startT); setStatus(4); G_Safety.Searching = false}
}

function displayTime(startT) {
	const endT = performance.now()
	const ScreenT = (endT-startT)/1000

	E_ScreenTime.innerHTML = Math.floor(ScreenT*100)/100+"s"
}
function setStatus(status) {
	switch(status) {
		case 1:
			E_Status.innerHTML = "Idle"
			E_Status.style.color = "rgb(255, 255, 0)"
			break
		case 2:
			E_Status.innerHTML = "Searching."
			E_Status.style.color = "rgb(150, 255, 100)"

			function nextKeyframe() {
				setTimeout(function() {
					if (E_Status.innerHTML.includes("Searching")) {
						switch(E_Status.innerHTML) {
							case "Searching.":
								E_Status.innerHTML = "Searching.."; break
							case "Searching..":
								E_Status.innerHTML = "Searching..."; break
							case "Searching...":
								E_Status.innerHTML = "Searching."; break
						}
						E_Status.style.color = "rgb(150, 255, 100)"

						nextKeyframe()
					}
				}, 750)
			}
			nextKeyframe()

			break
		case 3:
			E_Status.innerHTML = "Found Path!"
			E_Status.style.color = "rgb(150, 255, 100)"

			setTimeout(() => {
				if (E_Status.innerHTML === "Found Path!") setStatus(1)
			}, 2000);

			break
		case 4:
			E_Status.innerHTML = "Failed"
			E_Status.style.color = "rgb(255, 0, 0)"

			setTimeout(() => {
				if (E_Status.innerHTML === "Failed") setStatus(1)
			}, 2000);

			break
	}
}

let dDiagonal = Math.sqrt(2)
function startSearch () {
	if (G_Safety.GeneratingMaze || G_Safety.Searching) {setStatus(1); G_Safety.Searching = false; return}

	clearPath()
	G_Safety.Searching = true
	setStatus(2)

	const Diagonals = G_Options.MoveDiagonally
	const Algo = G_Options.Algorithm
	const Colors = G_Config.Colors
	const Delays = G_Config.Delays
	const heuristicType = G_Options.DistanceHeuristic

	const startT = performance.now()
	G_nInterations = 0

	if (Algo === "AStar" || Algo === "Dijkstra" || Algo === "Greedy") { // A* + Dijkstra Pathfinding Algorithms

		let startNode = getStartNode()
		let endNode   = getEndNode()

		if (!startNode || !endNode) {setStatus(1); G_Safety.Searching = false; return}

		startNode.c1 = 0
		let nodesRemaining = [startNode]
		let node, neighbours, neighbour

		function delayedWhile() {
			setTimeout(function() { // Delay searches, for wave effect
				G_nInterations += 1
				// For each node in nodesRemaining get the scores c1 & c2
				node = nodesRemaining.shift()
				if (node !== startNode && node !== endNode) colorNode(node, Colors.InnerRing, Delays.ColorNode) // Color the node that we are removing, therefore enters the inner ring, already checked nodes

				// Construct Path if we have found the end Node
				if (node !== endNode) {
					neighbours = getNeighbourNodes(node, Algo, Diagonals)
					for (let i = 0; i < neighbours.length; i++) {
						neighbour = neighbours[i]

						if (!neighbour) continue;
						
						if (node.c1 + 1 < neighbour.c1) { // Found path that is shorter coming from Node
							if (node.x !== neighbour.x && node.y !== neighbour.y) {
								neighbour.c1 = node.c1 + dDiagonal
							} else {
								neighbour.c1 = node.c1 + 1
							}
							neighbour.previousNode = node

							neighbour.c2 = Algo === "Dijkstra" ? 0 : getHeuristic(Math.abs(neighbour.x - endNode.x), Math.abs(neighbour.y - endNode.y), heuristicType) //  Dijkstra is AStar with c2 set to 0
							neighbour.score = Algo === "Greedy" ? neighbour.c2 : neighbour.c1 + neighbour.c2
							
							if (nodesRemaining.includes(neighbour)) continue

							nodesRemaining.push(neighbour)
							if (neighbour !== startNode && neighbour !== endNode) colorNode(neighbour, Colors.OuterRing, Delays.ColorNode)
						}
					}

					// Sort nodes in nodesRemaining from lowest score (c1+c2) to highest
					nodesRemaining.sort(function(a,b) {return a.score - b.score})
				}

				if (nodesRemaining.length !== 0 && node !== endNode) {
					delayedWhile()
				} else {
					// Retrace the path using node.previousNode property & recursive function
					drawPath(startNode, endNode, Colors, Delays, startT)
				}
			}, Delays.NextIteration)
		}
		delayedWhile()
	} else if (Algo === "BFS" || Algo === "DFS") { // Breadth First Search
		let startNode = getStartNode()  
		let endNode   = getEndNode()

		if (!startNode || !endNode) {setStatus(1); G_Safety.Searching = false; return}

		let priorityQueue = []
		priorityQueue.push(startNode)

		function delayedWhile() {
			setTimeout(function() { // Delay searches, for wave effect
				G_nInterations += 1
				if (priorityQueue.length > 0  && (Algo === "BFS" ? (priorityQueue[0] !== endNode) : (priorityQueue[priorityQueue.length-1] !== endNode))) {
					let currentNode = Algo === "BFS" ? priorityQueue.shift() : priorityQueue.pop()

					if (currentNode !== startNode ) colorNode(currentNode, Colors.InnerRing, Delays.ColorNode)

					let neighbours = getNeighbourNodes(currentNode, Algo, Diagonals)
					
					for (let i = 0; i < neighbours.length; i++) {
						let neighbour = neighbours[i]

						if (neighbour !== startNode && neighbour !== endNode) colorNode(neighbour, Colors.OuterRing, Delays.ColorNode)
							
						neighbour.visited = true
						neighbour.previousNode = currentNode
						priorityQueue.push(neighbour)
					}

					delayedWhile()
				} else {
					drawPath(startNode, endNode, Colors, Delays, startT)
				}
			}, Delays.NextIteration)
		}
		delayedWhile()
	}
} 

function clearPath() {
	if (G_Safety.GeneratingMaze || G_Safety.Searching) return

	G_Nodes.forEach(node => {
		node.c1 = Infinity
		node.c2 = 0
		node.score = 0
		node.previousNode = null
		node.visited = false

		if (!node.isBlocked && !node.isStart && !node.isEnd) {
			node.cycle = 1
			colorNode(node, "rgb(255, 255, 255)", 0)
		}
	})
}
function resetWalls() {
	if (G_Safety.GeneratingMaze || G_Safety.Searching) return

	G_Nodes.forEach(node => {
		node.c1 = Infinity
		node.c2 = 0
		node.score = 0
		node.previousNode = null
		node.visited = false

		if (node.isBlocked) {
			node.cycle = 1
			node.isBlocked = false
			colorNode(node, "rgb(255, 255, 255)", 0)
		}

		if (node.object.style.backgroundColor === "rgb(0, 255, 255)") {
			node.cycle = 1
			colorNode(node, "rgb(255, 255, 255)", 0)
		}
	})

	clearPath()
}

E_FindPath.addEventListener('click', startSearch)
E_ClearPath.addEventListener('click', clearPath)
E_Reset.addEventListener('click', resetWalls)
E_Maze.addEventListener('click', generateMaze)
E_Regen.addEventListener('click', createBaseNodes)

let playingAnim = false, topBarStatus = true, caretIcon = [...E_ToggleTopBar.querySelectorAll("*")][0], dT = 200
E_ToggleTopBar.addEventListener('click', function() {
	if (playingAnim) return

	playingAnim = true
	if (topBarStatus) {
		anime({
			targets: [caretIcon],
			rotate: -180,
			duration: dT,
			easing: 'easeInOutQuad',
		})
		anime({
			targets: [E_TopBar],
			top: '-57px',
			duration: dT,
			easing: 'easeInOutQuad',
			complete: function () {
				topBarStatus = !topBarStatus
				playingAnim = false
			}
		})
	} else {
		anime({
			targets: [caretIcon],
			rotate: 0,
			duration: dT,
			easing: 'easeInOutQuad',
		})
		anime({
			targets: [E_TopBar],
			top: '10px',
			duration: dT,
			easing: 'easeInOutQuad',
			complete: function () {
				topBarStatus = !topBarStatus
				playingAnim = false
			}
		})
	}
})

// ----------------- //


// let oldWindowWidth, oldWindowHeight
// let resizing = false
// window.onresize = function() {
//     if (resizing) return // Rate Limiter

//     resizing = true

//     oldWindowWidth = window.innerWidth
//     oldWindowHeight = window.innerHeight

//     setTimeout(() => {
//         if (window.innerWidth === oldWindowWidth && window.innerHeight === oldWindowHeight) {createBaseNodes()}
//     }, 500)

//     resizing = false
// }

createBaseNodes()
console.log("Loaded.")