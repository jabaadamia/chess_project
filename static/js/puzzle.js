import { Board } from "./board.js";
import { 
    icons,
    draw_board,
    visualise_valid_squares, 
    add_drag, initDrag, setDisableDrag,
    getCSRFToken, 
    rotate, is_rotated, 
    getIds, 
    isPromotion, showPromotionBar 
} from "./utils.js";

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
draw_board(b.board);

message.innerText = b.move == 'w' ? 'white to play' : 'black to play';

let cur_move = 0;

initDrag({
    getBoard: () => b,
    movemake: movemake,
    is_rotated: () => is_rotated,
    disableDragRef: { value: false },
});

add_drag(b.move);

if(b.move == 'b'){
    rotate();
}

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

async function submitMove(move) {
    currentSolution += (currentSolution ? ' ' : '') + move;
    
    fetch(window.location.href, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
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
            
            // Remove the last move from from_tos array
            from_tos.pop();
            
            await sleep(500);
            prevmove();
            
            if (lastMove) {
                if (b.move == 'w'){
                    lastMove.parentNode.remove(); // Remove the entire move div
                }else{
                    lastMove.remove()
                }
            }
            // Re-add drag functionality
            add_drag(b.move);

            currentSolution = currentSolution.split(' ').slice(0, -1).join(' '); 
        }
    })
    .catch(error => console.error('Error:', error));
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

