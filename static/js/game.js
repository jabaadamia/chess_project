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
                const circle = document.createElement('div');
                circle.className = 'circle';
                square.appendChild(circle);
            }else{square.style.backgroundColor = '#f5a142';}
        }
    });
}

function get_square_id(top, left){
    const row = Math.floor((top+20)/60);
    const col = Math.floor((left+20)/60);
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

    const square_id = get_square_id(parseInt(top), parseInt(left));

    dragging_piece.style.position = 'relative';
    dragging_piece.style.left = '';
    dragging_piece.style.top = '';
    movemake(start_square_id, square_id, valid_moves);
}

function getIds(move) {
    const from = b.to_id(move.slice(0, 2));
    const to = b.to_id(move.slice(2, 4));
    
    return [from, to];
}

function movemake(start_square_id, square_id, valid_moves, forpgnnav=false, to_submit){
    let promotion = false;
    let move_puzzle_format = b.to_readable(start_square_id)+b.to_readable(square_id); // e.g e2e4

    // if piece is placed on the valid square
    if (valid_moves.includes(square_id)){
        // if white pawn promoted
        if (square_id % 10 == 8 && document.getElementById(start_square_id).childNodes[0].classList.contains('P')){
            promotion = true;
            if(!forpgnnav){
                let bar = document.getElementById('promotion-bar')
                let t = 0;
                let l = ((square_id-square_id%10)/10)*60-50+90;
                if (is_rotated){t = 240; l=(9-(square_id-square_id%10)/10)*60+40}
                bar.style = 'visibility: visible; top: '+t+'px; left: '+l+'px;'
                for (let i = 0; i < 4; i++){
                    const element = bar.childNodes[2*i+1];
                    let img = icons.get(['Q', 'R', 'B', 'N'][i]);
                    element.innerHTML = img;
                }
            }

        }
        //if black pawn promoted
        if (square_id % 10 == 1 && document.getElementById(start_square_id).childNodes[0].classList.contains('p')){
            promotion = true;
            if(!forpgnnav){
                let bar = document.getElementById('promotion-bar')
                let t = 240;
                let l = ((square_id-square_id%10)/10)*60+40;
                if (is_rotated){t = 0; l = (9-(square_id-square_id%10)/10)*60-50+90}
                //console.log(' visibility: visible; top: '+t+'px; left: '+l+'px;');
                bar.style = 'visibility: visible; top: '+t+'px; left: '+l+'px;';
                for (let i = 0; i < 4; i++){
                    const element = bar.childNodes[2*i+1];
                    let img = icons.get(['q', 'r', 'b', 'n'][i]);
                    element.innerHTML = img;
                }
            }
        }

        if (promotion){            
            if(forpgnnav){
                document.getElementById(start_square_id).innerHTML = '';
                document.getElementById(square_id).innerHTML = icons.get(forpgnnav);
                b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, forpgnnav);
                add_drag(b.move);
                return;
            }

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
                    const m = document.createElement('p');
                    m.style.position = 'absolute'
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
                    }else{
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
                    if (to_submit){
                        submitMove(move_puzzle_format);
                    }
                }
                
                movesound.play();
                add_drag(b.move);
            }
            const hide = function (e) {
                const bar = document.getElementById('promotion-bar');
                if (bar.style.visibility !== 'hidden' && !bar.contains(e.target)) {
                    bar.style.visibility = 'hidden';
                }
            };
            setTimeout(() => {
                document.getElementById('wrapper').addEventListener('mousedown', hide);
            }, 100);
            
        }else{ // moves other than promotion
            document.getElementById(square_id).innerHTML = document.getElementById(start_square_id).innerHTML;
            document.getElementById(start_square_id).innerHTML = '';
            if(forpgnnav){b.cur_white_castles=[true,true], b.cur_black_castles=[true,true]}

            let move = b.make_move(parseInt(start_square_id), parseInt(square_id));
            //console.log(move)
            if (b.is_checkmate(b.move)){
                move = move.replace('+','#');
            }
            
            
            if (!forpgnnav){
                const m = document.createElement('p');
                //m.style.position = 'absolute';
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
                    unsaved_pgn_string += b.full_moves+'. ';
                }else{
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
                
                unsaved_pgn_string += move + ' ';
                pgn_text_area.value = unsaved_pgn_string;
            }

            movesound.play();
            add_drag(b.move);
        }
    }

    visualise_valid_squares(valid_moves, true);
    valid_moves = [];
}
