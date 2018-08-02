let tiles = []
let playerGridName = "grid"
GridType.Player = 0
let opponentGridName = "grid2"
GridType.Opponent = 1

window.onload = function() {
    changeCursor() // TODO

    configureRightClick()

    generateGrid(playerGridName, side, GridType.Player)
    generateGrid(opponentGridName, side, GridType.Opponent)
    

    forEach("grid", function(grid, i) {
            tiles[i] = []
        forEach("#"+grid.id+".block", function(tile, j) {
            tiles[i].push(tile)
        })
    })

    handleWindowResize()
    generateSidebar()
}