import { VIEW_W, HUD_H } from "ember/js/config.js";
import { GROUND_SPEED } from "ember/js/terrain.js";
import { clamp, rectsOverlap } from "ember/js/util.js";
import { sfx } from "ember/js/audio.js";
import { ART, artHit, body, target } from "ember/demos/glacier-combat/art.js";

const event=(g,e,kind,extra={})=>g.audit.push({time:g.time,id:e.id,type:e.type,kind,...extra});
const facing=(e,g)=>g.state==='playing' && e.x>=g.player.x+g.player.w+5 && e.x+e.w<=VIEW_W-2 && e.x>8;
const muzzle=e=>e.T.muzzle && e.T.muzzle!==muzzle ? e.T.muzzle(e) : ({x:e.x+1,y:e.y+(e.T.gunY??e.h/2)});
const aim=(e,g)=>{const m=muzzle(e),p=g.playerCenter();return Math.atan2(p.y-m.y,p.x-m.x);};
function phase(e,mode,time,g){
  e.mode=mode;e.timer=time;e.charge=mode==='warn'?1:0;
  if(mode==='warn')event(g,e,'warn',{duration:time,x:muzzle(e).x,y:muzzle(e).y,angle:e.angle});
}
function shot(e,g,angle,speed=76,kind='orb'){
  const m=muzzle(e),s=g.fireShot(m.x,m.y,angle,speed,kind);
  if(kind==='shell')s.dmg=2;
  event(g,e,'fire',{angle,speed,x:m.x,y:m.y});sfx.tick();return s;
}
function common(art,hp,score,extra){
  return {art,hp,score,gore:{metal:5},ram:2,hitTest:artHit,draw:body,...extra};
}
function separate(e,g,dt){
  for(const o of g.enemies){
    if(o===e||o.dead||!o.T.flies||!rectsOverlap(e.x-2,e.y-2,e.w+4,e.h+4,o.x,o.y,o.w,o.h))continue;
    // Keep later arrivals behind a staying craft if lanes are occupied.
    if(e.id<o.id)continue;
    const down=e.baseY>=o.y,dy=down?o.y+o.h+4-e.y:o.y-e.h-4-e.y;
    const y=clamp(e.y+clamp(dy,-90*dt,90*dt),HUD_H+3,g.terrain.floorY-e.h-11);
    e.baseY+=y-e.y;e.y=y;
    if(rectsOverlap(e.x,e.y,e.w,e.h,o.x,o.y,o.w,o.h))e.x+=70*dt;
  }
}
function line(c,e,snap,locked){
  const m=muzzle(e),a=e.angle??Math.PI;
  c.fillStyle=locked?'#d99b43':'#a88969';
  for(let d=6;d<215;d+=6){const x=m.x+Math.cos(a)*d,y=m.y+Math.sin(a)*d;
    if(x<0||y<HUD_H+1||y>129)break;c.fillRect(snap(x),snap(y),1,.5);}
}
export const LOCAL_TYPES={
  shelfSkiff:common('skiff',4,40,{
    gunY:3.5,
    init(e,g){e.y=g.terrain.floorY-e.h;e.volleys=0;phase(e,'enter',0,g);},
    update(e,dt,g){
      e.y=g.terrain.floorY-e.h;
      e.x-=(e.mode==='enter'?52:e.mode==='leave'?65:GROUND_SPEED)*dt;
      if(e.mode==='enter'&&e.x<=148)phase(e,'brake',.35,g);
      else if(e.mode==='brake'){
        e.timer-=dt;if(e.timer<=0&&facing(e,g))phase(e,'warn',.6,g);
      }else if(e.mode==='warn'){
        e.timer-=dt;
        if(!facing(e,g))phase(e,'leave',0,g);
        else if(e.timer<=0){const a=aim(e,g);for(const d of [-.17,0,.17])shot(e,g,a+d,72);
          e.volleys++;phase(e,e.volleys<2?'brake':'leave',1.2,g);}
      }
      if(e.x<g.player.x+g.player.w+4&&e.mode!=='enter')phase(e,'leave',0,g);
    }
  }),
  anchorGun:common('anchor',4,50,{
    gunY:3,isVulnerable:e=>e.mode==='warn'||e.mode==='vent',
    init(e,g){e.y=g.terrain.floorY-e.h;phase(e,'closed',.7,g);},
    update(e,dt,g){
      e.y=g.terrain.floorY-e.h;e.x-=GROUND_SPEED*dt;
      if(e.mode==='closed'){
        if(facing(e,g)){e.timer-=dt;if(e.timer<=0)phase(e,'warn',.75,g);}
      }else if(e.mode==='warn'){
        e.timer-=dt;
        if(!facing(e,g))phase(e,'closed',.7,g);
        else if(e.timer<=0){shot(e,g,aim(e,g),70,'shell');phase(e,'vent',1.6,g);}
      }else if(e.mode==='vent'){e.timer-=dt;if(e.timer<=0)phase(e,'closed',1.3,g);}
    }
  }),
  twinDart:common('dart',2,30,{
    flies:true,
    init(e,g){e.baseY=e.y;e.shots=0;phase(e,'enter',0,g);},
    update(e,dt,g){
      e.y=e.baseY+Math.sin(e.t*2)*2;
      if(e.mode==='enter'){e.x-=48*dt;if(e.x<=(e.lane?177:148))phase(e,'wait',.5+(e.lane||0)*.65,g);}
      else if(e.mode==='leave')e.x-=70*dt;
      else if(e.mode==='wait'){
        e.timer-=dt;if(e.timer<=0){if(facing(e,g))phase(e,'warn',.45,g);else phase(e,'leave',0,g);}
      }else if(e.mode==='warn'){
        e.timer-=dt;
        if(!facing(e,g))phase(e,'leave',0,g);
        else if(e.timer<=0){shot(e,g,aim(e,g),82);e.shots++;phase(e,e.shots<2?'wait':'leave',1.15,g);}
      }
      separate(e,g,dt);
    }
  }),
  crestBomber:common('bomber',5,60,{
    flies:true,
    muzzle:e=>({x:e.x+e.w/2,y:e.y+e.h-1}),
    init(e,g){e.baseY=e.y;e.drops=0;phase(e,'enter',0,g);},
    update(e,dt,g){
      e.y=e.baseY+Math.sin(e.t)*1.5;
      if(e.mode==='enter'){e.x-=38*dt;if(e.x<=148)phase(e,'wait',.4,g);}
      else if(e.mode==='leave')e.x-=52*dt;
      else if(e.mode==='wait'){
        e.timer-=dt;
        if(e.timer<=0&&facing(e,g)){
          const p=g.playerCenter();e.tx=clamp(p.x,12,185);e.ty=clamp(p.y,e.y+e.h+14,g.terrain.floorY-13);
          phase(e,'warn',.8,g);
        }else if(!facing(e,g))phase(e,'leave',0,g);
      }else if(e.mode==='warn'){
        e.timer-=dt;
        if(!facing(e,g))phase(e,'leave',0,g);
        else if(e.timer<=0){
          const x=e.x+e.w/2-4,y=e.y+e.h-3;
          g.spawnEnemy('coastBomb',x,y,{tx:e.tx,ty:e.ty});
          event(g,e,'fire',{x,y,targetX:e.tx,targetY:e.ty});sfx.tick();
          e.drops++;phase(e,e.drops<2?'wait':'leave',1.4,g);
        }
      }
      separate(e,g,dt);
    },
    draw(e,c,snap){if(e.mode==='warn')target(c,e.tx,e.ty,snap,Math.floor(e.t*8)%2===0);body(e,c,snap);}
  }),
  snowRoller:common('roller',5,60,{
    gunY:2,
    init(e,g){e.y=g.terrain.floorY-e.h;e.shots=0;phase(e,'enter',0,g);},
    update(e,dt,g){
      e.y=g.terrain.floorY-e.h;e.x-=(e.mode==='enter'?42:e.mode==='leave'?45:GROUND_SPEED)*dt;
      if(e.mode==='enter'&&e.x<=149)phase(e,'wait',.35,g);
      else if(e.mode==='wait'){
        e.timer-=dt;if(e.timer<=0&&facing(e,g))phase(e,'warn',.8,g);
      }else if(e.mode==='warn'){
        e.timer-=dt;
        if(!facing(e,g))phase(e,'leave',0,g);
        else if(e.timer<=0){
          const x=e.x-6,y=g.terrain.floorY-8;
          g.spawnEnemy('rollingCharge',x,y,{life:1.5});
          event(g,e,'fire',{x,y});sfx.tick();e.shots++;
          phase(e,e.shots<2?'wait':'leave',1.65,g);
        }
      }
      if(e.x<g.player.x+g.player.w+4&&e.mode!=='enter')phase(e,'leave',0,g);
    }
  }),
  needleWing:common('needle',3,50,{
    flies:true,gunY:5,
    init(e,g){e.baseY=e.y;e.shots=0;phase(e,'enter',0,g);},
    update(e,dt,g){
      if(e.mode==='enter'){e.x-=46*dt;if(e.x<=150)phase(e,'aim',.5,g);}
      else if(e.mode==='leave')e.x-=78*dt;
      else if(e.mode==='aim'){
        e.angle=aim(e,g);e.timer-=dt;
        if(e.timer<=0&&facing(e,g))phase(e,'warn',.65,g);
        else if(!facing(e,g))phase(e,'leave',0,g);
      }else if(e.mode==='warn'){
        e.timer-=dt;
        if(!facing(e,g))phase(e,'leave',0,g);
        else if(e.timer<=0){shot(e,g,e.angle,110,'fast');e.shots++;
          phase(e,e.shots<2?'aim':'leave',1.0,g);}
      }
      separate(e,g,dt);
    },
    draw(e,c,snap){if(e.mode==='aim'||e.mode==='warn')line(c,e,snap,e.mode==='warn');body(e,c,snap);}
  }),
  wakeHunter:common('hunter',3,50,{
    flies:true,
    init(e,g){e.baseY=e.y;phase(e,'enter',0,g);},
    update(e,dt,g){
      if(e.mode==='enter'){e.x-=52*dt;if(e.x<=145){e.angle=aim(e,g);phase(e,'warn',.8,g);}}
      else if(e.mode==='warn'){
        e.timer-=dt;
        if(!facing(e,g))phase(e,'leave',0,g);
        else if(e.timer<=0){e.vx=Math.cos(e.angle)*145;e.vy=Math.sin(e.angle)*145;
          phase(e,'dash',.9,g);event(g,e,'dash',{vx:e.vx,vy:e.vy,angle:e.angle});sfx.tick();}
      }else if(e.mode==='dash'){
        e.x+=e.vx*dt;e.y=clamp(e.y+e.vy*dt,HUD_H+3,g.terrain.floorY-e.h-11);
        e.timer-=dt;if(e.timer<=0)phase(e,'leave',0,g);
      }else if(e.mode==='leave'){e.x-=80*dt;e.y=Math.max(HUD_H+3,e.y-30*dt);}
      if(e.mode!=='dash')separate(e,g,dt);
    },
    draw(e,c,snap){if(e.mode==='warn')line(c,e,snap,true);body(e,c,snap);}
  }),
  coastBomb:common('bomb',1,10,{
    noTarget:true,ram:1,explodeSize:.3,gore:{metal:1},
    init(e,g){e.sx=e.x;e.sy=e.y;phase(e,'fall',1.1,g);},
    update(e,dt,g){
      const k=Math.min(1,e.t/1.1);e.x=e.sx+(e.tx-4-e.sx)*k;e.y=e.sy+(e.ty-4-e.sy)*k*k;
      if(k>=1){e.dead=true;g.blasts.blast(e.tx,e.ty,.65);
        if(g.playerVulnerable()&&g.touchesPlayer(e.tx-5,e.ty-5,10,10))g.hurtPlayer(1,e);
        for(let i=0;i<6;i++)g.fireShot(e.tx,e.ty,i*Math.PI/3,58);
        event(g,e,'burst');sfx.explode(.5);}
    },
    draw(e,c,snap){target(c,e.tx,e.ty,snap,Math.floor(e.t*8)%2===0);body(e,c,snap);}
  }),
  rollingCharge:common('charge',1,10,{
    noTarget:true,ram:1,explodeSize:.3,gore:{metal:1},
    init(e,g){e.y=g.terrain.floorY-e.h;e.life=e.life||1.5;e.warned=false;phase(e,'roll',e.life,g);},
    update(e,dt,g){
      e.x-=54*dt;e.y=g.terrain.floorY-e.h;
      if(e.t>=e.life-.65&&!e.warned){e.warned=true;e.charge=1;event(g,e,'warn',{duration:.65});}
      if(e.t>=e.life){e.dead=true;g.blasts.blast(e.x+4,e.y+4,.65);
        for(let i=0;i<5;i++)g.fireShot(e.x+4,e.y+2,-Math.PI+.25+i*(Math.PI-.5)/4,62);
        event(g,e,'burst');sfx.explode(.5);}
    },
    draw(e,c,snap){
      if(e.warned){target(c,e.x+4,e.y-8,snap,Math.floor(e.t*10)%2===0);}
      body(e,c,snap);
    }
  })
};
// The shared Game renderer uses this hook for the existing warning cross.
for(const T of Object.values(LOCAL_TYPES))if(!T.muzzle)T.muzzle=muzzle;
export function spawnLocal(g,type,x,y,opts={}){
  const T=LOCAL_TYPES[type],pic=ART[T.art].idle;
  const e={type,T,x,y,w:pic.width,h:pic.height,hp:T.hp,maxHp:T.hp,t:0,flash:0,id:++g.nextId,...opts};
  T.init(e,g);g.enemies.push(e);event(g,e,'spawn');return e;
}
