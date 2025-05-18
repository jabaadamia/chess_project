import { Board } from "./board.js";
import { 
    icons,
    draw_board,
    visualise_valid_squares, 
    add_drag, initDrag, 
    getCSRFToken, 
    rotate, is_rotated, 
    getIds, 
    isPromotion, showPromotionBar 
} from "./utils.js";

const movesound = new Audio('/static/images/move.mp3');
movesound.volume = 0.7;

window.firstmove = ()=>{};
window.prevmove = ()=>{};
window.play = ()=>{};
window.nextmove = ()=>{};
window.lastmove = ()=>{};

window.rotate = rotate;
window.piece_click = piece_click;

let b = new Board(start_fen);
draw_board(b.board);
let playerColor = b.move;
let disableDrag = false;

let cur_move = 0;

let latestBestMove = '';
let latestEvalScore = 0;
let stockfish = null; // Global stockfish worker
let resolveBestMove = null;


initDrag({
    getBoard: () => b,
    movemake: movemake,
    is_rotated: () => is_rotated,
    disableDragRef: { value: false },
});

window.resetEndgame = resetEndgame;
function resetEndgame(){    
    b = new Board(start_fen);
    draw_board(b.board);
    playerColor = b.move;
    cur_move = 0;
    const alertBox = document.getElementById('try-again-alert');
    if (alertBox) {
      alertBox.remove();
    }
    disableDrag = false;
    add_drag(b.move);
}

document.addEventListener('DOMContentLoaded', function() {
    // Create a Web Worker from the stockfish.js file
    stockfish = new Worker('/static/js/stockfish.wasm.js');
    
    // Initialize variables to store analysis results
    latestBestMove = '';
    
    // Set up event listener for messages from the engine
    stockfish.onmessage = function(event) {
        const message = event.data;
        
        if (message.startsWith('info') && message.includes('score cp')) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            latestEvalScore = parseInt(scoreMatch[1]) / 100;
            if (b.move === 'b') {
                latestEvalScore = -latestEvalScore;
            }
        }

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
        stockfish.postMessage('go depth 17'); // Adjust depth as needed

        // Store the resolver to be called when bestmove arrives
        resolveBestMove = resolve;
    });
}

// Function to get the best move (can be called after analysis)
async function getBestMove() {
    const bestMove = await triggerAnalysis();
    return bestMove;
}

if(b.move == 'b'){
    rotate();
}

add_drag(b.move);

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}


function piece_click(e){
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
        check_status(false);
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

const check_status = (stockfish) => {
    const endedDraw = (b.full_moves > 50 && latestEvalScore <= 1 || b.is_insufficient_material()) || b.is_stealmate();
    // draw acomplished
    if(endedDraw){
        if(!is_win){
            markEndgameAsSolved();
        }else{
            handleReset();
        }
    }else if (b.is_checkmate(b.move)){
        if(b.move != playerColor){
            markEndgameAsSolved();
        }else{
            handleReset();
        }
    }else{
        if (!stockfish){
            makeStockFishMove();
        }
    }
}


// main move function
function movemake(start_square_id, square_id, valid_moves, stockfish=false, stockfishPromotedPiece=null){
    if (!valid_moves.includes(square_id)){
        // remove visuals for valid squares
        visualise_valid_squares(valid_moves, true); 
        valid_moves = [];
        return;
    }
    const promotion = isPromotion(start_square_id, square_id);
    
    if (promotion){
        if(stockfishPromotedPiece != null){
            stockfishPromotedPiece = b.move == "w" ? stockfishPromotedPiece.toUpperCase() : stockfishPromotedPiece;
            document.getElementById(start_square_id).innerHTML = '';
            document.getElementById(square_id).innerHTML += icons.get(stockfishPromotedPiece);
            
            b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, stockfishPromotedPiece);

            movesound.play();
            add_drag(b.move);
            check_status(stockfish);
        }else{
            showPromotionBar(square_id, start_square_id);
            setupPromotionSelection(start_square_id, square_id);
        }
    } else {
        handleRegularMove(start_square_id, square_id);
        check_status(stockfish);
    }
    
    visualise_valid_squares(valid_moves, true);
    valid_moves = [];

}

function makeStockFishMove(){
    getBestMove().then(bestMove => {
        const ids = getIds(latestBestMove);
        const piece = b.get_bpiece_by_id(ids[0], b.board);
        movemake(
            ids[0], 
            ids[1], 
            b.valid_moves_of(ids[0], false, b.board, b.move, piece.toLowerCase()), 
            true, 
            latestBestMove.length == 5 ? latestBestMove[4] : null);
    });
}

function handleReset(){
    document.getElementById('nav-buttons').innerHTML += `
      <div id="try-again-alert" style="color: #e74c3c; display:flex; align-items:center; gap:10px;">
        <span style="font-size:18px;">×</span>
        <span style="font-size:16px;">Try again!</span>
      </div>
    `;
    disableDrag = true;
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
