import { Board, icons } from "./board.js";

const movesound = new Audio('/static/images/move.mp3');
movesound.volume = 0.7;

let from_tos = [];
let pgn = document.getElementById('pgn');

let message = document.getElementById('message');

let currentSolution = '';

window.firstmove = firstmove;
window.prevmove = prevmove;
window.play = play;
window.nextmove = nextmove;
window.lastmove = lastmove;

window.rotate = rotate;
window.piece_click = piece_click;
window.pgn_click = pgn_click;

let b = new Board(start_fen);

message.innerText = b.move == 'w' ? 'white to play' : 'black to play';

let cur_move = 0;

let is_rotated = false;
if(b.move == 'b'){
    rotate();
}

add_drag(b.move);

document.onkeydown = (e) =>{
    if (e.code == 'ArrowLeft'){
        prevmove();
    }
    if (e.code == 'ArrowRight'){
        nextmove();
    }
    if (e.code == 'Space'){
        play();
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
function closeDragElement(e) {
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

async function submitMove(move) {
    currentSolution += (currentSolution ? ' ' : '') + move;
    
    fetch(window.location.href, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({
            'current_solution': currentSolution
        })
    })
    .then(response => response.json())
    .then(async data => {
        if (data.redirect) {
            // If server indicates a redirect, perform it
            window.location.href = data.url;
            return;
        }
        if (data.correct) {
            if (data.complete) {
                message.innerText = '✓  Puzzle solved! '+' Rating change: ' + data.rating_change;
                if (data.next_puzzle_id) {
                //Load next puzzle or redirect
                    await sleep(500);
                    window.location.href = `/puzzles/${tag}/${data.next_puzzle_id}`;
                }
            } else {
                // to add next move making
                let ids = getIds(data.next_move.slice(0, 4));
                await sleep(500);

                movemake(
                ids[0], 
                ids[1], 
                [ids[1]],
                false,
                false, 
                data.next_move.length == 5 ? data.next_move[4] : null);

                currentSolution += (currentSolution ? ' ' : '') + data.next_move;
                message.innerText = '✓  Correct so far, keep going! ';
            }
            message.style.color = 'green';
        } else {
            message.innerText = '✗  Incorrect move!  try again ' + ' Rating change: '+ data.rating_change;
            message.style.color = 'red';
            
            // Remove the last move from PGN display
            let lastMove = document.getElementById('m' + b.half_moves);
            
            await sleep(500);
            prevmove();
            
            if (lastMove) {
                if (b.move == 'w'){
                    lastMove.parentNode.remove(); // Remove the entire move div
                }else{
                    lastMove.remove()
                }
            }
            // Remove the last move from from_tos array
            from_tos.pop(); 
            // Re-add drag functionality
            add_drag(b.move);

            currentSolution = currentSolution.split(' ').slice(0, -1).join(' '); 
        }
    })
    .catch(error => console.error('Error:', error));
}


// Check if a move is a pawn promotion
function isPromotion(start_square_id, square_id) {
    return (square_id % 10 == 8 && document.getElementById(start_square_id).childNodes[0].classList.contains('P')) ||
           (square_id % 10 == 1 && document.getElementById(start_square_id).childNodes[0].classList.contains('p'));
}

// Show the promotion bar for selecting a promotion piece
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

// Handle PGN navigation promotion
function handlePgnNavPromotion(start_square_id, square_id, forpgnnav) {
    document.getElementById(start_square_id).innerHTML = '';
    document.getElementById(square_id).innerHTML = icons.get(forpgnnav);
    b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, forpgnnav);
    add_drag(b.move);
}

// Setup the promotion selection process
function setupPromotionSelection(start_square_id, square_id, forpgnnav, move_puzzle_format, to_submit) {
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
            updatePgnForPromotion(move, start_square_id, square_id);
            if (to_submit){
                submitMove(move_puzzle_format+e.target.className.toUpperCase());
            }
        }
        
        movesound.play();
        add_drag(b.move);
    }
    
    // Setup click outside handler to hide promotion bar
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

