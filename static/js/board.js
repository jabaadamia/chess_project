//constants
const DIRS = {
    r: [1, 10, -1, -10],
    n: [-19, -8, 12, 21, 19, 8, -12, -21],
    b: [-9, 11, 9, -11],
    q: [1, 10, -1, -10, -9, 11, 9, -11],
    k: [1, 10, -1, -10, -9, 11, 9, -11]
}

const bpieces = 'prnbqk';
const wpieces = 'PRNBQK'; 

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


export class Board {
    constructor (fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'){
        this.board = [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ]
        
        this.rotated = false;

        this.fen = fen;
        this.move = fen.split(' ')[1];
        this.castles = fen.split(' ')[2];
        this.passant_capture = fen.split(' ')[3];
        this.half_moves = parseInt(fen.split(' ')[4]);
        this.full_moves = parseInt(fen.split(' ')[5]);

        this.passant_pawn = null;
        this.pawn_moved_by_two = false;

        this.cur_white_castles = [false, false];
        this.cur_black_castles = [false, false];

        this.valid_moves = [];

        this.set_pos();
        
        this.wking_pos = this.find_kings()[0];
        this.bking_pos = this.find_kings()[1];

        this.white_piece_poss = this.get_white_pieces(this.board);
        this.black_piece_poss = this.get_black_pieces(this.board);
        
        this.white_threats = this.all_white_valid_moves();
        this.black_threats = this.all_black_valid_moves();

        
        this.draw_board(this.board);
    }

    get_pos_fen(board=this.board){
        let fen_pos = '';
        let row_space_counter;
        for(let i = 0; i < 8; i++){
            row_space_counter = 0;
            for(let j = 0; j < 8; j++){
                if (board[i][j] == null){
                    row_space_counter++;
                }else{
                    if (row_space_counter > 0){
                        fen_pos += row_space_counter;
                    }
                    fen_pos += board[i][j];
                    row_space_counter = 0
                }
            }
            if (row_space_counter > 0){
                fen_pos += row_space_counter;
            }
            fen_pos += '/';
        }
        fen_pos = fen_pos.slice(0, -1);
        return fen_pos;
    }

    // inserts pieces in board
    set_pos(fen=this.fen){
        const fen_pos = fen.split(' ')[0];
        const all_row = fen_pos.split('/');

        let r = 0;
        all_row.forEach(row_data => {
            let c = 0;
            
            for (let i = 0; i < row_data.length; i++) {
                const letter = row_data[i];
                
                if(wpieces.includes(letter) || bpieces.includes(letter)){
                    this.board[r][c] = letter;
                }else{
                    c += parseInt(letter) - 1;
                }

                c += 1;
            }
            r += 1;
        });
    }

    draw_board(board, rotate=false, blind=false){
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

    rotate_board(){
        if (this.rotated){
            this.draw_board(this.board, false);
            this.rotated = false;
        }else{
            this.draw_board(this.board, true);
            this.rotated = true;
        }
    }
    
    get_bpiece_by_id(id, board=this.board){  // returns piece on r, c by id
        let rc = this.to_board_r_c(id);
        return board[rc[0]][rc[1]];
    }

    set_bpiece_by_id(id, piece, board=this.board){
        let rc = this.to_board_r_c(id);
        board[rc[0]][rc[1]] = piece;
        return id;
    }
    
    to_board_r_c(id){  // converts valid id (54) to 2d arr baord r, c ([4,4])
        let r = 8 - (id % 10);
        let c = Math.floor(id/10) - 1;
        return [r,c];
    }

    from_r_c_to_id(r, c){  // converts valid 2d arr baord r, c ([4,4]) to id (54)
        return (c + 1) * 10 + 8 - r;
    }

    to_readable(id){  // converts valid id (54) to readable (e4)
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        let row = id % 10
        return letters[(id - row) / 10 - 1] + row.toString()
    }
    
    to_id(readable){ // converts valid readable (e4) to id (54)
        let letter_dict = new Map([
            ['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5], ['f', 6], ['g', 7], ['h', 8] 
        ])
        let row = parseInt(readable[1])
        let col = letter_dict.get(readable[0])
        return col * 10 + row
    }

    // retuns white and black king's ids
    find_kings(board=this.board){
        let wking_id;
        let bking_id;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++){
                let letter = board[r][c]
                if(letter === 'K'){wking_id = this.from_r_c_to_id(r,c);}
                if(letter === 'k'){bking_id = this.from_r_c_to_id(r,c);}
            }
        }
        return [wking_id, bking_id];
    }

