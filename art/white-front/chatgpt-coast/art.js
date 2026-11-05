import { detailCanvas, grit } from "ember/js/detail.js";

// Original game-sized paintings based on the reviewed concepts. All expensive
// raster work happens on import, never when an enemy enters the screen.
const P = { ink: '#202a32', dark: '#354144', steel: '#596264', olive: '#6c7050',
  green: '#858669', cream: '#c9c5ac', light: '#e0dcc1', snow: '#e8eee5',
  copper: '#9b7953', amber: '#d99b43', lamp: '#f1d69a' };
function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(x, y, w, h); }
function poly(c, points, color) {
  // Scan-convert onto half pixels: no antialiased outlines or blurred edges.
  for (let y = Math.floor(Math.min(...points.map(p => p[1])) * 2) / 2;
    y < Math.max(...points.map(p => p[1])); y += .5) {
    const crosses = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], cy = y + .25;
      if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy))
        crosses.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    crosses.sort((a,b) => a-b);
    for (let i = 0; i + 1 < crosses.length; i += 2) {
      const x = Math.round(crosses[i] * 2) / 2;
      rect(c, x, y, Math.round(crosses[i+1] * 2) / 2 - x, .5, color);
    }
  }
}
function disc(c, x, y, r, color) {
  for (let row = -r; row < r; row += .5) {
    const half = Math.floor(Math.sqrt(Math.max(0, r*r - (row+.25)**2)) * 2) / 2;
    rect(c, x-half, y+row, half*2, .5, color);
  }
}
function panel(c, x, y, w, h, color=P.olive) {
  rect(c,x,y,w,h,P.ink);rect(c,x+.5,y+.5,w-1,h-1,color);
  rect(c,x+1,y+.5,w-2,.5,color===P.cream?P.light:P.green);
  rect(c,x+.5,y+1,.5,h-2,color===P.cream?P.light:P.steel);
  rect(c,x+1,y+h-1,w-1.5,.5,P.dark);
  for (const dx of [1,w-1.5]) for (const dy of [1,h-1.5]) rect(c,x+dx,y+dy,.5,.5,P.steel);
}
function vent(c,x,y,w,h) {
  panel(c,x,y,w,h,P.dark);
  for(let row=1;row<h-1;row+=1.5)rect(c,x+1,y+row,w-2,.5,P.steel);
}
function gun(c,x,y,w=6) {
  rect(c,x,y,w,2.5,P.ink);rect(c,x+.5,y+.5,w-1,.5,P.steel);
  rect(c,x+1,y+1.5,w-1,.5,P.dark);rect(c,x,y+.5,.5,1.5,P.copper);
}
function lamp(c,x,y) { rect(c,x-.5,y-.5,2.5,2,P.ink);rect(c,x,y,1.5,1,P.amber);rect(c,x,y,.5,.5,P.lamp); }
function skiff(c) {
  poly(c,[[2,12],[7,14],[31,14],[29,16],[5,16],[1,13]],P.ink);
  rect(c,5,14.5,24,.5,P.steel);
  panel(c,9,10,3,4,P.steel);panel(c,25,10,3,4,P.steel);
  poly(c,[[2,6],[8,3],[26,3],[32,7],[30,12],[9,12],[3,10]],P.ink);
  poly(c,[[4,6],[9,4],[24,4],[28,6],[27,10],[9,11],[4,9]],P.olive);
  poly(c,[[4,6],[10,4],[15,5],[13,11],[8,10]],P.cream);
  panel(c,15,5,8,5);vent(c,24,6,5,4);panel(c,29,7,3,4,P.dark);
  gun(c,0,6,7);gun(c,1,9,6);lamp(c,9,5);
  rect(c,14,2.5,5,.5,P.ink);rect(c,15,2,3,.5,P.steel);
}
function anchor(c,open) {
  poly(c,[[1,20],[5,16],[10,16],[12,19],[21,20],[22,22],[0,22]],P.ink);
  poly(c,[[2,20],[6,17],[10,18],[11,21],[20,20],[21,21],[2,21]],P.steel);
  panel(c,9,12,5,7,P.dark);
  poly(c,[[4,7],[9,2],[19,3],[22,7],[20,14],[10,16],[5,12]],P.ink);
  panel(c,10,4,10,10);vent(c,17,7,4,5);
  if(open){
    panel(c,7,6,7,6,P.dark);rect(c,9,7,4,.5,P.copper);
    poly(c,[[6,6],[8,1],[14,2],[12,5]],P.cream);
    poly(c,[[6,12],[12,13],[14,16],[8,15]],P.cream);
  }else panel(c,6,4,8,10,P.cream);
  gun(c,0,7,11);rect(c,3,6.5,1,3.5,P.steel);lamp(c,16,3);
}
function dart(c,open) {
  poly(c,[[0,6],[12,0],[24,2],[20,6],[24,10],[12,12]],P.ink);
  poly(c,[[2,6],[12,1],[22,2.5],[18,6],[22,9.5],[12,11]],P.olive);
  poly(c,[[2,6],[11,3.5],[14,5],[13,8],[10,9]],P.cream);
  panel(c,13,4,8,4,P.dark);vent(c,20,4,3,4);lamp(c,12,3);
  if(open)gun(c,1,5,11);else rect(c,4,5.5,8,.5,P.steel);
  rect(c,15,2,5,.5,P.green);rect(c,15,9.5,5,.5,P.dark);
}
function bomber(c,open) {
  poly(c,[[0,5],[8,1],[19,6],[30,1],[38,5],[36,11],[27,10],[24,16],[13,16],[9,10],[2,11]],P.ink);
  poly(c,[[2,5],[8,2],[17,7],[12,11],[7,8],[2,9]],P.cream);
  poly(c,[[22,7],[30,2],[36,5],[35,9],[29,8],[25,12]],P.olive);
  panel(c,1,5,6,6,P.dark);vent(c,2,6,4,4);
  panel(c,31,5,6,6,P.dark);vent(c,32,6,4,4);
  poly(c,[[8,8],[14,4],[24,5],[29,9],[24,16],[14,17],[9,14]],P.ink);
  poly(c,[[9,8],[15,5],[23,6],[26,9],[23,14],[14,15],[10,13]],P.cream);
  panel(c,17,6,8,5);lamp(c,11,8);vent(c,23,10,4,4);
  if(open){
    panel(c,13,13,11,5,P.dark);
    for(const x of [15,20]){panel(c,x,14,3,3,P.copper);rect(c,x+.5,14,1,.5,P.light);}
    rect(c,12,14,1,4,P.cream);rect(c,24,14,1,4,P.cream);
  }else panel(c,13,13,11,3,P.olive);
}
function roller(c) {
  poly(c,[[6,9],[15,6],[27,10],[29,17],[22,21],[7,20]],P.ink);
  panel(c,11,8,15,10);panel(c,12,8,6,7,P.cream);vent(c,20,10,5,5);
  for(const [x,y,r] of [[8,15,8],[25,17,5]]){
    disc(c,x,y,r,P.ink);disc(c,x,y,r-1,P.steel);disc(c,x,y,r-2,P.dark);
    for(let dy=-r+2;dy<r-1;dy+=2)rect(c,x-r/2,y+dy,r,.5,P.steel);
    disc(c,x,y,r*.48,P.ink);disc(c,x,y,r*.3,P.steel);disc(c,x,y,1,P.copper);
  }
  poly(c,[[8,14],[10,13],[15,20],[14,21]],P.steel);
  disc(c,19,5,4,P.ink);disc(c,19,5,3,P.steel);
  for(const [x,y] of [[18,4],[20,4],[18,6],[20,6]])disc(c,x,y,1,P.cream);
  gun(c,2,3,16);lamp(c,24,8);
}
function needle(c) {
  poly(c,[[24,12],[30,1],[34,0],[32,12],[39,13],[39,17],[31,18],[33,22],[30,21],[27,18],[13,17],[9,15]],P.ink);
  poly(c,[[25,12],[30.5,2],[33,1],[31,12]],P.olive);
  poly(c,[[27,12],[31,4],[31.5,3],[30,12]],P.cream);
  panel(c,13,12,22,5);panel(c,10,12,10,5,P.cream);vent(c,30,13,5,4);
  panel(c,36,13,4,4,P.dark);gun(c,0,13,18);lamp(c,17,12);
  poly(c,[[22,16],[26,16],[28,20],[26,20]],P.cream);
}
function hunter(c) {
  poly(c,[[10,9],[17,3],[31,0],[29,3],[21,7],[19,11],[26,13],[32,19],[31,22],[19,19],[12,15],[1,14],[0,10]],P.ink);
  poly(c,[[12,9],[18,4],[29,1],[27,3],[20,6],[17,10]],P.cream);
  poly(c,[[16,14],[22,14],[30,20],[30,21],[21,18]],P.cream);
  poly(c,[[17,6],[23,3],[27,3],[21,7],[19,10],[16,10]],P.olive);
  poly(c,[[18,14],[23,15],[28,20],[23,18]],P.olive);
  panel(c,8,9,17,7);poly(c,[[1,11],[8,8],[13,10],[11,15],[3,14]],P.cream);
  panel(c,23,10,5,6,P.dark);vent(c,24,11,3,4);gun(c,0,10,7);gun(c,1,13,6);lamp(c,8,10);
  for(const [x,y] of [[24,3],[27,2],[23,17],[26,19]])panel(c,x,y,2,1.5,P.steel);
}
function charge(c){disc(c,4,4,4,P.ink);disc(c,4,4,3,P.copper);disc(c,4,4,2,P.dark);rect(c,2,1,3,.5,P.cream);lamp(c,3,3);}
function bomb(c){poly(c,[[2,0],[6,0],[7,3],[6,8],[2,8],[1,3]],P.ink);panel(c,2,1,4,5,P.copper);rect(c,3,2,1,3,P.cream);rect(c,2,6,4,1,P.amber);}
// Revision 3: about 10–17% larger than the shipped enemy-class references.
// Keep the coast roster compact on the 208×144 grid.
// Keep the approved source silhouettes, sampled sharply onto the final grid.
const spec={
  skiff:[14,9,skiff,32,16],anchor:[12,8,anchor,22,22],
  dart:[11,8,dart,24,12],bomber:[18,10,bomber,38,18],
  roller:[16,10,roller,30,23],needle:[16,8,needle,40,22],
  hunter:[15,10,hunter,32,22],charge:[8,8,charge,8,8],bomb:[8,8,bomb,8,8]
};
function paint(w,h,fn,sw,sh,open,seed){
  const source=detailCanvas(sw,sh);fn(source.ctx,open);
  const {canvas}=detailCanvas(w,h);
  const sampled=canvas.hi.getContext('2d');sampled.setTransform(1,0,0,1,0,0);
  sampled.imageSmoothingEnabled=false;
  sampled.drawImage(source.canvas.hi,0,0,w*2,h*2);
  const c=canvas.hi.getContext('2d'),im=c.getImageData(0,0,w*2,h*2);
  const buf=im.data;
  for(let y=0;y<h*2;y++)for(let x=0;x<w*2;x++){
    const i=(y*w*2+x)*4;if(!buf[i+3])continue;
    // Fine scratches and frost use deterministic drawing grit, never game dice.
    const olive=buf[i]===108&&buf[i+1]===112, cream=buf[i]===201&&buf[i+1]===197;
    const n=grit(x,y,seed);
    if((olive||cream)&&n>.94){buf[i]=154;buf[i+1]=158;buf[i+2]=140;}
    if((olive||cream)&&n<.07 && y>0 && !buf[i-w*8+3]){buf[i]=232;buf[i+1]=238;buf[i+2]=229;}
  }
  // Restore a continuous one-sharp-pixel outline after reduction. Keep alpha
  // unchanged, so neither sharpness nor highlights inflate the collision shape.
  if(sw!==w||sh!==h){
    const stride=w*2;
    const solid=(x,y)=>x>=0&&y>=0&&x<stride&&y<h*2&&buf[(y*stride+x)*4+3]>127;
    for(let y=0;y<h*2;y++)for(let x=0;x<stride;x++){
      const i=(y*stride+x)*4;if(!buf[i+3])continue;
      if(!solid(x-1,y)||!solid(x+1,y)||!solid(x,y-1)||!solid(x,y+1)){
        buf[i]=24;buf[i+1]=36;buf[i+2]=44;
      }else if(!solid(x,y-2)&&buf[i]>85){
        // A restrained lit bevel separates armor panels from the darker edge.
        buf[i]=Math.min(240,buf[i]+14);buf[i+1]=Math.min(240,buf[i+1]+14);buf[i+2]=Math.min(232,buf[i+2]+10);
      }
    }
  }
  c.putImageData(im,0,0);
  canvas.mask=Uint8Array.from({length:w*h*4},(_,i)=>buf[i*4+3]>127?1:0);
  const flash=detailCanvas(w,h).canvas;
  for(let i=0;i<buf.length;i+=4)if(buf[i+3]){buf[i]=232;buf[i+1]=229;buf[i+2]=204;}
  flash.hi.getContext('2d').putImageData(im,0,0);canvas.flash=flash;
  return canvas;
}
export const RAW={skiff,anchor,dart,bomber,roller,needle,hunter,spec};
export const ART=Object.fromEntries(Object.entries(spec).map(([key,[w,h,fn,sw,sh]],i)=>[key,{idle:paint(w,h,fn,sw,sh,false,700+i),open:paint(w,h,fn,sw,sh,true,700+i)}]));
const picture=e=>ART[e.T.art][['warn','vent','aim'].includes(e.mode)?'open':'idle'];
export function artHit(e,x,y,w,h){
  const pic=picture(e);
  const x0=Math.max(0,Math.floor((x-e.x)*2)),x1=Math.min(e.w*2,Math.ceil((x+w-e.x)*2));
  const y0=Math.max(0,Math.floor((y-e.y)*2)),y1=Math.min(e.h*2,Math.ceil((y+h-e.y)*2));
  for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++)if(pic.mask[py*pic.width*2+px])return 'hit';
  return null;
}
export function body(e,c,snap){
  const pic=picture(e);
  c.drawImage(e.flash>0?pic.flash:pic,snap(e.x),snap(e.y));
}
export function target(c,x,y,snap,lit=true){
  c.fillStyle=lit?'#e4b16a':'#b05b4c';
  for(let k=-7;k<=7;k++){
    const dy=Math.round(Math.sqrt(Math.max(0,49-k*k)));
    c.fillRect(snap(x+k),snap(y-dy),1,.5);c.fillRect(snap(x+k),snap(y+dy),1,.5);
  }
  c.fillRect(snap(x-3),snap(y),6,.5);c.fillRect(snap(x),snap(y-3),.5,6);
}
