import { Board, icons } from "./board.js";

const movesound = new Audio('/static/images/move.mp3');
movesound.volume = 0.7;

//from_tos = from_tos ? from_tos : [] ;
let pgn = document.getElementById('pgn');
const pgn_text_area = document.getElementById('pgn_textarea');
const printButton = document.getElementById('printButton');
//let message = document.getElementById('message');


window.firstmove = firstmove;
window.prevmove = prevmove;
window.play = play;
window.nextmove = nextmove;
window.lastmove = lastmove;

window.rotate = rotate;
window.piece_click = piece_click;
window.pgn_click = pgn_click;

let b = new Board(start_fen);

// message.innerText = b.move == 'w' ? 'white to play' : 'black to play';

let cur_move = 0;

// Global variables for analysis
let latestEval = '';
let latestBestMove = '';
let isAnalyzing = false;
let stockfish = null; // Global stockfish worker

document.addEventListener('DOMContentLoaded', function() {
    // Create a Web Worker from the stockfish.js file
    stockfish = new Worker('/static/js/stockfish.js');
    
    // Reference to output element
    const outputElement = document.getElementById('output');
    
    // Set up event listener for messages from the engine
    stockfish.onmessage = function(event) {
        const message = event.data;
        
        // Capture evaluation information
        if (message.startsWith('info') && message.includes('score cp') || message.includes("mate")) {
            // Extract score information
            
            if(message.includes("mate")){
                const mateMatch = message.match(/ mate (\d+)/);
                latestEval = "M"+mateMatch[1];
            }else{
            
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                let score = parseInt(scoreMatch[1]) / 100;
                
                if (b.move === 'b') {
                    score = -score;
                }
                latestEval = score > 0 ? `+${score}` : `${score}`;
            }
            }
        }
        

        //console.log(message)
        // Store best move when found
        if (message.startsWith('info') && message.includes('depth')) {
            const {depth, moves} = parseEvalInfo(message);
            latestBestMove = moves[0];
            // Display both evaluation and best move
            if (latestEval) {
                outputElement.innerHTML = `
                    <div><strong>Evaluation:</strong> ${latestEval}</div>
                    <div><strong>depth: </strong>${depth}</div>
                    <div><strong></strong>${moves.join(' ')}</div>
                    <div class="hint">Press SPACE to make this move</div>
                `;
            } else {
                outputElement.innerHTML = `
                    <div><strong>Best move:</strong> ${latestBestMove}</div>
                    <div class="hint">Press SPACE to make this move</div>
                `;
            }
        }
    };
    
    // Initialize the engine
    stockfish.postMessage('uci');
    
    // Set up the analyze toggle
    document.getElementById('analyze-btn').addEventListener('change', function() {
        isAnalyzing = this.checked;
        if (isAnalyzing) {
            // Clear previous output
            outputElement.innerHTML = 'Analyzing...';
            
            const fen = b.get_full_fen();
            console.log(fen);
            stockfish.postMessage('position fen ' + fen);
            stockfish.postMessage('go depth 17');
        } else {
            outputElement.innerHTML = '';
            latestEval = '';
            latestBestMove = '';
        }
    });
});

function parseEvalInfo(inputString) {
    // Extract the depth
    const depthMatch = inputString.match(/depth (\d+)/);
    const depth = depthMatch ? depthMatch[1] : null;
    
    // Extract the moves from the PV (principal variation)
    
    const moves = inputString.split('pv')[2].trim().split(' ').slice(0, 6);
   
    return {
        depth,
        moves
    };
  }

// Function to trigger analysis
function triggerAnalysis() {
    if (isAnalyzing && stockfish) {
        const outputElement = document.getElementById('output');
        outputElement.innerHTML = 'Analyzing...';
        const fen = b.get_full_fen();
        stockfish.postMessage('position fen ' + fen);
        stockfish.postMessage('go depth 15');
    }
}