// Update PGN for promotion moves
function updatePgnForPromotion(move, start_square_id, square_id) {
    const m = document.createElement('p');
    m.style.position = 'absolute';
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
        from_tos.push([parseInt(start_square_id), square_id, move[3]]);
    } else {
        let fullmovediv = document.getElementById('move'+(b.full_moves-1));
        if(!fullmovediv){
            fullmovediv = document.createElement('div');
            fullmovediv.id = 'move'+b.full_moves;
            const movenum = document.createElement('p');
            movenum.innerText = b.full_moves+'.';
            fullmovediv.appendChild(movenum);
            pgn.appendChild(fullmovediv);
        }
        m.style.left = '180px';
        fullmovediv.appendChild(m);
        from_tos.push([parseInt(start_square_id), square_id, move[3].toLowerCase()]);
    }
    cur_move++;
}

// Handle regular (non-promotion) moves
function handleRegularMove(start_square_id, square_id, forpgnnav, move_puzzle_format, to_submit) {
    document.getElementById(square_id).innerHTML = document.getElementById(start_square_id).innerHTML;
    document.getElementById(start_square_id).innerHTML = '';
    
    if(forpgnnav) {
        b.cur_white_castles = [true, true];
        b.cur_black_castles = [true, true];
    }
    
    let move = b.make_move(parseInt(start_square_id), parseInt(square_id));
    
    if (b.is_checkmate(b.move)){
        move = move.replace('+','#');
    }
    
    if (!forpgnnav){
        updatePgnForRegularMove(move, start_square_id, square_id);
        if (to_submit){
            submitMove(move_puzzle_format);
        }
    }

    movesound.play();
    add_drag(b.move);
}

// Update PGN for regular moves
function updatePgnForRegularMove(move, start_square_id, square_id) {
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
    } else {
        try {
            let fullmovediv = document.getElementById('move'+(b.full_moves-1));
            m.style.left = '180px';    
            fullmovediv.appendChild(m);
        } catch (error) { // first move is black
            let fullmovediv = document.createElement('div');
            fullmovediv.id = 'move'+(b.full_moves-1);
            pgn.appendChild(fullmovediv);
            m.style.left = '180px';    
            fullmovediv.appendChild(m);
        }
    }
    from_tos.push([parseInt(start_square_id), square_id]);
    cur_move++;
}

// Main function to handle chess moves
function movemake(start_square_id, square_id, valid_moves, forpgnnav=false, to_submit=true, solutionPromotedPiece=null){
    let promotion = false;
    let move_puzzle_format = b.to_readable(start_square_id)+b.to_readable(square_id);

    if (!valid_moves.includes(square_id)){
        visualise_valid_squares(valid_moves, true);
        valid_moves = [];
        return;
    }
    
    promotion = isPromotion(start_square_id, square_id);

    if (promotion){
        if(!forpgnnav){
            if(solutionPromotedPiece != null){
                solutionPromotedPiece = b.move == "w" ? solutionPromotedPiece.toUpperCase() : solutionPromotedPiece.toLowerCase();

                document.getElementById(start_square_id).innerHTML = '';
                document.getElementById(square_id).innerHTML += icons.get(solutionPromotedPiece);
                
                b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, solutionPromotedPiece);
                updatePgnForPromotion(b.to_readable(square_id)+"="+solutionPromotedPiece.toUpperCase(), start_square_id, square_id);
                movesound.play();
                add_drag(b.move);
            }else{
                showPromotionBar(square_id, start_square_id);
            }
        }
        
        if(forpgnnav){
            handlePgnNavPromotion(start_square_id, square_id, forpgnnav);
            return;
        } else {
            setupPromotionSelection(start_square_id, square_id, forpgnnav, move_puzzle_format, to_submit);
        }
    } else {
        handleRegularMove(start_square_id, square_id, forpgnnav, move_puzzle_format, to_submit);
    }

    visualise_valid_squares(valid_moves, true);
    valid_moves = [];
}

