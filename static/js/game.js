import { Board } from "./board.js";
import { 
    icons,
    draw_board,
    visualise_valid_squares, 
    add_drag, initDrag, setDisableDrag,
    rotate, is_rotated, 
    getIds, 
    isPromotion, showPromotionBar
} from "./utils.js";

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
draw_board(b.board);
// message.innerText = b.move == 'w' ? 'white to play' : 'black to play';

let cur_move = 0;

// Global variables for analysis
let latestEval = '';
let latestBestMove = '';
let isAnalyzing = false;
let stockfish = null; // Global stockfish worker

initDrag({
    getBoard: () => b,
    movemake: movemake,
    is_rotated: () => is_rotated,
    disableDragRef: { value: false },
});

document.addEventListener('DOMContentLoaded', function() {
    // Create a Web Worker from the stockfish.js file
    stockfish = new Worker('/static/js/stockfish.wasm.js');
    
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
                latestEval = "M"+ (mateMatch ? mateMatch[1] : "?");
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
        

        // Store best move when found
        if (message.startsWith('info') && message.includes('depth')) {
            const {depth, moves} = parseEvalInfo(message);
            latestBestMove = moves[0];
            // Display both evaluation and best move
            if (latestEval) {
                const sanLine = uciLineToSanLine(moves, b.get_full_fen());
                outputElement.innerHTML = `
                    <div><strong>Evaluation:</strong> ${latestEval}</div>
                    <div><strong>depth: </strong>${depth}</div>
                    <div><strong></strong>${sanLine}</div>
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
            
            stockfish.postMessage('position fen ' + fen);
            stockfish.postMessage('go depth 18');
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
        stockfish.postMessage('go depth 18');
    }
}

function uciLineToSanLine(moves, initialFen) {
    const board = new Board(initialFen);
    const sanMoves = [];

    for (const move of moves) {
        const from = board.to_id(move.slice(0, 2));
        const to = board.to_id(move.slice(2, 4));
        const promotion = move.length > 4 ? move[4] : false;
        let san;
        try{
            san = board.make_move(from, to, board.board, board.move, promotion);
            if ((san === 'Kg1' && move === 'e1g1') || (san === 'Kg8' && move === 'e8g8')) san = '0-0';
            if ((san === 'Kc1' && move === 'e1c1') || (san === 'Kc8' && move === 'e8c8')) san = '0-0-0';
        }catch{san = ''}
        
        sanMoves.push(san + (promotion ? '='+move[4] : ''));
    }

    return sanMoves.join(' ');
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
                movemake(
                    ids[0], ids[1], 
                    b.valid_moves_of(ids[0], false, b.board, b.move, piece.toLowerCase()),
                    false,
                    latestBestMove.length == 5 ? latestBestMove[4] : null);
                // Trigger analysis after move is made
                triggerAnalysis();
            }
        }
    }
}

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
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

function piece_click(e){
}

function pgn_click(e){
    let move_num = parseInt(e.target.id.slice(1));
    pgn_nav(move_num)
}    
function pgn_nav(move_num){
    if(move_num >= 0){
        b = new Board(start_fen);
        draw_board(b.board);

        if(move_num != from_tos.length){setDisableDrag(true);}
        else{setDisableDrag(false);}

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
function movemake(start_square_id, square_id, valid_moves, forpgnnav=false, stockfishPromotedPiece=null){
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
            if(stockfishPromotedPiece != null) {
                handlePgnNavPromotion(start_square_id, square_id, b.move == "w" ? stockfishPromotedPiece.toUpperCase() :stockfishPromotedPiece);
                updatePgn(b.to_readable(square_id)+"="+stockfishPromotedPiece.toUpperCase(), start_square_id, square_id, true);
            }else{
                showPromotionBar(square_id, start_square_id);
                setupPromotionSelection(start_square_id, square_id, forpgnnav);
            }
        }
    } else {
        handleRegularMove(start_square_id, square_id, forpgnnav);
    }

    visualise_valid_squares(valid_moves, true);
    valid_moves = [];
}