    // returns map of ids and piece letters for all white pieces
    get_white_pieces(board=this.board){
        let white_pieces = new Map();
        for (let r = 0; r < 8; r++){
            for (let c = 0; c < 8; c++){
                if(wpieces.includes(board[r][c])){
                    white_pieces.set(this.from_r_c_to_id(r,c), board[r][c]);
                }
            }
        }
        return white_pieces;
    }
    
    // returns list of ids and piece letters for all black pieces
    get_black_pieces(board=this.board){  
        let black_pieces = new Map();
        for (let r = 0; r < 8; r++){
            for (let c = 0; c < 8; c++){
                if(bpieces.includes(board[r][c])){
                    black_pieces.set(this.from_r_c_to_id(r,c), board[r][c]);
                }
            }
        }
        return black_pieces;
    }

    all_white_valid_moves(board=this.board, all_wpieces = this.white_piece_poss){
        let all_white_valid_moves = [];
        all_wpieces.forEach((value, key) => {
            
            if     (value == 'P'){all_white_valid_moves.push.apply(all_white_valid_moves, this.pawn_moves(key, true, board, 'w'))}
            else if(value == 'R'){all_white_valid_moves.push.apply(all_white_valid_moves, this.rook_moves(key, true, board, 'w'))}
            else if(value == 'N'){all_white_valid_moves.push.apply(all_white_valid_moves, this.knight_moves(key, true, board, 'w'))}
            else if(value == 'B'){all_white_valid_moves.push.apply(all_white_valid_moves, this.bishop_moves(key, true, board, 'w'))}
            else if(value == 'Q'){all_white_valid_moves.push.apply(all_white_valid_moves, this.queen_moves(key, true, board, 'w'))}
            else if(value == 'K'){all_white_valid_moves.push.apply(all_white_valid_moves, this.king_moves(key, true, board, 'w'))}
        });
        return all_white_valid_moves;
    }

    all_black_valid_moves(board=this.board, all_bpieces = this.black_piece_poss){
        let all_black_valid_moves = [];
        all_bpieces.forEach((value, key) => {
            if     (value == 'p'){all_black_valid_moves.push.apply(all_black_valid_moves, this.pawn_moves(key, true, board, 'b'))}
            else if(value == 'r'){all_black_valid_moves.push.apply(all_black_valid_moves, this.rook_moves(key, true, board, 'b'))}
            else if(value == 'n'){all_black_valid_moves.push.apply(all_black_valid_moves, this.knight_moves(key, true, board, 'b'))}
            else if(value == 'b'){all_black_valid_moves.push.apply(all_black_valid_moves, this.bishop_moves(key, true, board, 'b'))}
            else if(value == 'q'){all_black_valid_moves.push.apply(all_black_valid_moves, this.queen_moves(key, true, board, 'b'))}
            else if(value == 'k'){all_black_valid_moves.push.apply(all_black_valid_moves, this.king_moves(key, true, board, 'b'))}

        });
        return all_black_valid_moves;
    }

    is_check(color, board=this.board, wking=this.wking_pos, bking=this.bking_pos){
        //console.log(this.all_white_valid_moves(board), wking, bking)
        if (color == 'w' && this.all_black_valid_moves(board, this.get_black_pieces(board)).includes(wking)){
            return true;
        }else if(color == 'b' && this.all_white_valid_moves(board, this.get_white_pieces(board)).includes(bking)){
            return true;
        }
        return false
    }


    is_checkmate(color, board=this.board){
        if (!this.is_check(color, board)){
            return false;
        }
        let moves;
        if (color == 'w'){
            for (const [key, value] of this.white_piece_poss) {
                moves = this.valid_moves_of(key, false, board, color, value.toLowerCase());
                if (moves.length > 0){return false}
            }
        }else{
            for (const [key, value] of this.black_piece_poss) {
                moves = this.valid_moves_of(key, false, board, color, value);
                if (moves.length > 0){
                    return false;
                }
            }
        }
        
        return true;
    }

