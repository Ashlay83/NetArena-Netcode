import {step, createInitialState, type GameState, type InputCmd} from '../../../packages/shared/src/state.js'



export class Room {
  public state: GameState;

  private clients:Map<string,any> = new Map();

  private pendingInputs:Record<string,InputCmd> = {};

  private tickRate =60;
  private snapshotRate= 20;

  private intervalId?:NodeJS.Timeout;
  private lastTime:bigint;
  private accumulator =0;
  private lastProcessedInputSeq: Record<string, number>={};

  constructor(public roomId:string){
    this.state={
        tick:0,
        players:[]
    }
    this.lastTime= process.hrtime.bigint();
    }

    addPlayer(playerId: string, socket: any) {
    this.clients.set(playerId, socket);
    this.lastProcessedInputSeq[playerId]=0;
    // 1. Initialize the player in the center of the arena
    this.state.players.push({
      id: playerId,
      position: { x: 600, y: 400 },
      velocity: { x: 0, y: 0 },
      health: 100,
      isDead: false,
      lastFiredTick: 0,
      deadUntilTick: 0,
      invulnerableUntilTick: 0
    });

    socket.on('message',(message:string)=>{
      const parsed = JSON.parse(message);
      if(parsed.type==='INPUT'){
        const input:InputCmd=parsed.payload;

        if(input.seq>(this.lastProcessedInputSeq[playerId]||0)){
          this.pendingInputs[playerId]=input;
          this.lastProcessedInputSeq[playerId]=input.seq;

        }
      }
    })
  }

  start() {
    // Run our check every ~5ms to see if we need to run a 16.66ms tick
    this.intervalId = setInterval(() => this.loop(), 5);
  }

  private loop() {
    const now = process.hrtime.bigint();
    // Convert nanoseconds to seconds
    const dt = Number(now - this.lastTime) / 1_000_000_000; 
    this.lastTime = now;
    this.accumulator += dt;

    const TICK_INTERVAL = 1 / this.tickRate;

    while (this.accumulator >= TICK_INTERVAL) {
      // 1. Run the simulation step[cite: 1]
      step(this.state, this.pendingInputs, TICK_INTERVAL);
      
      // 2. Clear inputs after processing so players don't keep moving if they stop sending
      this.pendingInputs = {}; 

      // 3. Send Snapshots at 20 Hz (every 3 ticks)[cite: 1]
      if (this.state.tick % (this.tickRate / this.snapshotRate) === 0) {
        this.broadcastSnapshot();
      }

      this.accumulator -= TICK_INTERVAL;
    }
  }

 private broadcastSnapshot() {
    for (const [playerId, socket] of this.clients.entries()) {
      if (socket.readyState === 1) {
        // Send snapshot with the specific player's last processed input sequence
        const snapshotMsg = JSON.stringify({
          type: 'SNAPSHOT_FULL',
          payload: {
            ...this.state,
            lastProcessedInputSeq: this.lastProcessedInputSeq[playerId] || 0
          }
        });
        socket.send(snapshotMsg);
      }
    }
  }
}