function parsePGN(pgn) {
    // Remove headers
    let moves = pgn.replace(/\[.*?\]\s*/g, "").trim();  // Removes headers
    moves = moves.replace(/\d+\.\s+/g, ""); // Removes move numbering if needed

    // Split moves by spaces
    let moveList = moves.split(/\s+/);

    if (moveList[moveList.length - 1] === "*") {
        moveList.pop();  // Removes the last element (the asterisk)
    }

    return moveList;
}
// render png panel when loading new game
function renderPGN(pgn_str) {

    const moveList = parsePGN(pgn_str);

    let b = { half_moves: 1, full_moves: 1, move: 'w' };  // Initial values for black and white turns
    let fullmovediv = document.createElement('div');
    fullmovediv.id = 'move' + b.full_moves;
    moveList.forEach((move, index) => {

        const m = document.createElement('p');
        //m.style.position = 'absolute';
        m.innerText = move;
        m.id = 'm' + b.half_moves;
        m.classList.add('pgn-move');

        if (b.move === 'w') {
            let fullmovediv = document.createElement('div');
            fullmovediv.id = 'move' + b.full_moves;
            const movenum = document.createElement('p');
            movenum.innerText = b.full_moves + '.';
            fullmovediv.appendChild(movenum);
            m.style.left = '70px';
            fullmovediv.appendChild(m);
            pgn.appendChild(fullmovediv);
        } else {
            try {
                let fullmovediv = document.getElementById('move' + (b.full_moves - 1));
                m.style.left = '180px';
                fullmovediv.appendChild(m);
            } catch (error) { // first move is black
                let fullmovediv = document.createElement('div');
                fullmovediv.id = 'move' + (b.full_moves - 1);
                pgn.appendChild(fullmovediv);
                m.style.left = '180px';
                fullmovediv.appendChild(m);
            }
        }

        // Alternate turns
        if (b.move === 'w') {
            b.move = 'b'; // Switch to black's turn
            b.full_moves++;
            b.half_moves++;
        } else {
            b.move = 'w'; // Switch to white's turn
            b.half_moves++;
        }
    });
}

if (pgn_str != ''){
    pgn_text_area.value = pgn_str;
    renderPGN(pgn_str)}

let is_rotated = false;
if(b.move == 'b'){
    rotate();
}

add_drag(b.move);

document.onkeydown = (e) =>{
    // Check if modal is present
    if (document.getElementById('saveGameModal')) {
        return; // Exit if modal is shown
    }

    if (e.code == 'ArrowLeft'){
        prevmove();
    }
    if (e.code == 'ArrowRight'){
        nextmove();
    }
    if (e.code == 'Space'){
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn.checked && latestBestMove) {
            const ids = getIds(latestBestMove);
            const piece = b.get_bpiece_by_id(ids[0], b.board);
            if (piece) {
                movemake(ids[0], ids[1], b.valid_moves_of(ids[0], false, b.board, b.move, piece.toLowerCase()));
                // Trigger analysis after move is made
                triggerAnalysis();
            }
        }
    }
}

function firstmove(){
    pgn_nav(0);
}
function prevmove(){
    if (cur_move > 0){
        pgn_nav(cur_move-1);
    }
}
async function play(){
    while (cur_move < from_tos.length){
        nextmove();
        await sleep(1000);
    }
}
function nextmove(){
    if (cur_move < from_tos.length){
        pgn_nav(cur_move+1);
    }
}
function lastmove(){
    pgn_nav(from_tos.length);
}

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
    //if(e.target.tagName == 'IMG'){console.log(e.target.parentNode.id)}
    //else{console.log(e.target.id)}
    //b.clicked(e)
}

function pgn_click(e){
    let move_num = parseInt(e.target.id.slice(1));
    pgn_nav(move_num)
}    
function pgn_nav(move_num){
    if(move_num >= 0){
        b = new Board(start_fen);
        for(let i = 0; i < move_num; i++){
            if (from_tos[i].length == 3){  // promotion
                movemake(from_tos[i][0], from_tos[i][1], [from_tos[i][1]], from_tos[i][2]);
            }else{
                movemake(from_tos[i][0], from_tos[i][1], [from_tos[i][1]], true);
            }
        }
        cur_move = move_num;
    }
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
    // prevent adding new move branch
    if (cur_move !== from_tos.length){return}

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

// handle PGN navigation promotion
function handlePgnNavPromotion(start_square_id, square_id, forpgnnav) {
    document.getElementById(start_square_id).innerHTML = '';
    document.getElementById(square_id).innerHTML = icons.get(forpgnnav);
    b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, forpgnnav);
    add_drag(b.move);
}

