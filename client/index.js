const socket = io();

let playerNumber;
let currentPlayer;
let board;
let selectedPiece;

const pieces = {
    'P11': '♙',
    'P21': '♙',
    'P31': '♙',
    'H11': '♔',
    'H21': '♕',
    'P12': '♟',
    'P22': '♟',
    'P32': '♟',
    'H12': '♚',
    'H22': '♛'
};

function joinGame() {
    const gameId = document.getElementById('gameId').value;
    socket.emit('joinGame', gameId);
}

socket.on('playerAssigned', (number) => {
    playerNumber = number;
    document.getElementById('message').textContent = `You are Player ${number}`;
});

socket.on('gameFull', () => {
    document.getElementById('message').textContent = 'Game is full. Please try another game ID.';
});

socket.on('gameStart', ({ board: initialBoard, currentPlayer: startingPlayer }) => {
    document.getElementById('gameIdInput').style.display = 'none';
    board = initialBoard;
    currentPlayer = startingPlayer;
    createBoard();
    updateBoard();
    updateCurrentPlayerDisplay();
});

socket.on('boardUpdate', ({ board: newBoard, currentPlayer: newCurrentPlayer }) => {
    board = newBoard;
    currentPlayer = newCurrentPlayer;
    updateBoard();
    updateCurrentPlayerDisplay();
});

socket.on('invalidMove', (message) => {
    document.getElementById('message').textContent = message;
});

socket.on('gameOver', (message) => {
    document.getElementById('message').textContent = message;
    // Disable further moves
    document.getElementById('board').style.pointerEvents = 'none';
});

function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', handleCellClick);
            boardElement.appendChild(cell);
        }
    }
}

function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.textContent = pieces[board[row][col]] || '';
    });
}

function updateCurrentPlayerDisplay() {
    document.getElementById('currentPlayer').textContent = `Current Player: ${currentPlayer}`;
}

function handleCellClick(e) {
    if (playerNumber !== currentPlayer) return;

    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    if (selectedPiece) {
        movePiece(selectedPiece, { row, col });
        selectedPiece = null;
        document.getElementById('moves').innerHTML = '';
    } else if (board[row][col] !== '') {
        const piece = board[row][col];
        if ((currentPlayer === 1 && piece.endsWith('1')) ||
            (currentPlayer === 2 && piece.endsWith('2'))) {
            selectedPiece = { row, col, piece };
            document.getElementById('message').textContent = `${piece} selected`;
            showMoveButtons(piece);
        }
    }
}

function showMoveButtons(piece) {
    const movesContainer = document.getElementById('moves');
    movesContainer.innerHTML = '';
    let moves;

    if (piece.startsWith('P')) {
        moves = ['F', 'B', 'L', 'R'];
    } else if (piece.startsWith('H1')) {
        moves = ['F', 'B', 'L', 'R'];
    } else if (piece.startsWith('H2')) {
        moves = ['FR', 'FL', 'BR', 'BL'];
    }

    moves.forEach(move => {
        const button = document.createElement('button');
        button.textContent = move;
        button.className = 'move-btn';
        button.addEventListener('click', () => handleMove(move));
        movesContainer.appendChild(button);
    });
}

function handleMove(move) {
    let rowDiff, colDiff;

    switch (move) {
        case 'F': rowDiff = -1; colDiff = 0; break;
        case 'B': rowDiff = 1; colDiff = 0; break;
        case 'L': rowDiff = 0; colDiff = -1; break;
        case 'R': rowDiff = 0; colDiff = 1; break;
        case 'FR': rowDiff = -2; colDiff = 2; break;
        case 'FL': rowDiff = -2; colDiff = -2; break;
        case 'BR': rowDiff = 2; colDiff = 2; break;
        case 'BL': rowDiff = 2; colDiff = -2; break;
    }

    if (selectedPiece.piece.startsWith('H1')) {
        rowDiff *= 2;
        colDiff *= 2;
    }

    const newRow = selectedPiece.row + rowDiff;
    const newCol = selectedPiece.col + colDiff;

    if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
        movePiece(selectedPiece, { row: newRow, col: newCol });
    }
}

function movePiece(from, to) {
    const gameId = document.getElementById('gameId').value;
    socket.emit('move', { gameId, from, to });
}