    //returns list of valid moves of given piece (rook, bishop, queen)
    get_valid_moves(id, directions, board, move){
        let temp_valid_moves = [];
        let white_defended = [];
        let black_defended = [];
        directions.forEach(direction => {
            let cur_pos = id;
            let is_free = false;
            let is_opp_piece = false;
            cur_pos += direction;
            let row = cur_pos % 10;
            let col = (cur_pos - row) / 10;
            let out_of_border = row<1 || row>8 || col<1  || col>8;

            if (move == 'w' && !out_of_border) {
                is_free = !wpieces.includes(this.get_bpiece_by_id(cur_pos, board));
                is_opp_piece = bpieces.includes(this.get_bpiece_by_id(cur_pos, board));

            }if(move == 'b' && !out_of_border){
                is_free = !bpieces.includes(this.get_bpiece_by_id(cur_pos, board));
                is_opp_piece = wpieces.includes(this.get_bpiece_by_id(cur_pos, board));
            }
            
            while (!out_of_border && is_free) {
                temp_valid_moves.push(cur_pos)
                if(is_opp_piece){
                    break
                }
                
                cur_pos += direction
                row = cur_pos % 10
                col = (cur_pos - row) / 10
                out_of_border = row<1 || row>8 || col<1  || col>8

                if (move == 'w' && !out_of_border) {
                    is_free = !wpieces.includes(this.get_bpiece_by_id(cur_pos, board));
                    is_opp_piece = bpieces.includes(this.get_bpiece_by_id(cur_pos, board));
    
                }if(move == 'b' && !out_of_border){
                    is_free = !bpieces.includes(this.get_bpiece_by_id(cur_pos, board));
                    is_opp_piece = wpieces.includes(this.get_bpiece_by_id(cur_pos, board));
                }
            }
            if (!out_of_border && !is_free){
                if (move == 'w'){
                    white_defended.push(cur_pos);
                    
                }else{
                    black_defended.push(cur_pos);
                }
            }
        });
        return [temp_valid_moves, white_defended, black_defended];
    }

    // calls get_valid_moves function with bishop directions
    bishop_moves(id, for_helper, board, move){
        let all_moves = this.get_valid_moves(id, DIRS.b, board, move);
        
        let temp_valid_moves = all_moves[0];
        if(!for_helper){
            this.valid_moves = temp_valid_moves;
            return temp_valid_moves;
        }else{
            const moves = temp_valid_moves.concat(all_moves[1], all_moves[2]);
            return moves;
        }
    }
    // calls get_valid_moves function with rook directions
    rook_moves(id, for_helper, board, move){
        let all_moves = this.get_valid_moves(id, DIRS.r, board, move);
        let temp_valid_moves = all_moves[0];
        if(!for_helper){
            this.valid_moves = temp_valid_moves;
            return temp_valid_moves;
        }else{
            const moves = temp_valid_moves.concat(all_moves[1], all_moves[2]);
            return moves;
        }
    }
    // calls get_valid_moves function with queen directions
    queen_moves(id, for_helper, board, move){
        let all_moves = this.get_valid_moves(id, DIRS.q, board, move);
        let temp_valid_moves = all_moves[0];
        if(!for_helper){
            this.valid_moves = temp_valid_moves;
            return temp_valid_moves;
        }else{
            const moves = temp_valid_moves.concat(all_moves[1], all_moves[2]);
            return moves;
        }
    }

    pawn_moves(id, for_helper, board, move){
        let temp_valid_moves = [];
        let threats = [];
        let row = id % 10;
        let col = (id - row) / 10;
        if(move == 'w'){
            if (this.get_bpiece_by_id(id+1, board) == null){  //check forward
                temp_valid_moves.push(id + 1);
                if(row == 2 && this.get_bpiece_by_id(id+2, board) == null){  //check if it is first move of pawn
                    temp_valid_moves.push(id + 2);
                }
            }
            //check if pawn can kill
            if (col != 1){
                threats.push(id - 9);
                if (bpieces.includes(this.get_bpiece_by_id(id-9, board)) || (id - 9 == this.to_id(this.passant_capture) && id - 10 == this.passant_pawn)){
                    temp_valid_moves.push(id - 9);
                }
            }
            if (col != 8){
                threats.push(id + 11);
                if (bpieces.includes(this.get_bpiece_by_id(id+11, board)) || (id + 11 == this.to_id(this.passant_capture) && id + 10 == this.passant_pawn)){
                    temp_valid_moves.push(id + 11);
                }
            }
        }else{
            if (this.get_bpiece_by_id(id-1, board) == null){  //check forward
                temp_valid_moves.push(id - 1);
                if(row == 7 && this.get_bpiece_by_id(id-2, board) == null){  //check if it is first move of pawn
                    temp_valid_moves.push(id - 2);
                }
            }
            //check if pawn can kill
            if (col != 8){
                threats.push(id + 9);
                if (wpieces.includes(this.get_bpiece_by_id(id+9, board)) || (id + 9 == this.to_id(this.passant_capture) && id + 10 == this.passant_pawn)){
                    temp_valid_moves.push(id + 9);
                }
            }
            if (col != 1){
                threats.push(id - 11);
                if (wpieces.includes(this.get_bpiece_by_id(id-11, board)) || (id - 11 == this.to_id(this.passant_capture) && id - 10 == this.passant_pawn)){
                    temp_valid_moves.push(id - 11);
                }
            }
        }
        if(!for_helper){
            this.valid_moves = temp_valid_moves;
            return temp_valid_moves;
        }
        return temp_valid_moves, threats;
    }

