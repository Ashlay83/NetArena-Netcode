import { useEffect, useRef, useState } from 'react';
import { WebSocketTransport, SimulatedLinkTransport } from '../../../packages/transport'; 
import { step, type GameState, type InputCmd } from '../../../packages/shared/src/state';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}


let snapshotBuffer: Array<{ time: number; state: GameState }> = [];
const INTERP_DELAY = 100; // 100 ms interpolation delay[cite: 3]

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [latency, setLatency] = useState(150);
  const [packetLoss, setPacketLoss] = useState(0.05);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Setup transport layer
    const rawSocket = new WebSocket('ws://localhost:8080');
    const wsTransport = new WebSocketTransport(rawSocket);
    const link = new SimulatedLinkTransport(wsTransport, latency, packetLoss);

    let localPlayerId = '';
    
    // Phase 2 State Management
    let predictedState: GameState | null = null;
    let pendingInputs: InputCmd[] = [];
    let inputSeq = 0;

    // 2. Handle Server Messages
    link.onMessage((data) => {
      const msg = JSON.parse(data as string);

      if (msg.type === 'SNAPSHOT_FULL') {
          const serverSnapshot = msg.payload;
  // ... reconciliation logic for local player ...

  // Store snapshot in buffer with local receive timestamp
          snapshotBuffer.push({
          time: performance.now(),
          state: serverSnapshot
            });

  // Prune old snapshots (keep last 1 second)
          const cutoff = performance.now() - 1000;
          snapshotBuffer = snapshotBuffer.filter(s => s.time > cutoff);
}

      if (msg.type === 'WELCOME') {
        localPlayerId = msg.payload.playerId;
        console.log('Joined room as:', localPlayerId);
      } else if (msg.type === 'SNAPSHOT_FULL') {
        const serverSnapshot = msg.payload as GameState & { lastProcessedInputSeq: number };

        // --- SERVER RECONCILIATION ---
        if (localPlayerId) {
          // A. Discard acknowledged inputs from the buffer
          const ackSeq = serverSnapshot.lastProcessedInputSeq || 0;
          pendingInputs = pendingInputs.filter((cmd) => cmd.seq > ackSeq);

          // B. Set base predicted state to the authoritative server state
          predictedState = structuredClone(serverSnapshot);

          // C. Re-simulate unacknowledged inputs on top of authoritative base[cite: 3]
          const TICK_RATE = 1 / 60;
          for (const unackInput of pendingInputs) {
            step(
              predictedState,
              { [localPlayerId]: unackInput },
              TICK_RATE
            );
          }
        }
      }
    });

    // 3. Capture Keyboard Inputs
    const currentInput: InputCmd = { seq: 0, moveX: 0, moveY: 0, aim: 0, fire: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w') currentInput.moveY = -1;
      if (e.key === 's') currentInput.moveY = 1;
      if (e.key === 'a') currentInput.moveX = -1;
      if (e.key === 'd') currentInput.moveX = 1;
      if (e.key === ' ') currentInput.fire = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' && currentInput.moveY === -1) currentInput.moveY = 0;
      if (e.key === 's' && currentInput.moveY === 1) currentInput.moveY = 0;
      if (e.key === 'a' && currentInput.moveX === -1) currentInput.moveX = 0;
      if (e.key === 'd' && currentInput.moveX === 1) currentInput.moveX = 0;
      if (e.key === ' ') currentInput.fire = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 4. Fixed-Timestep Simulation & Render Loop (60 Hz)
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const TICK_RATE = 1 / 60; 

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      accumulator += dt;



      while (accumulator >= TICK_RATE) {
        if (localPlayerId && predictedState) {
          // A. Tag input command with incrementing sequence number[cite: 3]
          inputSeq++;
          const tickInput: InputCmd = { ...currentInput, seq: inputSeq };

          // B. Store in unacknowledged input buffer[cite: 3]
          pendingInputs.push(tickInput);

          // C. CLIENT-SIDE PREDICTION: Apply input locally immediately[cite: 3]
          step(
            predictedState,
            { [localPlayerId]: tickInput },
            TICK_RATE
          );

          // D. Send input to the server[cite: 3]
          link.send(
            JSON.stringify({
              type: 'INPUT',
              payload: tickInput
            })
          );
        }
        accumulator -= TICK_RATE;
      }

      // 5. Render Local Predicted State
     // Render Phase
ctx.clearRect(0, 0, canvas.width, canvas.height);

const renderTime = performance.now() - INTERP_DELAY;

// Separate rendering for local player vs remote players
if (predictedState) {
  for (const player of predictedState.players) {
    if (player.isDead) continue;

    if (player.id === localPlayerId) {
      // 1. Render Local Player immediately at predicted position
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6'; // Blue
      ctx.fill();
      ctx.closePath();
    } else {
      // 2. Render Remote Player using Interpolation[cite: 3]
      let renderX = player.position.x;
      let renderY = player.position.y;

      // Find surrounding snapshots in buffer
      if (snapshotBuffer.length >= 2) {
        let prev = snapshotBuffer[0];
        let next = snapshotBuffer[snapshotBuffer.length - 1];

        for (let i = 0; i < snapshotBuffer.length - 1; i++) {
          if (snapshotBuffer[i].time <= renderTime && snapshotBuffer[i + 1].time >= renderTime) {
            prev = snapshotBuffer[i];
            next = snapshotBuffer[i + 1];
            break;
          }
        }

        const prevPlayer = prev.state.players.find(p => p.id === player.id);
        const nextPlayer = next.state.players.find(p => p.id === player.id);

        if (prevPlayer && nextPlayer) {
          const total = next.time - prev.time;
          const portion = renderTime - prev.time;
          const alpha = total > 0 ? Math.max(0, Math.min(1, portion / total)) : 0;

          renderX = lerp(prevPlayer.position.x, nextPlayer.position.x, alpha);
          renderY = lerp(prevPlayer.position.y, nextPlayer.position.y, alpha);
        }
      }

      ctx.beginPath();
      ctx.arc(renderX, renderY, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e'; // Green
      ctx.fill();
      ctx.closePath();
    }
  }
}
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
      link.disconnect();
    };
  }, [latency, packetLoss]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '20px' }}>
        <label>
          Latency: {latency} ms
          <input
            type="range"
            min="0"
            max="500"
            value={latency}
            onChange={(e) => setLatency(Number(e.target.value))}
            style={{ marginLeft: '10px' }}
          />
        </label>
        <label>
          Packet Loss: {(packetLoss * 100).toFixed(0)}%
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            value={packetLoss}
            onChange={(e) => setPacketLoss(Number(e.target.value))}
            style={{ marginLeft: '10px' }}
          />
        </label>
      </div>
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        style={{ border: '2px solid #333', background: '#f8f9fa' }}
      />
    </div>
  );
}

export default App;