// handle promoted piece selection process
function setupPromotionSelection(start_square_id, square_id, forpgnnav) {
    document.getElementById('promotion-bar').onclick = function(e){
        e.stopPropagation();
        document.getElementById(square_id).innerHTML = '';
        document.getElementById('promotion-bar').style.visibility = 'hidden';
        let move;
        if (e.target.tagName == 'IMG'){
            document.getElementById(start_square_id).innerHTML = '';
            document.getElementById(square_id).appendChild(e.target);
            move = b.to_readable(square_id)+'='+e.target.className.toUpperCase();
        }
        else{
            move = b.to_readable(square_id)+'='+e.target.childNodes[0].className.toUpperCase();
            document.getElementById(square_id).appendChild(e.target.childNodes[0]);
        }

        b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, e.target.className);

        if (b.is_check(b.move)){
            move += '+';
        }
        if (b.is_checkmate(b.move)){
            move = move.replace('+','#');
        }

        if (!forpgnnav){
            updatePgn(move, start_square_id, square_id, true);
        }
        
        movesound.play();
        add_drag(b.move);
        triggerAnalysis();
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
function handleRegularMove(start_square_id, square_id, forpgnnav) {
    document.getElementById(square_id).innerHTML = document.getElementById(start_square_id).innerHTML;
    document.getElementById(start_square_id).innerHTML = '';
    
    if(forpgnnav) {
        b.cur_white_castles=[true,true];
        b.cur_black_castles=[true,true];
    }
    
    let move = b.make_move(parseInt(start_square_id), parseInt(square_id));
    if (b.is_checkmate(b.move)){
        move = move.replace('+','#');
    }
    
    if (!forpgnnav){
        updatePgn(move, start_square_id, square_id, false);
    }

    movesound.play();
    add_drag(b.move);
    triggerAnalysis();
}

// Update the PGN notation
function updatePgn(move, start_square_id, square_id, isPromotion) {
    const m = document.createElement('p');
    m.innerText = move;
    m.id = 'm'+b.half_moves;
    m.classList.add('pgn-move');
    
    if (b.move == 'b'){
        let fullmovediv = document.createElement('div');
        fullmovediv.id = 'move'+b.full_moves;
        const movenum = document.createElement('p');
        movenum.innerText = b.full_moves+'.';
        fullmovediv.appendChild(movenum);
        m.style.left = '70px';
        fullmovediv.appendChild(m);
        pgn.appendChild(fullmovediv);
        
        if (isPromotion) {
            from_tos.push([parseInt(start_square_id), square_id, move[3]]);
        } else {
            from_tos.push([parseInt(start_square_id), square_id]);
        }
        
        unsaved_pgn_string += b.full_moves+'. ';
    } else {
        try {
            let fullmovediv = document.getElementById('move'+(b.full_moves-1));
            if(!fullmovediv && isPromotion){
                fullmovediv = document.createElement('div');
                fullmovediv.id = 'move'+b.full_moves;
                const movenum = document.createElement('p');
                movenum.innerText = b.full_moves+'.';
                fullmovediv.appendChild(movenum);
                pgn.appendChild(fullmovediv);
            } else if (!fullmovediv) { // first move is black
                fullmovediv = document.createElement('div');
                fullmovediv.id = 'move'+(b.full_moves-1);
                pgn.appendChild(fullmovediv);
            }
            m.style.left = '180px';
            fullmovediv.appendChild(m);
            
            if (isPromotion) {
                from_tos.push([parseInt(start_square_id), square_id, move[3].toLowerCase()]);
            } else {
                from_tos.push([parseInt(start_square_id), square_id]);
            }
        } catch (error) {
            console.error("Error updating PGN for black move:", error);
        }
    }
    
    unsaved_pgn_string += move + ' ';
    pgn_text_area.value = unsaved_pgn_string;
    cur_move++;
}

// main move function
function movemake(start_square_id, square_id, valid_moves, forpgnnav=false){
    if (!valid_moves.includes(square_id)){
        // remove visuals for valid squares
        visualise_valid_squares(valid_moves, true); 
        valid_moves = [];
        return;
    }
    
    const promotion = isPromotion(start_square_id, square_id);

    if (promotion){
        if(forpgnnav){
            handlePgnNavPromotion(start_square_id, square_id, forpgnnav);
        } else {
            showPromotionBar(square_id, start_square_id);
            setupPromotionSelection(start_square_id, square_id, forpgnnav);
        }
    } else {
        handleRegularMove(start_square_id, square_id, forpgnnav);
    }

    visualise_valid_squares(valid_moves, true);
    valid_moves = [];
}