    knight_moves(id, for_helper, board, move){
        let temp_valid_moves = [];
        const directions = DIRS.n;
        directions.forEach(direction => {
            let cur_pos = id + direction;
            let row = cur_pos % 10;
            let col = (cur_pos - row) / 10;
            let out_of_border = row<1 || row>8 || col<1  || col>8;
            if(!out_of_border){
                let cur_piece = this.get_bpiece_by_id(cur_pos, board);
                if(move === 'w'){
                    if(bpieces.includes(cur_piece) || cur_piece == null){
                        temp_valid_moves.push(cur_pos);
                    }else{
                        if(for_helper){temp_valid_moves.push(cur_pos)}
                    }
                }else{
                    if(wpieces.includes(cur_piece) || cur_piece == null){
                        temp_valid_moves.push(cur_pos);
                    }else{
                        if(for_helper){temp_valid_moves.push(cur_pos)}
                    }
                }
            }
        });

        if(!for_helper){
            this.valid_moves = temp_valid_moves;
        } 
        return temp_valid_moves;
    }

    king_moves(id, for_helper, board, move){
        let temp_valid_moves = [];
        const directions = DIRS.k;
        
        directions.forEach(direction => {
            
            let cur_pos = id + direction;
            let row = cur_pos % 10;
            let col = (cur_pos - row) / 10;
            let out_of_border = row<1 || row>8 || col<1  || col>8;
            
            if(!out_of_border){
                
                let cur_piece = this.get_bpiece_by_id(cur_pos, board);
                let board_with_new_king = this.board.map(row => row.slice());
                this.set_bpiece_by_id(id, null, board_with_new_king);
                
                if(for_helper){temp_valid_moves.push(cur_pos);}
                else{
                    if(move == 'w'){
                        if(bpieces.includes(cur_piece) || cur_piece == null){
                            
                            this.set_bpiece_by_id(cur_pos, "K", board_with_new_king);
                            
                            if(!this.is_check("w", board_with_new_king, cur_pos, this.bking_pos) ){
                                temp_valid_moves.push(cur_pos);                
                            }    
                        }
                    }else{
                        if(wpieces.includes(cur_piece) || cur_piece == null){
                            
                            this.set_bpiece_by_id(cur_pos, "k", board_with_new_king);
                            if(!this.is_check("b", board_with_new_king, this.wking_pos, cur_pos) ){
                                temp_valid_moves.push(cur_pos);
                            }
                            
                        }
                    }
                }
            }
        });
        
        if(!for_helper){
            //check castles
            if(move === 'w'){
                let bvmoves = this.black_threats;
                let is_check = this.is_check('w', board, 51);
                if(!is_check && board[7][4] === 'K'){
                    if(this.castles.includes('K')){
                        if(board[7][5] === null && !bvmoves.includes(61) && board[7][6] === null && !bvmoves.includes(71)){
                            this.cur_white_castles[0] = true;
                            temp_valid_moves.push(71);
                        }
                    }
                    if(this.castles.includes('Q')){
                        if(board[7][3] === null && !bvmoves.includes(41) && board[7][2] === null && !bvmoves.includes(31)){
                            this.cur_white_castles[1] = true;
                            temp_valid_moves.push(31);
                        }
                    }
                }
            }else{
                let wvmoves = this.white_threats;
                let is_check = this.is_check('b', board, 51, 58);
                if(!is_check && board[0][4] === 'k'){
                    if(this.castles.includes('k')){
                        if(board[0][5] === null && !wvmoves.includes(68) && board[0][6] === null && !wvmoves.includes(78)){
                            this.cur_black_castles[0] = true;
                            temp_valid_moves.push(78);
                        }
                    }
                    if(this.castles.includes('q')){
                        if(board[0][3] === null && !wvmoves.includes(48) && board[0][2] === null && !wvmoves.includes(38)){
                            this.cur_black_castles[1] = true;
                            temp_valid_moves.push(38);
                        }
                    }
                }
            }
            this.valid_moves = temp_valid_moves;
        }
        return temp_valid_moves;
    }

