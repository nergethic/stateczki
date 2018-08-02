let side = 10 // długość planszy
let animate = TweenMax

let boatsToCreate = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4]
 
let boatsCount = boatsToCreate.length
let opponentBoatsToCreate = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4]
let opponentBoatsCount = opponentBoatsToCreate.length

let playerPoints = 0
let opponentPoints = 0
let destroyedPlayerBoats = 0
let destroyedOpponentBoats = 0

let placedBoats = []  // id statków położonych na planszy

let Directions = {
    Uninitialized: -1,
    NegativeHorizontal: 0,
    Horizontal: 1,
    NegativeVertical: 2,
    Vertical: 3
}

let Colors = {
    Boat: "#E16F7C",
    BoatBorder: "#5F5960",
    BoatShadow: "#B54D59",
    OpponentBoat: "#B388EB",
    OpponentBoatShadow: "#855ABC",
    Water: "A0DFFF",
    Water2: "#A8E2FF",
    CheckOk: "#5EFC8D",
    CheckFailure: "#FE5F55"
}

let Turn = {
    None: 0,
    Player: 1,
    Opponent: 2
}
let turn = Turn.Player

let Entity = {
    Water: 0,
    Boat: 1,
    Bomb: 2,        // niszczy twój losowy statek
    Radar: 3,       // okrężna fala o małym zasięgu, mówi ile statków jest w pobliżu i czy jest bomba
    Radar2: 4,      // po połączeniu 2 radarów: zasięg większy o 1, pokazuje dokładne miejsce bomb w zasięgu
    Flip: 5,        // losowo obraca planszę
    Heal: 6,        // leczy 1 punkt
    Heal2: 7,       // połączenie 2xHeal: leczy 3 wskazane pkt
    Stealth: 8,     // ponownie ukrywa planszę przeciwnika
    Bazooka: 9,     // większe pole rażenia (krzyżyk)
    Laser: 10,      // przeszywa całą kolumnę/
    Trap: 11,       // ty ją rozstawiasz, jeśli przeciwnik w nią trafi ujawsia się pozycja jego statku
    Armor: 12,      // przeciwnik trafia ale zakańcza turę, niszczy się tylko zbroja
    SpikyArmor: 13, // 2x armor: to samo co armor + statek przeciwnika otrzymuje 1pkt obrażeń
    Frost: 14,      // dodatkowa tura dla przeciwnika
    Sonar: 15       // mówi w której cwiartce znajduje się najwięcej statków
}

let GridType = {
    Player: -1,
    Opponent: -1
}

let activeBoat = {    // trzymany statek
    id: -1,
    length: 0,
    direction: Directions.Uninitialized,
    xy: 0
}

// create array, clear it to 0
let playerGrid = []
let opponentGrid = []
let playerShootedGrid = []
for (let i = 0; i < side; ++i) {
    playerGrid[i] = []
    opponentGrid[i] = []
    playerShootedGrid[i] = []
    for (let j = 0; j < side; ++j) {
        playerGrid[i][j] = 0
        opponentGrid[i][j] = 0
        playerShootedGrid[i][j] = 0
    }
}

function get(selector) { // robustness!
    let s = selector.split(".")
    let elems
    let className = ""
    if (selector[0] == "#") {
        let id = s[0].substr(1, s[0].length)
        for (let i = 1; i < s.length; ++i) className += "." + s[i]
        if (className == "")
            elems = document.getElementById(id)
        else
            elems = document.getElementById(id).querySelectorAll(className)
    } else {
        for (let i = 0; i < s.length; ++i) className += "." + s[i]
        elems = document.querySelectorAll(className)
    }

    return elems
}

function getTile(n, type) {
    if (n < 0 || n >= tiles[type].length) {
        console.log("info: getTile out of bounds: i: " + i + " - returning NULL")
        return null
    }

    return tiles[type][n]
}

function getCoords(n, arr) {
    return { x: (n % arr.length),
             y: (Math.floor(n / arr.length)) }
}

