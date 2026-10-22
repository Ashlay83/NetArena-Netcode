export const ANGLE_STEPS = 65536;
export const TWO_PI = Math.PI*2;

const sinTable= new Float64Array(ANGLE_STEPS);
const cosTable = new Float64Array(ANGLE_STEPS);

export interface Vector2{
  x:number;
  y:number;
}



for (let i=0; i<ANGLE_STEPS;i++){

  const angle = (i/ANGLE_STEPS) * TWO_PI;
  sinTable[i]= Math.sin(angle);
  cosTable[i]= Math.cos(angle);

}


export function getSin(quantizedAngle:number):number{
  return sinTable[quantizedAngle & 0xFFFF];

}

export function getCos(quantizedAngle:number):number{
  return cosTable[quantizedAngle & 0xFFFF]
}


export function add(a: Vector2 , b: Vector2):Vector2{
  return {x: a.x+b.x, y:a.y+ b.y};
}

export function sub(a:Vector2 , b:Vector2):Vector2{
  return {x: a.x-b.x, y:a.y-b.y};
}

export function mag(v:Vector2):number{
  return Math.sqrt(v.x*v.x+v.y*v.y);
}

export function normalize(v:Vector2):Vector2{
  const m = mag(v);
  if(m===0) return {x:0,y:0};
  return {x:v.x/m,y:v.y/m};
}

export function dot(a:Vector2,b:Vector2):number{
  return a.x* b.x +a.y *b.y;

}

export function rayCircleIntersect(
  origin:Vector2,
  dir:Vector2,
  center:Vector2,
  radius:number,
  maxRange:number
):boolean{
  const toCenter = sub(center,origin);

  const projection = dot(toCenter,dir);

  if(projection<0||projection >maxRange+radius ){
    return false;
  }

  const closestPoint: Vector2 = {
    x:origin.x + dir.x * projection,
    y:origin.y + dir.y * projection
  };

  const distance = mag(sub(center, closestPoint));

  return distance<=radius;
}