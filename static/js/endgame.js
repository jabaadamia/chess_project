import { Board, icons } from "./board.js";

const movesound = new Audio('/static/images/move.mp3');
movesound.volume = 0.7;

window.rotate = rotate;
window.piece_click = piece_click;

let b = new Board(start_fen);

let cur_move = 0;

let latestBestMove = '';
let stockfish = null; // Global stockfish worker
let resolveBestMove = null;

document.addEventListener('DOMContentLoaded', function() {
    // Create a Web Worker from the stockfish.js file
    stockfish = new Worker('/static/js/stockfish.js');
    
    // Initialize variables to store analysis results
    latestBestMove = '';
    
    // Set up event listener for messages from the engine
    stockfish.onmessage = function(event) {
        const message = event.data;
        
        // Store best move when found
        if (message.startsWith('bestmove')) {
            const moveMatch = message.match(/bestmove (\S+)/);
            if (moveMatch) {
                latestBestMove = moveMatch[1];
                // Resolve the Promise if someone is waiting
                if (resolveBestMove) {
                    resolveBestMove(latestBestMove);
                    resolveBestMove = null; // Reset
                }
            }
        }
    };
    
    // Initialize the engine
    stockfish.postMessage('uci');
});

// Function to trigger analysis
function triggerAnalysis() {
    return new Promise((resolve) => {
        if (!stockfish) {
            console.error("Stockfish not initialized");
            resolve(null);
            return;
        }

        const fen = b.get_full_fen();
        stockfish.postMessage('position fen ' + fen);
        stockfish.postMessage('go depth 15'); // Adjust depth as needed

        // Store the resolver to be called when bestmove arrives
        resolveBestMove = resolve;
    });
}

// Function to get the best move (can be called after analysis)
async function getBestMove() {
    const bestMove = await triggerAnalysis();
    return bestMove;
}

let is_rotated = false;
if(b.move == 'b'){
    rotate();
}

add_drag(b.move);

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rotate(){
    is_rotated = !is_rotated;
    b.rotated = is_rotated;
    b.rotate_board();
    b.rotate_board();
    add_drag(b.move);  // needs to be fixed
}

function piece_click(e){
}

function add_drag(move){
    if(move === 'w'){     // add drag events to white pieces
        ['P','R','N','B','Q','K']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: all; z-index: 3;';
                p.onmousedown = dragMouseDown;
                p.ontouchstart = dragMouseDown;  // Add touch event
            });
        });
        ['p','r','n','b','q','k']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: none; z-index: 2;';
                p.onmousedown = null;
                p.ontouchstart = null;  // Remove touch event
            });
        });
    }else{  // add drag events to black pieces
        ['p','r','n','b','q','k']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: all; z-index: 2;';
                p.onmousedown = dragMouseDown;
                p.ontouchstart = dragMouseDown;  // Add touch event
            });
        });
        ['P','R','N','B','Q','K']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: none; z-index: 1;';
                p.onmousedown = null;
                p.ontouchstart = null;  // Remove touch event
            });
        });
    }
}


let dragging_piece;
let valid_moves;// ids of valid moves of dragging_piece
let start_square_id;  // on which dragging_piece is

var pos1;
var pos2;
var pos3;
var pos4;

var top;
var left;

function visualise_valid_squares(valid_moves, remove){
    valid_moves.forEach(square_id => {
        const square = document.getElementById(square_id);
        if (remove){
            const circle = square.querySelector('.circle');
            if (circle) {
                square.removeChild(circle);
            }else{square.style.backgroundColor = ''}
        }else{
            if (square.children.length === 0) {
                const circle = document.createElement('span');
                circle.className = 'circle';
                square.appendChild(circle);
            }else{square.style.backgroundColor = '#f5a142';}
        }
    });
}

function get_square_id(top, left){
    const board = document.getElementById('wrapper');
    const squareSize = board.offsetWidth / 8;
    const row = Math.floor((top + squareSize/2)/squareSize);
    const col = Math.floor((left + squareSize/2)/squareSize);
    if (is_rotated){
        return (9-(col + 1))*10 + 9-(8 - row);
    }
    return (col + 1)*10 + (8 - row);
}

// when piece is grabed
function dragMouseDown(e) {
    valid_moves = b.valid_moves_of(parseInt(this.parentNode.id), false, b.board, b.move, this.classList[0].toLowerCase());
    start_square_id = this.parentNode.id;

    visualise_valid_squares(valid_moves, false);

    dragging_piece = this;
    dragging_piece.style.position = 'absolute';
    dragging_piece.classList.add('dragging');
    
    if (e.type === 'touchstart') {
        e.preventDefault(); // Prevent scrolling while dragging
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementDrag;
    } else {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
}

//when grabbing piece is moveing
function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();

    if (e.type === 'touchmove') {
        pos1 = pos3 - e.touches[0].clientX;
        pos2 = pos4 - e.touches[0].clientY;
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
    } else {
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
    }

    top = dragging_piece.offsetTop - pos2;
    left = dragging_piece.offsetLeft - pos1;

    dragging_piece.style.top = (top) + "px";
    dragging_piece.style.left = (left) + "px";     
}