function getIDFromCoords(x, y, length) {
    return (y*length+x)
}

function getEnitiyType(n, arr) {
    let pos = getCoords(n, arr)

    if (pos.x < 0 || pos.x >= side) alert("GetEntityCheck faile! out of bounds, x: " + pos.x)
    if (pos.y < 0 || pos.y >= side) alert("GetEntityCheck faile! out of bounds, y: " + pos.y)

    return arr[pos.y][pos.x]
}

function setEntityType(x, y, type, arr) {
    arr[y][x] = type
}

function forEach(selector, f) {
    let elems = get(selector)

    for (let i = 0; i < elems.length; ++i) {
        f(elems[i], i)
    }
}

function isIn(arr, value) { // sprawdź czy dana wartość znajduje się w tablicy
    var result = false
    
    // linear search - reversed because latest boats should be searched first (they are pushed into the array)
    for (let i = arr.length; i >= 0; --i) {
        if (arr[i] == value) {
            result = true;
            break;
        }
    }

    return result
}

let hashEntry = {
    key: -1,
    value: true
}

let halfStates = new Array(20) // change it to linked hash table?
for (let i = 0; i < halfStates.length; ++i) {
    let newHashEntry = Object.assign({}, hashEntry);
    halfStates[i] = newHashEntry
}

