import { Board, icons } from "./board.js";

//const movesound = new Audio('./move.mp3');
//movesound.volume = 0.4;
let from_tos = []
let notation = [];
let pgn = '';


window.firstmove = firstmove;
window.prevmove = prevmove;
window.play = play;
window.nextmove = nextmove;
window.lastmove = lastmove;

window.rotate = rotate;
window.piece_click = piece_click;
window.pgn_click = pgn_click;


let start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let b = new Board(start_fen);

let cur_move = b.half_moves;

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

let is_rotated = false;
function rotate(){
    if(is_rotated){
        is_rotated = false;
    }else{is_rotated = true;}
    b.rotated = is_rotated;
    b.rotate_board();
    b.rotate_board();
    add_drag(b.move)  // needs to be fixed
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
            if (from_tos[i].length == 3){
                movemake(from_tos[i][0], from_tos[i][1], [from_tos[i][1]], from_tos[i][2]);
            }else{
                movemake(from_tos[i][0], from_tos[i][1], [from_tos[i][1]], true);
            }
        }
        cur_move = move_num;
    }
}




// add drag events to white pieces
function add_drag(move){
    if(move === 'w'){
        ['P','R','N','B','Q','K']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: all; z-index: 3;';
                p.onmousedown = dragMouseDown;
            });
        });
        ['p','r','n','b','q','k']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: none; z-index: 2;';
                p.onmousedown = null;
            });
        });
    }else{  // add drag events to black pieces
        ['p','r','n','b','q','k']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: all; z-index: 2;';
                p.onmousedown = dragMouseDown;
            });
        });
        ['P','R','N','B','Q','K']
        .forEach(piece => {
            document.querySelectorAll('.'+piece).forEach(p => {
                p.style = 'pointer-events: none; z-index: 1;';
                p.onmousedown = null;
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
        if (remove){
            document.getElementById(square_id).style.background = '';
        }else{
            document.getElementById(square_id).style.background = '#f7d177';// #f5c056
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

    valid_moves = b.valid_moves_of(parseInt(this.parentNode.id), false, b.board, b.move, this.className.toLowerCase());
    start_square_id = this.parentNode.id;

    visualise_valid_squares(valid_moves, false);

    dragging_piece = this;
    dragging_piece.style.position = 'absolute';
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
}

//when grabbing piece is moveing
function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
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
    const square_id = get_square_id(parseInt(top), parseInt(left));

    dragging_piece.style.position = 'relative';
    dragging_piece.style.left = '';
    dragging_piece.style.top = '';
    movemake(start_square_id, square_id, valid_moves);
}

function movemake(start_square_id, square_id, valid_moves, forpgnnav=false){
    let promotion = false;
    // if piece is placed on the valid square
    if (valid_moves.includes(square_id)){
        // if white pawn promoted
        if (square_id % 10 == 8 && document.getElementById(start_square_id).childNodes[0].className === 'P'){
            promotion = true;
            if(!forpgnnav){
                let bar = document.getElementById('promotion-bar')
                let t = 10-1+50;
                let l = ((square_id-square_id%10)/10)*60-50+100;
                if (is_rotated){t = 250-1+50; l=(9-(square_id-square_id%10)/10)*60-50+100}
                bar.style = 'visibility: visible; top: '+t+'px; left: '+l+'px;'
                for (let i = 0; i < 4; i++){
                    const element = bar.childNodes[2*i+1];
                    let img = icons.get(['Q', 'R', 'B', 'N'][i]);
                    element.innerHTML = img;
                }
            }

        }
        //if black pawn promoted
        if (square_id % 10 == 1 && document.getElementById(start_square_id).childNodes[0].className === 'p'){
            promotion = true;
            if(!forpgnnav){
                let bar = document.getElementById('promotion-bar')
                let t = 250-1+50;
                let l = ((square_id-square_id%10)/10)*60-50+100;
                if (is_rotated){t = 10-1+50; l = (9-(square_id-square_id%10)/10)*60-50+100}
                bar.style = 'visibility: visible; top: '+t+'px; left: '+l+'px;';
                for (let i = 0; i < 4; i++){
                    const element = bar.childNodes[2*i+1];
                    let img = icons.get(['q', 'r', 'b', 'n'][i]);
                    element.innerHTML = img;
                }
            }
        }

        // for choosing which piece to promote and making move
        if (promotion){
            document.getElementById(start_square_id).innerHTML = '';

            if(forpgnnav){
                document.getElementById(square_id).innerHTML = icons.get(forpgnnav);
                b.make_move(parseInt(start_square_id), parseInt(square_id), b.board, b.move, forpgnnav);
                add_drag(b.move);
                return;
            }

            document.getElementById('promotion-bar').onclick = function(e){
                document.getElementById(square_id).innerHTML = '';
                document.getElementById('promotion-bar').style.visibility = 'hidden';
                let move;
                if (e.target.tagName == 'IMG'){
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
                        m.style.left = '180px';
                        fullmovediv.appendChild(m);
                        from_tos.push([parseInt(start_square_id), square_id, move[3].toLowerCase()]);
                    }
                    cur_move++;
                }

                //movesound.play()
                add_drag(b.move);
            }
        }else{ // moves other than promotion
            document.getElementById(square_id).innerHTML = document.getElementById(start_square_id).innerHTML;
            document.getElementById(start_square_id).innerHTML = '';
            if(forpgnnav){b.cur_white_castles=[true,true], b.cur_black_castles=[true,true]}

            let move = b.make_move(parseInt(start_square_id), parseInt(square_id));
            if (b.is_checkmate(b.move)){
                move = move.replace('+','#');
            }

            if (!forpgnnav){
                const m = document.createElement('p');
                m.style.position = 'absolute';
                m.innerText = move;
                m.id = 'm'+b.half_moves;
                if (b.move == 'b'){
                    let fullmovediv = document.createElement('div');
                    fullmovediv.id = 'move'+b.full_moves;
                    const movenum = document.createElement('p');
                    movenum.innerText = b.full_moves+'.';
                    fullmovediv.appendChild(movenum);
                    m.style.left = '70px';
                    fullmovediv.appendChild(m);
                    pgn.appendChild(fullmovediv);  
                }else{
                    let fullmovediv = document.getElementById('move'+(b.full_moves-1));
                    m.style.left = '180px';    
                    fullmovediv.appendChild(m);
                }
                from_tos.push([parseInt(start_square_id), square_id]);
                cur_move++;
            }

            //movesound.play();
            add_drag(b.move);
        }
    }

    visualise_valid_squares(valid_moves, true);
    valid_moves = [];
}