// when piece is placed
function closeDragElement() {
// stop moving when mouse button is released:

    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;

    const board = document.getElementById('wrapper');
    const squareSize = board.offsetWidth / 8;
    const boardRect = board.getBoundingClientRect();

    // Calculate the final position relative to the board
    const finalTop = top;
    const finalLeft = left;

    // Calculate the target square
    const row = Math.floor((finalTop + squareSize/2)/squareSize);
    const col = Math.floor((finalLeft + squareSize/2)/squareSize);

    let square_id;
    if (is_rotated){
        square_id = (9-(col + 1))*10 + 9-(8 - row);
    } else {
        square_id = (col + 1)*10 + (8 - row);
    }

    dragging_piece.style.position = 'relative';
    dragging_piece.style.left = '';
    dragging_piece.style.top = '';
    dragging_piece.classList.remove('dragging');
    movemake(start_square_id, square_id, valid_moves);
}

function getIds(move) {
    const from = b.to_id(move.slice(0, 2));
    const to = b.to_id(move.slice(2, 4));
    
    return [from, to];
}

// check if a move is a pawn promotion
function isPromotion(start_square_id, square_id) {
    return (square_id % 10 == 8 && document.getElementById(start_square_id).childNodes[0].classList.contains('P')) ||
           (square_id % 10 == 1 && document.getElementById(start_square_id).childNodes[0].classList.contains('p'));
}

// show the promotion bar for selecting a promotion piece
function showPromotionBar(square_id, start_square_id) {
    let bar = document.getElementById('promotion-bar');
    const board = document.getElementById('wrapper');
    const squareSize = board.offsetWidth / 8;
    const boardRect = board.getBoundingClientRect();
    const isWhite = square_id % 10 == 8;
    
    let t = isWhite ? 0 : board.offsetHeight - squareSize*4;
    let l = boardRect.left + squareSize*((square_id-square_id%10)/10-1);
    if (is_rotated){
        t = isWhite ? board.offsetHeight - squareSize*4 : 0;
        l = boardRect.left + squareSize*(9-(square_id-square_id%10)/10-1);
    }
    
    bar.style = 'visibility: visible; width: '+(squareSize-2)+'px; top: '+t+'px; left: '+l+'px;';
    for (let i = 0; i < 4; i++){
        const element = bar.childNodes[2*i+1];
        element.style = 'width: '+(squareSize-2)+'px; height: '+squareSize+'px;';
        let img = icons.get(isWhite ? ['Q', 'R', 'B', 'N'][i] : ['q', 'r', 'b', 'n'][i]);
        element.innerHTML = img;
    }
}

// handle promoted piece selection process
function setupPromotionSelection(start_square_id, square_id) {
    document.getElementById('promotion-bar').onclick = function(e){
        e.stopPropagation();
        document.getElementById(square_id).innerHTML = '';
        document.getElementById('promotion-bar').style.visibility = 'hidden';
        if (e.target.tagName == 'IMG'){
            document.getElementById(start_square_id).innerHTML = '';
            document.getElementById(square_id).appendChild(e.target);
        }
        else{
            document.getElementById(square_id).appendChild(e.target.childNodes[0]);
        }

        b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, e.target.className);

        movesound.play();
        add_drag(b.move);
        if (b.is_checkmate(b.move)){
            console.log("checkmate")
        }else{
            makeStockFishMove();    
        }
    }
    
    // setup click outside handler to hide promotion bar
    const hide = function (e) {
        const bar = document.getElementById('promotion-bar');
        if (bar.style.visibility !== 'hidden' && !bar.contains(e.target)) {
            bar.style.visibility = 'hidden';
        }
    };
    setTimeout(() => {
        document.getElementById('wrapper').addEventListener('mousedown', hide);
    }, 100);
}

// handle regular (non-promotion) moves
function handleRegularMove(start_square_id, square_id) {
    document.getElementById(square_id).innerHTML = document.getElementById(start_square_id).innerHTML;
    document.getElementById(start_square_id).innerHTML = '';
    
    let move = b.make_move(parseInt(start_square_id), parseInt(square_id));
    if (b.is_checkmate(b.move)){
        move = move.replace('+','#');
    }
    
    movesound.play();
    add_drag(b.move);
    cur_move++;
}


// main move function
function movemake(start_square_id, square_id, valid_moves, stockfish=false){
    if (!valid_moves.includes(square_id)){
        // remove visuals for valid squares
        visualise_valid_squares(valid_moves, true); 
        valid_moves = [];
        return;
    }
    
    const promotion = isPromotion(start_square_id, square_id);

    if (promotion){
        showPromotionBar(square_id, start_square_id);
        setupPromotionSelection(start_square_id, square_id);
    } else {
        handleRegularMove(start_square_id, square_id);
        if (b.is_checkmate(b.move)){
            markEndgameAsSolved();
        }else{
            if (!stockfish){
                makeStockFishMove()
            }
        }
    }

    visualise_valid_squares(valid_moves, true);
    valid_moves = [];

}

function makeStockFishMove(){
    getBestMove().then(bestMove => {
        const ids = getIds(latestBestMove);
        const piece = b.get_bpiece_by_id(ids[0], b.board);
        movemake(ids[0], ids[1], b.valid_moves_of(ids[0], false, b.board, b.move, piece.toLowerCase()), true);
    });
}


async function markEndgameAsSolved() {
    fetch(window.location.href, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(async data => {
        if (data.solved && data.next_endgame_id) {
            // Redirect to the next endgame
            await sleep(500);
            window.location.href = `/study/endgames/${category}/${data.next_endgame_id}`;
        } else if (data.error) {
            console.error('Error:', data.error);
        }
    })
    .catch(error => {
        console.error('Network error:', error);
    });
}

function getCSRFToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return '';
}
