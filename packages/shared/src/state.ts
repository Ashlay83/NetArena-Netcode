import  {  getCos, normalize, getSin, rayCircleIntersect} from "./math";
import type  { Vector2} from "./math";

const MAX_SPEED = 220;
const ARENA_WIDTH = 1200;
const ARENA_HEIGHT= 800;
const PLAYER_RADIUS= 16;
const FIRE_COOLDOWN_TICKS= Math.floor(0.4*60);
const MAX_RANGE = 700;
const DAMAGE = 25;



export interface Player {
    id:string ;
    position: Vector2;
    velocity:Vector2;
    health: number;
    lastFiredTick:number;
    isDead:boolean;
    deadUntilTick:number;
    invulnerableUntilTick:number;

}

export interface InputCmd{
    seq:number;
    moveX:number;
    moveY:number;
    aim:number;
    fire:boolean;
}

export interface GameState{
    tick:number;
    players:Player[];
    
}

export function hashState(state: GameState): string {
  return JSON.stringify(state);
}

export function step(state: GameState, inputs: Record<string, InputCmd>, dt: number) {
    state.tick++;
    state.players.sort((a,b)=>a.id.localeCompare(b.id));

    for(const player of state.players){
        const input = inputs[player.id];
        if(!input) continue;

        if(player.isDead){
            if(state.tick>=player.deadUntilTick){
                player.health=100;
                player.isDead=false;
                player.position.x=100;
                player.position.y=100;
                player.invulnerableUntilTick=state.tick+90;
            }
            continue;
        }
        const rawMove: Vector2={x:input.moveX,y:input.moveY};

        const normalizedMove=normalize(rawMove);

        player.velocity.x=normalizedMove.x*MAX_SPEED;
        player.velocity.y= normalizedMove.y*MAX_SPEED;


        player.position.x+=player.velocity.x*dt;
        player.position.y+=player.velocity.y*dt;


        player.position.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_WIDTH - PLAYER_RADIUS, player.position.x));
        player.position.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_HEIGHT - PLAYER_RADIUS, player.position.y));

        if(input.fire && state.tick >= player.lastFiredTick + FIRE_COOLDOWN_TICKS){
            player.lastFiredTick= state.tick;

            const dir:Vector2 = {
                x:getCos(input.aim),
                y:getSin(input.aim)
            };

            for(const target of state.players){
                if(target.id===player.id|| target.isDead|| state.tick <target.invulnerableUntilTick)continue;

                
                const isHit= rayCircleIntersect(
                    player.position,
                    dir,
                    target.position,
                    PLAYER_RADIUS,
                    MAX_RANGE
                );

                if(isHit){
                    target.health-=DAMAGE;
                    if(target.health<=0){
                        target.isDead=true;
                        target.deadUntilTick= state.tick +180;
                    }
                }
            }

        }



    }
}

export function createInitialState(seed: number): GameState {
  // We pass a seed so that both the server and client can generate the 
  // exact same random obstacle layouts or spawn points later using createPRNG(seed).
  
  return {
    tick: 0,
    players: [] // Players start empty; the authoritative server adds them as they connect.
  };
}