    valid_moves_of(id, for_helper, board, move, piece){
        let valid_moves;
        if(piece === 'p'){valid_moves = this.pawn_moves(id, for_helper, board, move)}
        if(piece === 'r'){valid_moves = this.rook_moves(id, for_helper, board, move)}
        if(piece === 'n'){valid_moves = this.knight_moves(id, for_helper, board, move)}
        if(piece === 'b'){valid_moves = this.bishop_moves(id, for_helper, board, move)}
        if(piece === 'q'){valid_moves = this.queen_moves(id, for_helper, board, move)}
        if(piece === 'k'){valid_moves = this.king_moves(id, for_helper, board, move);return valid_moves}
        
        valid_moves = this.filter_valid_moves(id, board, valid_moves, move);
        
        return valid_moves;
    }
    // removes moves that cause check to friendly king
    filter_valid_moves(id, board, valid_moves, move){
        let temp_board = [[],[],[],[],[],[],[],[]];
        for(let r = 0; r<8; r++){
            for(let c = 0; c<8; c++){
                temp_board[r][c] = board[r][c];            
            }
        }

        let rc_from = this.to_board_r_c(id);
        let moves_to_splice = [];
        for (let i = 0; i < valid_moves.length; i++) {
            
            const to = valid_moves[i];
            let rc_to = this.to_board_r_c(to);

            temp_board[rc_to[0]][rc_to[1]] = temp_board[rc_from[0]][rc_from[1]];
            temp_board[rc_from[0]][rc_from[1]] = null;
            
            if (this.is_check(move, temp_board, this.find_kings(board)[0], this.find_kings(board)[1])){
                moves_to_splice.push(i);
            }
            
            temp_board[rc_to[0]][rc_to[1]] = board[rc_to[0]][rc_to[1]];
            temp_board[rc_from[0]][rc_from[1]] = board[rc_from[0]][rc_from[1]];
        }
        
        for (let i = 0; i < moves_to_splice.length; i++) {
            let indx = moves_to_splice[moves_to_splice.length-1-i];
            valid_moves.splice(indx,1);
        }
        this.valid_moves = valid_moves;
        return valid_moves;
    }

