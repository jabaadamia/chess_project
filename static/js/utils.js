// Things shared by multiple js files

export const icons = new Map([
    ['p', "<img class='p' src='/static/images/chessicons/blackpawn.png' alt='bp'></img>"],
    ['r', "<img class='r' src='/static/images/chessicons/blackrook.png' alt='br'></img>"],
    ['n', "<img class='n' src='/static/images/chessicons/blackknight.png' alt='bn'></img>"],
    ['b', "<img class='b' src='/static/images/chessicons/blackbishop.png' alt='bb'></img>"],
    ['q', "<img class='q' src='/static/images/chessicons/blackqueen.png' alt='bq'></img>"],
    ['k', "<img class='k' src='/static/images/chessicons/blackking.png' alt='bk'></img>"],
    ['P', "<img class='P' src='/static/images/chessicons/whitepawn.png' alt='wp'></img>"],
    ['R', "<img class='R' src='/static/images/chessicons/whiterook.png' alt='wr'></img>"],
    ['N', "<img class='N' src='/static/images/chessicons/whiteknight.png' alt='wn'></img>"],
    ['B', "<img class='B' src='/static/images/chessicons/whitebishop.png' alt='wb'></img>"],
    ['Q', "<img class='Q' src='/static/images/chessicons/whitequeen.png' alt='wq'></img>"],
    ['K', "<img class='K' src='/static/images/chessicons/whiteking.png' alt='wk'></img>"]
])

let movemakeCallback = () => {};
let getBoard = () => null;
let getIsRotated = () => false;
let disableDrag = { value: false };
export let setDisableDrag = (val) => {disableDrag.value = val;}

export let is_rotated = false;
export let valid_moves;
let dragging_piece;
let start_square_id;

var pos1;
var pos2;
var pos3;
var pos4;

var top;
var left;

export function draw_board(board, rotate=false, blind=false){
    // reset board
    document.getElementById('wrapper').querySelectorAll('div').forEach(element => {
        element.innerHTML = null;
        // if board is being rotated change ids
        if(rotate){
            let r = element.id % 10;
            let c = (element.id - r) / 10;
            element.id = (9-c)*10 + (9-r);
        }
    });
    
    // draw board
    for (let r = 0; r < 8; r++){
        for (let c = 0; c < 8; c++){
            let letter;
            let cell_id;
            if (rotate){letter = board[r][7 - c]; cell_id = 10 * (8 - c) + 7 - r + 1;}
            else{letter = board[7 - r][c]; cell_id = 10 * (c + 1) + r + 1;}
            //cell_id = 10 * (c + 1) + r + 1;
            if (letter != null){
                const cell = document.getElementById(cell_id);
                cell.innerHTML = icons.get(letter);
                if (blind){
                    cell.firstElementChild.classList.add('blind'); 
                }
            }
        }
    }
}

export function visualise_valid_squares(valid_moves, remove) {
    console.log(remove)
    valid_moves.forEach(square_id => {
        const square = document.getElementById(square_id);
        if (remove) {
            const circle = square.querySelector('.circle');
            if (circle) {
                square.removeChild(circle);
            } else {
                square.style.backgroundColor = '';
            }
        } else {
            if (square.children.length === 0) {
                const circle = document.createElement('span');
                circle.className = 'circle';
                square.appendChild(circle);
            } else {
                if (!square.querySelector('.circle')){
                    square.style.backgroundColor = '#f5a142';
                }
            }
        }
    });
}

export function rotate(){
    let b = getBoard();
    draw_board(b.board, true);
    is_rotated = !is_rotated;
    add_drag(b.move);
}

export function getIds(move) {
    let b = getBoard();
    const from = b.to_id(move.slice(0, 2));
    const to = b.to_id(move.slice(2, 4));
    
    return [from, to];
}

export function get_square_id(top, left) {
    const board = document.getElementById('wrapper');
    const squareSize = board.offsetWidth / 8;
    const row = Math.floor((top + squareSize / 2) / squareSize);
    const col = Math.floor((left + squareSize / 2) / squareSize);
    if (getIsRotated()) {
        return (9 - (col + 1)) * 10 + 9 - (8 - row);
    }
    return (col + 1) * 10 + (8 - row);
}

// check if a move is a pawn promotion
export function isPromotion(start_square_id, square_id) {
    return (square_id % 10 == 8 && document.getElementById(start_square_id).childNodes[0].classList.contains('P')) ||
           (square_id % 10 == 1 && document.getElementById(start_square_id).childNodes[0].classList.contains('p'));
}

// show the promotion bar for selecting a promotion piece
export function showPromotionBar(square_id, start_square_id) {
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

// Dragging functions /////////

export function initDrag(config) {
    movemakeCallback = config.movemake;
    getBoard = config.getBoard;
    getIsRotated = config.is_rotated;
    disableDrag = config.disableDragRef;
}

export function add_drag(move) {
    const whitePieces = ['P', 'R', 'N', 'B', 'Q', 'K'];
    const blackPieces = ['p', 'r', 'n', 'b', 'q', 'k'];

    const enableDrag = (pieces, zIndex) => {
        pieces.forEach(piece => {
            document.querySelectorAll('.' + piece).forEach(p => {
                p.style = `pointer-events: all; z-index: ${zIndex};`;
                p.onmousedown = dragMouseDown;
                p.ontouchstart = dragMouseDown;
            });
        });
    };

    const disableDragFn = (pieces, zIndex) => {
        pieces.forEach(piece => {
            document.querySelectorAll('.' + piece).forEach(p => {
                p.style = `pointer-events: none; z-index: ${zIndex};`;
                p.onmousedown = null;
                p.ontouchstart = null;
            });
        });
    };

    if (move === 'w') {
        enableDrag(whitePieces, 3);
        disableDragFn(blackPieces, 2);
    } else {
        enableDrag(blackPieces, 2);
        disableDragFn(whitePieces, 1);
    }
}

function dragMouseDown(e) {
    if (disableDrag?.value) return;

    const board = getBoard();
    const squareId = parseInt(this.parentNode.id);
    start_square_id = squareId;

    valid_moves = board.valid_moves_of(squareId, false, board.board, board.move, this.classList[0].toLowerCase());
    visualise_valid_squares(valid_moves, false);

    dragging_piece = this;
    dragging_piece.style.position = 'absolute';
    dragging_piece.classList.add('dragging');

    if (e.type === 'touchstart') {
        e.preventDefault();
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementDrag;
    } else {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
}

function elementDrag(e) {
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

    dragging_piece.style.top = top + "px";
    dragging_piece.style.left = left + "px";
}

function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;

    const boardElement = document.getElementById('wrapper');
    const squareSize = boardElement.offsetWidth / 8;

    const row = Math.floor((top + squareSize / 2) / squareSize);
    const col = Math.floor((left + squareSize / 2) / squareSize);

    let square_id;
    if (getIsRotated()) {
        square_id = (9 - (col + 1)) * 10 + 9 - (8 - row);
    } else {
        square_id = (col + 1) * 10 + (8 - row);
    }

    dragging_piece.style.position = 'relative';
    dragging_piece.style.left = '';
    dragging_piece.style.top = '';
    dragging_piece.classList.remove('dragging');

    movemakeCallback(start_square_id, square_id, valid_moves);
}

///// token 

export function getCSRFToken() {
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
