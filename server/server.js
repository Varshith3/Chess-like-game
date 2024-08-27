const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '..', 'client')));

const games = new Map();

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinGame', (gameId) => {
        if (!games.has(gameId)) {
            games.set(gameId, {
                players: [],
                board: [
                    ['P11', 'P21', 'H11', 'H21', 'P31'],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['', '', '', '', ''],
                    ['P12', 'P22', 'H12', 'H22', 'P32']
                ],
                currentPlayer: 1
            });
        }

        const game = games.get(gameId);

        if (game.players.length < 2) {
            game.players.push(socket.id);
            socket.join(gameId);
            socket.emit('playerAssigned', game.players.length);
            
            if (game.players.length === 2) {
                io.to(gameId).emit('gameStart', { board: game.board, currentPlayer: game.currentPlayer });
            }
        } else {
            socket.emit('gameFull');
        }
    });

    socket.on('move', ({ gameId, from, to }) => {
        const game = games.get(gameId);
        if (!game) return;

        const playerIndex = game.players.indexOf(socket.id);
        if (playerIndex !== game.currentPlayer - 1) return;

        const piece = game.board[from.row][from.col];
        const targetPiece = game.board[to.row][to.col];

        // Check if it's a valid move
        if (piece.endsWith(game.currentPlayer.toString())) {
            if (targetPiece === '') {
                // Empty square, valid move
                game.board[to.row][to.col] = piece;
                game.board[from.row][from.col] = '';
            } else if (targetPiece.endsWith(game.currentPlayer.toString())) {
                // Same player piece, invalid move
                socket.emit('invalidMove', 'Invalid move');
                return;
            } else {
                // Opponent's piece, capture
                game.board[to.row][to.col] = piece;
                game.board[from.row][from.col] = '';
            }

            // Check if Player 2 has lost all pieces
            if (game.currentPlayer === 1) {
                const player2Pieces = game.board.flat().filter(p => p.endsWith('2'));
                if (player2Pieces.length === 0) {
                    io.to(gameId).emit('gameOver', 'Player 1 wins!');
                    return;
                }
            }

            if (game.currentPlayer === 2) {
                const player1Pieces = game.board.flat().filter(p => p.endsWith('2'));
                if (player1Pieces.length === 0) {
                    io.to(gameId).emit('gameOver', 'Player 2 wins!');
                    return;
                }
            }

            //switching turns
            game.currentPlayer = 3 - game.currentPlayer; 
            io.to(gameId).emit('boardUpdate', { board: game.board, currentPlayer: game.currentPlayer });
        } 
        
    });

    //User disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));