    make_move(from, to, board=this.board, move=this.move, promotion=false){
        const piece = this.get_bpiece_by_id(from, board);
        let move_pgn = '';
        this.half_moves ++;
        
        if(!this.pawn_moved_by_two){
            this.passant_capture = '-';
            this.passant_pawn = null;
        }

        if(move == 'w'){
            this.white_piece_poss.delete(from);
            this.white_piece_poss.set(to, piece);
            this.black_piece_poss.delete(to);
            this.move = 'b';
            
            if(piece == 'P'){
                if (this.get_bpiece_by_id(to) != null){
                    move_pgn += this.to_readable(from)[0] + 'x' + this.to_readable(to);
                }else{move_pgn += this.to_readable(to)}
                if(to == this.to_id(this.passant_capture) && this.pawn_moved_by_two){ //if passant capture
                    move_pgn = this.to_readable(from)[0] + 'x' + this.to_readable(to);
                    document.getElementById(this.passant_pawn).innerHTML = '';
                    let rc = this.to_board_r_c(this.passant_pawn);
                    board[rc[0]][rc[1]] = null;
                    this.black_piece_poss.delete(this.passant_pawn);
                }
                if(to - from == 2){ // if pawn moved by two
                    this.passant_capture = this.to_readable(from + 1);
                    this.passant_pawn = to;
                    this.pawn_moved_by_two = true;
                }else{this.pawn_moved_by_two = false}
            }else{
                this.pawn_moved_by_two = false;
                if (this.get_bpiece_by_id(to) != null){
                    move_pgn += piece.toUpperCase() + 'x' + this.to_readable(to);
                }else{move_pgn += piece.toUpperCase() + this.to_readable(to);}
            }
        }else{
            this.black_piece_poss.delete(from);
            this.black_piece_poss.set(to, piece);
            this.white_piece_poss.delete(to);
            this.move = 'w';
            this.full_moves += 1;
            
            if(piece == 'p'){
                if (this.get_bpiece_by_id(to) != null){
                    move_pgn += this.to_readable(from)[0] + 'x' + this.to_readable(to);
                }else{move_pgn += this.to_readable(to);}
                if(to == this.to_id(this.passant_capture)){  //if passant capture
                    move_pgn = this.to_readable(from)[0] + 'x' + this.to_readable(to);
                    document.getElementById(this.passant_pawn).innerHTML = '';
                    let rc = this.to_board_r_c(this.passant_pawn);
                    board[rc[0]][rc[1]] = null;
                    this.white_piece_poss.delete(this.passant_pawn);
                }
                if(from - to == 2){  // if pawn moved by two
                    this.passant_capture = this.to_readable(from - 1);
                    this.passant_pawn = to;
                    this.pawn_moved_by_two = true;
                }else{this.pawn_moved_by_two = false}
                
            }else{
                this.pawn_moved_by_two = false;
                if (this.get_bpiece_by_id(to) != null){
                    move_pgn += piece.toUpperCase() + 'x' + this.to_readable(to);
                }else{move_pgn += piece.toUpperCase() + this.to_readable(to);}
            }
        }
        // handles castles
        if(this.castles.length == 0){this.castles='-'}
        if(from == 11 || to == 11 || this.get_bpiece_by_id(11) != 'R'){
            this.castles = this.castles.replace('Q', ''); this.cur_white_castles[0] = false;}
        if(from == 81 || to == 81 || this.get_bpiece_by_id(81) != 'R'){
            this.castles = this.castles.replace('K', ''); this.cur_white_castles[1] = false;}
        if(from == 18 || to == 18 || this.get_bpiece_by_id(18) != 'r'){
            this.castles = this.castles.replace('q', ''); this.cur_black_castles[0] = false;}
        if(from == 88 || to == 88 || this.get_bpiece_by_id(88) != 'r'){
            this.castles = this.castles.replace('k', ''); this.cur_black_castles[1] = false;}
        
        if(piece == 'K'){
            this.wking_pos = to;
            if(from == 51 && to == 71 && this.cur_white_castles[0]){
                board[7][5] = 'R';
                board[7][7] = null;
                document.getElementById(61).innerHTML = document.getElementById(81).innerHTML;
                document.getElementById(81).innerHTML = '';
                move_pgn = '0-0'
            }
            if(from == 51 && to == 31 && this.cur_white_castles[1]){
                board[7][3] = 'R';
                board[7][0] = null;
                document.getElementById(41).innerHTML = document.getElementById(11).innerHTML;
                document.getElementById(11).innerHTML = '';
                move_pgn = '0-0-0'
            }
            this.cur_white_castles = [false, false];
            this.castles = this.castles.replace('Q', '');
            this.castles = this.castles.replace('K', '');
        }
        if(piece == 'k'){
            this.bking_pos = to;
            if(from == 58 && to == 78 && this.cur_black_castles[0]){
                board[0][5] = 'r';
                board[0][7] = null;
                document.getElementById(68).innerHTML = document.getElementById(88).innerHTML;
                document.getElementById(88).innerHTML = '';
                move_pgn = '0-0'
            }
            if(from == 58 && to == 38 && this.cur_black_castles[1]){
                board[0][3] = 'r';
                board[0][0] = null;
                document.getElementById(48).innerHTML = document.getElementById(18).innerHTML;
                document.getElementById(18).innerHTML = ''; 
                move_pgn = '0-0-0'  
            }
            this.cur_black_castles = [false, false];
            this.castles = this.castles.replace('q', '');
            this.castles = this.castles.replace('k', '');
        }

        let rc_from = this.to_board_r_c(from);
        let rc_to = this.to_board_r_c(to);
        let startcell = board[rc_from[0]][rc_from[1]];
        if(promotion){startcell = promotion}
        board[rc_to[0]][rc_to[1]] = startcell;
        board[rc_from[0]][rc_from[1]] = null;
        this.white_piece_poss = this.get_white_pieces(board);
        this.black_piece_poss = this.get_black_pieces(board);
        this.white_threats = this.all_white_valid_moves(board);
        this.black_threats = this.all_black_valid_moves(board);

        if(this.is_check(this.move)){move_pgn += '+'}
        return move_pgn;
    }
}