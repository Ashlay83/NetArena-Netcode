import { WebSocketServer } from 'ws';
import { Room } from './Room.js';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

// For Phase 1, we will just use a single global room[cite: 1]
const globalRoom = new Room('room-1');
globalRoom.start();

let playerCounter = 1;

wss.on('connection', (socket) => {
  const playerId = `player-${playerCounter++}`;
  console.log(`${playerId} connected!`);

  // Send the WELCOME message required by the Phase 1 protocol[cite: 1]
  socket.send(JSON.stringify({
    type: 'WELCOME',
    payload: {
      playerId,
      roomId: globalRoom.roomId,
      tickRate: 60,
      snapshotRate: 20,
    }
  }));

  globalRoom.addPlayer(playerId, socket);

  socket.on('close', () => {
    console.log(`${playerId} disconnected.`);
    // Remove the player from the active game state
    globalRoom.state.players = globalRoom.state.players.filter(p => p.id !== playerId);
  });
});

console.log(`Game Server running on ws://localhost:${PORT}`);