function hash(str) // BETTER HASH FUNCTION XD
{
    var hash = 0, i, chr, len;
    if (str.length === 0) return hash;
    
    for (let i = 0, len = str.length; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    
    return Math.abs(hash);
}

function changeHalfState(name) {
    let hashKey = hash(name)
    let slotIndex = hashKey % halfStates.length
 
    if (halfStates[slotIndex].key == -1) {
        halfStates[slotIndex].key = hashKey   
    } else if (halfStates[slotIndex].key != hashKey) {
        // do something smart! linked list? offset?
        alert("HASHTABLE REPEAT DUUUH")
    }
    
    halfStates[slotIndex].value = !halfStates[slotIndex].value
    
    return halfStates[slotIndex].value
}

function checkHorizontally(testX, testY, arr, boat) {
    let result = true
    p1:for (let OffsetY = -1; OffsetY < 2; ++OffsetY) {
        for (let OffsetX = -1; OffsetX < boat.length+1; ++OffsetX) {
            let x = testX+OffsetX
            let y = testY+OffsetY
            if ((testY == 0 && OffsetY == -1) || (testY == arr.length-1 && y == arr.length) || ((testY+boat.length == arr.length) && OffsetY == 1)) continue p1
            if ((testX == 0 && OffsetX == -1) || ((testX+boat.length == arr.length) && OffsetX == boat.length)) continue
            if (x < 0 || x >= arr.length || y < 0 || y >= arr.length) result = false
            else if (arr[y][x] != Entity.Water) result = false
        }
    }

    return result
}

function checkVertically(testX, testY, arr, boat) {
    let result = true
    p1:for (let OffsetX = -1; OffsetX < 2; ++OffsetX) {
        for (let OffsetY = -1; OffsetY < boat.length+1; ++OffsetY) {
            let x = testX+OffsetX
            let y = testY+OffsetY
            if ((testX == 0 && OffsetX == -1) || (testX == arr.length-1 && x == arr.length) || ((testX+boat.length == arr.length) && OffsetX == 1)) continue p1
            if ((testY == 0 && OffsetY == -1) || ((testY+boat.length == arr.length) && OffsetY == boat.length)) continue;
            if (x < 0 || x >= arr.length || y < 0 || y >= arr.length) result = false
            else if (arr[y][x] != Entity.Water) result = false
        }
    }

    return result;
}

function clearLastPreviewCheck(e, arr, boat) {
    let result = true
    let id

    if (e)
        id = e.id.match(/\d+$/)[0]
    else
        id = activeBoat.xy

    let pos = getCoords(id, arr)

    function clear() {
        let tile = getTile(i, GridType.Player)
        if (tile) {
            tile.classList.remove("orange", "red")
            let tileType = getEnitiyType(i, playerGrid)
            if (tileType == Entity.Boat)
                animate.to(tile, .5, {backgroundColor: Colors.Boat, overwrite: "all"})
            else
                animate.to(tile, .5, {backgroundColor: Colors.Water, overwrite: "all"})
        }
    }

    switch (boat.direction) {
        case Directions.Vertical:
            for (let y = pos.y; y < pos.y+boat.length; ++y) {
                i = getIDFromCoords(pos.x, y, arr.length)
                clear()
            }
        break;

        case Directions.Horizontal:
            for (let x = pos.x; x < pos.x+boat.length; ++x) {
                i = getIDFromCoords(x, pos.y, arr.length)
                let tile = getTile(i, GridType.Player)
                clear()
            }
        break;
    }
}

function wiggle(tile) {
    let rand = getRand()
    let grid = ""
    
    if (tile.parentElement.id == playerGrid)
        grid = playerGrid
    else
        grid = opponentGrid
        
    let tileType = getEnitiyType(tile.val.id, grid)
    let scale = (!tile.val.flipped || tileType != Entity.Boat)
    if (changeHalfState(wiggle.name)) { // function uses hash table - we feed unique name to it
        animate.to(tile, .8, {x: rand*1.5, y: 0, ease:Power3.easeOut})
        if (scale == true) animate.to(tile, .8, {scaleX: (0.93+(rand/(50.0))), scaleY: (0.93+(rand/(50.0))), ease:Power3.easeOut})
        animate.to(tile, .8, {rotation: -(rand/(2.0)), ease:Power3.easeOut})
    } else {
        animate.to(tile, .8, {x: 3, y: 0, ease:Power3.easeOut})
        if (scale == true) animate.to(tile, .8, {scaleX: (0.98+(rand/(50.0))), scaleY: (0.98+(rand/(50.0))), ease:Power3.easeOut})
        animate.to(tile, .8, {rotation: (rand/(2.0)), ease:Power3.easeOut})
    }
}

function previewCheck(e, arr, boat) {
    clearLastPreviewCheck(null, arr, boat)
    
    let id

    if (e) { // najechany blok
        id = e.id.match(/\d+$/)[0] // TODO
        activeBoat.xy = id
    } else {
        id = activeBoat.xy
    }

    let testPosition = getCoords(id, arr)

    let result = true
    if (boat.id != -1) { // potrzebne?
        if (boat.direction == Directions.Vertical)
            result = checkVertically(testPosition.x, testPosition.y, arr, boat)
        else
            result = checkHorizontally(testPosition.x, testPosition.y, arr, boat)

        function preview(id, dim) {
            let rand = getRand()
            let tile = getTile(id, GridType.Player)
            if (tile && dim < arr.length) {
                let tileType = getEnitiyType(id, playerGrid)
                if (tileType == Entity.Boat) animate.to(tile, .5, {backgroundColor: Colors.Boat})
                else {
                    if (result == true) { animate.to(tile, .4, {backgroundColor: Colors.CheckOk, overwrite: "all"}); tile.classList.add("orange")}
                    else { animate.to(tile, .4, {backgroundColor: Colors.CheckFailure, overwrite: "all"}); tile.classList.add("red")}
                }

                wiggle(tile)
            }
        }

        switch (boat.direction) {
            case Directions.Vertical:
                for (let y = testPosition.y; y < testPosition.y+boat.length; ++y) {
                    id = getIDFromCoords(testPosition.x, y, arr.length)
                    preview(id, y)
                }
            break;

            case Directions.Horizontal:
                for (let x = testPosition.x; x < testPosition.x+boat.length; ++x) {
                    id = getIDFromCoords(x, testPosition.y, arr.length)
                    preview(id, x)
                }
            break;
        }
    }
}

function check(e, arr) {
    let result = true
    let id = e.id.match(/\d+$/)[0]

    let testPosition = getCoords(id, arr)

    if (activeBoat.id != -1) { // potrzebne?
        if (activeBoat.direction == Directions.Vertical)
            result = checkVertically(testPosition.x, testPosition.y, arr, activeBoat)
        else
            result = checkHorizontally(testPosition.x, testPosition.y, arr, activeBoat)

        function animateCheck(testPosition, i) { 
            let tile = getTile(i, GridType.Player)
            
            if (tile) {
                tile.classList.remove("orange", "red")
                tile.classList.add("boat-block")
                tile.val.length = activeBoat.length
                tile.val.direction = activeBoat.direction
                tile.val.health = 1
                tile.val.head = testPosition.y*arr.length+testPosition.x 
                animate.to(tile, .1, {backgroundColor: Colors.Boat})
                animate.to(tile, .4, {scale: 1})
                animate.to(tile, .4, {rotation: 0})
                animate.to(tile, .4, {x: 0, y: 0})
                animate.to(tile, .4, {border: "1px solid " + Colors.BoatBorder})
                animate.to(tile, .4, {boxShadow: "0px -3px 0px 0px " + Colors.BoatShadow + " inset"})
                animate.to(tile, .4, {margin: "1px"})
            }
        }

        if (result == true) {
            let i = 0
            if (activeBoat.direction == Directions.Vertical) {
                for (let y = testPosition.y; y < testPosition.y+activeBoat.length; ++y) {
                    setEntityType(testPosition.x, y, Entity.Boat, arr)
                    i = getIDFromCoords(testPosition.x, y, arr.length)
                    animateCheck(testPosition, i)
                }
            } else { // horizontal 
                for (let x = testPosition.x; x < testPosition.x+activeBoat.length; ++x) {
                    setEntityType(x, testPosition.y, Entity.Boat, arr)
                    i = getIDFromCoords(x, testPosition.y, arr.length)
                    animateCheck(testPosition, i)
                }
            }

            placedBoats.push(activeBoat.id)
            let div = get("#boat" + activeBoat.id);
            div.removeEventListener("click", selectBoat, true)
            div.remove()

            if (placedBoats.length == boatsCount) {
                let sidebar = get("#sidebar")
        let grid1 = get("#"+playerGridName)
        let grid2 = get("#"+opponentGridName)
        forEach("#"+opponentGridName+".block", function(e) {
            e.addEventListener("click", function() { let that = this; shoot(that, opponentGrid, false) }, false)
        })

        animate.to(sidebar, 1, {x: -450})
        animate.to(grid1, 1, {marginLeft: "calc(10%)"})
        grid1.style.marginLeft = "calc(20%)"
        grid2.style.marginLeft = "20px"
        animate.fromTo(grid2, 3, {opacity: 0}, {opacity: 1})
            }
        } else { // can't put boat here!
            let i = 0
            
            function animateTile(tile) {
                let tl = new TimelineLite();
                tl.to(tile, .1, {x: -5})
                tl.to(tile, .15, {rotation: -4}, "-=0.1")
                tl.to(tile, .1, {x: 5})
                tl.to(tile, .15, {rotation: 4}, "-=0.1")
                tl.to(tile, .1, {x: 0})
                tl.to(tile, .15, {rotation: 0}, "-=0.1")
            }
            
            switch (activeBoat.direction) {
                case Directions.Vertical: {
                    for (let y = testPosition.y; y < testPosition.y+activeBoat.length; ++y) {                    
                        i = getIDFromCoords(testPosition.x, y, arr.length)
                        let tile = getTile(i, GridType.Player)
                        if (tile && y < arr.length)
                            animateTile(tile)
                    }
                } break;
                
                case Directions.Horizontal: {
                    for (let x = testPosition.x; x < testPosition.x+activeBoat.length; ++x) {
                        i = getIDFromCoords(x, testPosition.y, arr.length)
                        let tile = getTile(i, GridType.Player)
                        if (tile && x < arr.length)
                            animateTile(tile)
                    }
                } break;
            }
        }
    }
}

function rotateBoat(boat) {
    let newDirection = Directions.None
    if (boat.direction == Directions.Vertical) newDirection = Directions.Horizontal
    else newDirection = Directions.Vertical

    return newDirection
}

function selectBoat() {
    let change = false
    let lastActiveBoatId = activeBoat.id

    if (activeBoat.id != -1) {
        if (!isIn(placedBoats, activeBoat.id)) {
            if (this.val.length == activeBoat.length && !isIn(placedBoats, activeBoat.id) && lastActiveBoatId) {
            }
            
            let div = document.getElementById("boat" + activeBoat.id);
            let childs = div.childNodes

            for (let i = 0; i < childs.length; ++i) {
                childs[i].style.backgroundColor = Colors.Boat
                childs[i].style.boxShadow = "0px -3px 0px 0px " + Colors.BoatShadow + " inset"
            }

            change = true
            activeBoat.id = -1
        }
    }

    //if (lastActiveBoatId == this.val.id) alert("this")
    if (!change || lastActiveBoatId != this.val.id) {
        activeBoat.id = this.val.id
        activeBoat.length = this.val.length
        activeBoat.direction = Directions.Horizontal

        let childs = this.childNodes
        for (let i = 0; i < childs.length; ++i) {
            childs[i].style.backgroundColor = "#CBEFBF"
            childs[i].style.boxShadow = "0px 3px 0px 0px #BEE0B3 inset"
        }
    }
}

function hoverBoat() {
    if (!isIn(placedBoats, this.val.id) || this.val.length == activeBoat.length) {
        this.style.border = "2px solid white"
        this.style.backgroundColor = "white"
        this.style.padding = "2px"
    }
}

function unHoverBoat() {
    this.style.border = "none"
    this.style.backgroundColor = "#DFFFD6"
    this.style.padding = "4px"
}

let shooted = []
function AIShoot(arr) {

    let id
    do {
        let x = (Math.round(Math.random()*100)) % arr.length
        let y = (Math.round(Math.random()*100)) % arr.length

        id = getIDFromCoords(x, y, arr.length)
        //if (getRand()<0.5) break; // 1 to 0! TODO
    } while (isIn(shooted, id))

    let elem = getTile(id, GridType.Player)
    shoot(elem, arr, true)
    shooted.push(id)
}

function shoot(e, arr, ai) {
    let elemName = "opponent-elem"
    let gridName = "grid2"
    if (ai) {
        elemName = "elem"
        gridName = "grid"
    }

    if (!ai && turn == Turn.Opponent) {
        alert("ruch komputera")
        
        return
    }

    let xy = e.id.match(/\d+$/)[0]
    let testX = xy % arr.length
    let testY = Math.floor(xy / arr.length)

    animate.to(e, .5, {rotationX: 180})

    let type = arr[testY][testX]

    if (e.val.flipped) { // if flipped go to the behaviour of water (only wiggle)
        if (arr[testY][testX] != Entity.Water) type = Entity.Water
    }

    switch (type) {
        case Entity.Water: {
            if (!e.val.flipped) animate.to(e, .3, {backgroundColor: Colors.Water, ease: Expo.easeIn, delay: .1})
            let tl = new TimelineLite();
            tl.to(e, .1, {x: -5})
            tl.to(e, .15, {rotation: -4}, "-=0.1")
            tl.to(e, .1, {x: 5})
            tl.to(e, .15, {rotation: 4}, "-=0.1")
            tl.to(e, .1, {x: 0})
            tl.to(e, .15, {rotation: 0}, "-=0.1")
            if (e.val.flipped) {
                if (ai) {
                        setTimeout(function(){
                            AIShoot(playerGrid)
                        }, 1000)
                    }
                return
            }
            e.val.flipped = true
        } break;

        case Entity.Boat: {
            if (e.val.health != 0) {
                console.log("TRAFIONY!")

                e.val.health--
                e.classList.add("cross")
                let boatColor, boatShadow
                if (ai) {
                    boatColor = Colors.Boat // Colors.Boat
                    boatShadow = Colors.BoatShadow
                    setEntityType(testX, testY, Entity.Boat, playerShootedGrid)
                } else {
                    boatColor = Colors.OpponentBoat
                    boatShadow = Colors.OpponentBoatShadow
                }

                animate.to(e, .5, {backgroundColor: boatColor, border: "1px solid " + Colors.BoatBorder, boxShadow: "0px 3px 0px 0px " + boatShadow + " inset"})
                animate.to(e, .5, {borderRadius: "6px"})
                
                //let destroyedBoat = []
                let points = 0
                if (e.val.direction == Directions.Vertical) {
                    for (let i = 0; i < e.val.length; ++i) {
                        if (document.getElementById(elemName+(e.val.head+i*arr.length)).val.health == 0) {
                            points++
                        } else break;
                    }
                } else {
                    for (let i = 0; i < e.val.length; ++i) {
                        if (document.getElementById(elemName+(e.val.head+i)).val.health == 0) {
                            points++
                        } else break;
                    }
                }

                let x = e.val.head % arr.length
                let y = Math.round(e.val.head / arr.length)

                if (points == e.val.length) {
                    console.log("ZATOPIONY!")
                    if (ai)
                        destroyedPlayerBoats++
                    else
                        destroyedOpponentBoats++

                    function anim(tile) {
                        let tl = new TimelineLite();
                        tl.to(tile, .5, {scale: 1.05, overwrite: "none"})
                        tl.to(tile, 6, {y: 40, overwrite: "none"})
                        tl.to(tile, 6, {rotation: (-60 + rand*(60+60)), overwrite: "none"}, "-=6")
                        tl.to(tile, 10, {scale: 0.4, overwrite: "none"}, "-=6")
                        tl.to(tile, 1, {opacity: 0, overwrite: "none"}, "-=10")

                        setTimeout(function() {
                            tile.classList.remove("boat-block")
                            tile.style.boxShadow = ""
                            tile.style.backgroundColor = Colors.Water
                            tile.style.border = "2px solid white"
                            tile.style.borderRadius = "4px"
                            let tl = new TimelineLite();
                            tl.fromTo(tile, 2, {backgroundColor: Colors.Water}, {backgroundColor: "#8D8D96"}, "-=2")
                            tl.fromTo(tile, 2, {opacity: 0}, {opacity: 0.7}, "-=2")
                            tl.to(tile, 2, {x: 0, y: 0}, "-=2")
                            tl.fromTo(tile, 2, {scale: 1.06}, {scale: 1}, "-=2")
                            tl.to(tile, 2, {rotation: 0}, "-=2")
                        }, 3500)
                    }

                    if (e.val.direction == Directions.Vertical) {
                        for (let i = 0; i < e.val.length; ++i) {
                            let rand = Math.random()
                            let tile = document.getElementById(elemName+(e.val.head+i*arr.length))
                            tile.removeEventListener("click", shoot, false) // TODO dziala?
                            setEntityType(x, y+i, Entity.Water, arr)
                            anim(tile)
                        }
                    } else {
                        for (let i = 0; i < e.val.length; ++i) {
                            let rand = Math.random()
                            let tile = document.getElementById(elemName+(e.val.head+i))
                            tile.removeEventListener("click", shoot, false)
                            setEntityType(x+i, y, Entity.Water, arr)
                            anim(tile)
                        }
                    }
                }

                e.val.flipped = true

                if (ai) {
                    setTimeout(function(){
                        AIShoot(playerGrid)
                    }, 1000)
                    opponentPoints++
                    return
                } else {
                    playerPoints++
                }

                if (ai) {
                    if (destroyedPlayerBoats == boatsCount) {
                        alert("Przegrałeś!")
                    }
                } else {
                    if (destroyedOpponentBoats == opponentBoatsCount) {
                        forEach("#"+opponentGridName+".boat-block", function(en) { // EXPERIMENTAL
                            let R = Math.random()*255
                            let G = Math.random()*255
                            let B = Math.random()*255

                            animate.to(en, 0, {backgroundColor: ("rgba("+R+","+G+","+B+",1)"), ease: Back.easeOut.config(1)})
                        })
						
						alert("Wygrałeś!")
                        window.location.reload()
                    }
                }
            }
        } break;

        case Entity.Flip: {
            let grid = document.getElementById("grid2")
            if (changeHalfState(shoot.name)) { // actual rotation +/- 90*rand
                animate.to("#grid", 1, {rotation: 90, ease: Back.easeOut.config(1)})
                forEach("#grid.boat-block", function(e) {
                    animate.to(e, 1, {rotation: -90, ease: Back.easeOut.config(1)})
                })
            } else animate.to("#grid", 1, {rotation: 0, ease: Back.easeOut.config(1)})
        } break;

        default: {
            alert("ERROR!")
        } break;
    }
    
    if (ai) {
        //if (turn == Turn.Opponent)
            turn = Turn.Player
    } else { // player
       // if (turn == Turn.Player)
            turn = Turn.Opponent
            
        setTimeout(function(){
            AIShoot(playerGrid)
        }, 1000)
    }
}

function generateGrid(name, length, type) {
    let container = document.getElementById("container")
    let grid = document.createElement("div")
    grid.id = name
    grid.val = { type: type }
    grid.classList.add("grid")
    
    container.appendChild(grid)

    switch (type) {
        case GridType.Player: {
            grid.style.marginLeft = "calc(50% - 100px)"

            for (let i = 0; i < (length*length); ++i) {
                var div = document.createElement("div")
                div.id = "elem"+i
                div.classList.add("block")
                div.val = { id: i, length: -1, direction: Directions.None, health: -1, head: -1, flipped: false }
                div.addEventListener("mouseover", function() { let that = this; if (!isIn(placedBoats, activeBoat.id)) previewCheck(that, playerGrid, activeBoat); wiggle(that); }, false)
                div.addEventListener("mouseout", function() { let that = this; if (!isIn(placedBoats, activeBoat.id)) clearLastPreviewCheck(that, playerGrid, activeBoat) }, false)

                div.addEventListener("click", function() {
                    let that = this
                    if (!isIn(placedBoats, activeBoat.id)) {
                        check(that, playerGrid)
                    } else {
                        alert("To twoja plansza, DUUH!")
                    }
                }, false)

                if (i % playerGrid.length == 0) {
                    div.classList.add("clear")
                }

                div.classList.add("left")
                grid.appendChild(div)
            }
        } break;

        case GridType.Opponent: {
            grid.style.opacity = "0"
            for (let i = 0; i < (length*length); ++i) {
                var div = document.createElement("div")
                div.id = "opponent-elem"+i
                div.classList.add("block")
                animate.to(div, 2, {backgroundColor: "#729AFF", ease:SlowMo.easeInOut})
                animate.to(div, 2, {borderRadius: "6px", ease:SlowMo.easeInOut})
                div.val = { id: i, length: -1, direction: Directions.None, health: -1, head: -1, flipped: false }

                //div.addEventListener("click", function() { let that = this; shoot(that, opponentGrid, false) }, false)

                if (i % opponentGrid.length == 0) {
                    div.classList.add("clear")
                }

                div.classList.add("left")
                grid.appendChild(div)
            }

            while (opponentBoatsToCreate.length) {
                let canBePlaced = true

                let boatLength = opponentBoatsToCreate.pop()
                let testX = 0, testY = 0, boatDirection = 0
                
                testX = Math.floor(Math.random() * 10)
                testY = Math.floor(Math.random() * 10)
                boatDirection = (Math.round(Math.random())) ? Directions.Horizontal : Directions.Vertical 

                let boat = {
                    id: -1,
                    length: boatLength,
                    direction: boatDirection,
                    xy: 0
                }

                switch (boatDirection) {
                    case Directions.Vertical:   canBePlaced = checkVertically(testX, testY, opponentGrid, boat);   break;
                    case Directions.Horizontal: canBePlaced = checkHorizontally(testX, testY, opponentGrid, boat); break;
                    default: alert("ERROR"); break;
                }
				
				if (testY == side-1) canBePlaced = false
                
                if (canBePlaced) {
                    function f(tile, testX, testY) {
                        if (tile) {
                            tile.classList.add("boat-block")
                            tile.val.length = boat.length
                            tile.val.direction = boat.direction
                            tile.val.health = 1
                            tile.val.head = testY*opponentGrid.length+testX
                        }
                    }
                    let id = 0
                    if (boatDirection == Directions.Vertical) {
                        for (let y = testY; y < testY+boatLength; ++y) {
                            setEntityType(testX, y, Entity.Boat, opponentGrid)
                            id = getIDFromCoords(testX, y, opponentGrid.length)
                            let tile = document.getElementById("opponent-elem"+id.toString())
                            f(tile, testX, testY)
                        }
                    } else {
                        for (let x = testX; x < testX+boatLength; ++x) {
                            setEntityType(x, testY, Entity.Boat, opponentGrid) 
                            id = getIDFromCoords(x, testY, opponentGrid.length)
                            let tile = document.getElementById("opponent-elem"+id.toString())
                            f(tile, testX, testY)
                        }
                    }

                } else {
                    opponentBoatsToCreate.push(boatLength)
                }
            }
        } break;

        default: {
            alert("ERROR!")
        } break;
    }
}

function configureRightClick() {
    function preview() {
        if (activeBoat.id != -1 && (!isIn(placedBoats, activeBoat.id))) {
            clearLastPreviewCheck(null, playerGrid, activeBoat)
            activeBoat.direction = rotateBoat(activeBoat)
            previewCheck(null, playerGrid, activeBoat)
        }
    }
    
    if (document.addEventListener) { // IE >= 9; other browsers
        document.addEventListener('contextmenu', function(e) {
            preview()
            e.preventDefault()
        }, false)
    } else { // IE < 9
        document.attachEvent('oncontextmenu', function() {
            preview()
            window.event.returnValue = false;
        })
    }
}

function handleWindowResize() {
    let height = document.documentElement.clientHeight
    let grids = document.querySelectorAll(".grid")
    for (let i = 0; i < grids.length; ++i) {
        let gridHeight = grids[i].offsetHeight
        grids[i].style.marginTop = ((height/(2.0))-(gridHeight/(2.0))-110)+"px"
    }
}

function generateSidebar() {
    let sidebar = document.getElementById("sidebar")

    for (let i = boatsToCreate.length-1; i >= 0; --i) {

        let newBoat = document.createElement("div");
        newBoat.classList.add("boat")
        newBoat.val = {id: i}

        for (let j = 0; j < boatsToCreate[i]; ++j) {
            let block = document.createElement("div");
            if (j == 0) block.classList += "clear ";
            block.classList += "small-boat-block left";
            newBoat.id = "boat" + (i+j)
            newBoat.val = { id: (i+j), length: boatsToCreate[i] }
            newBoat.addEventListener("mouseover", hoverBoat, false)
            newBoat.addEventListener("mouseout", unHoverBoat, true)
            newBoat.addEventListener("click", selectBoat, true)
            newBoat.appendChild(block)
        }

        let marginDiv = document.createElement("span")
        marginDiv.classList.add("marginDiv", "left")

        sidebar.appendChild(newBoat)
        sidebar.appendChild(marginDiv)
    }
}

function changeCursor() {
    //document.body.style.cursor = "url(circle.png) 25 15, auto"
    //document.styleSheets[0].insertRule('*{cursor:url(circle.png), defaul‌​t !important;}',0)
}