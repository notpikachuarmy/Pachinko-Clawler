"use strict";

const { Engine, Render, Runner, Bodies, Body, Composite, Events, Common, Sleeping } = Matter;
if (window.decomp) Common.setDecomp(window.decomp);

const CONFIG = Object.freeze({
  boardWidth: 720, boardHeight: 900, launchAreaHeight: 110, bottomZoneTop: 790,
  wallThickness: 40, pegRadius: 11, shakeCooldownMs: 1200, enemyAttack: 3,
  colors: { background:"#171724",launchArea:"#24243a",launchLine:"#e4b84d",wall:"#4d4d65",peg:"#d8d8e4",activation:"#247a52",void:"#15151f",bumper:"#55556f" }
});

const itemDefinitions = new Map((window.PACHINKRAWLER_ITEMS || []).map(item => [item.id, item]));
const itemImages = new Map();
for (const definition of itemDefinitions.values()) { const image = new Image(); image.src = definition.sprite; itemImages.set(definition.id, image); }

const $ = selector => document.querySelector(selector);
const gameContainer=$("#game-container"), resetButton=$("#reset-button"), shakeButton=$("#shake-button"), debugButton=$("#debug-button"), passButton=$("#pass-button");
const backpackButton=$("#backpack-button"), closeBackpack=$("#close-backpack"), backpackModal=$("#backpack-modal"), inventoryList=$("#inventory-list");
const statusElement=$("#status"), enemyHpElement=$("#enemy-hp"), armorElement=$("#player-armor"), healthElement=$("#player-health"), logElement=$("#event-log");
const poolCountElement=$("#pool-count"), selectedNameElement=$("#selected-name"), selectedImageElement=$("#selected-image"), turnLabelElement=$("#turn-label");

const engine = Engine.create({ enableSleeping:true, gravity:{x:0,y:1,scale:.001} });
const render = Render.create({ element:gameContainer, engine, options:{width:CONFIG.boardWidth,height:CONFIG.boardHeight,wireframes:false,background:CONFIG.colors.background,pixelRatio:1} });
const runner = Runner.create();

const basePool = { sword_test:2, shield_test:2, potion_test:2 };
const gameState = {
  activeItems:new Set(), selectedItemId:"sword_test", nextItemId:1, debugHitboxes:false, shakeReady:true,
  boardBodies:[], slots:[], enemyHp:30, enemyMaxHp:30, playerArmor:0, playerHealth:20, maxHealth:20,
  turn:"player", pool:{...basePool}, combatOver:false
};

Render.run(render); Runner.run(runner, engine);

function createBoard(){ clearBoardBodies(); const bodies=[...createWalls(),...createPegs(),...createBottomZone()]; gameState.boardBodies=bodies; Composite.add(engine.world,bodies); }
function clearBoardBodies(){ for(const body of gameState.boardBodies) Composite.remove(engine.world,body); gameState.boardBodies=[]; }
function createWalls(){ const h=CONFIG.wallThickness/2,o={isStatic:true,restitution:.45,friction:.05,label:"board-wall",render:{fillStyle:CONFIG.colors.wall}}; return [Bodies.rectangle(-h,CONFIG.boardHeight/2,CONFIG.wallThickness,CONFIG.boardHeight,o),Bodies.rectangle(CONFIG.boardWidth+h,CONFIG.boardHeight/2,CONFIG.wallThickness,CONFIG.boardHeight,o)]; }
function createPegs(){ const pegs=[]; for(let row=0;row<8;row++){ const offset=row%2?41:0; for(let col=0;col<8;col++){ const x=72+col*82+offset,y=180+row*72; if(x>CONFIG.boardWidth-45)continue; pegs.push(Bodies.circle(x,y,CONFIG.pegRadius,{isStatic:true,restitution:.82,friction:.025,label:"peg",render:{fillStyle:CONFIG.colors.peg,strokeStyle:"#77778d",lineWidth:2}})); }} return pegs; }
function createBottomZone(){ const slotCount=5,slotWidth=CONFIG.boardWidth/slotCount,types=shuffle(["activation","wall","activation","void","wall"]); gameState.slots=types.map((type,index)=>({type,x:index*slotWidth,width:slotWidth})); const bodies=[]; for(let i=0;i<slotCount;i++){ const type=types[i],center=i*slotWidth+slotWidth/2; if(type==="wall") bodies.push(Bodies.rectangle(center,865,slotWidth-10,60,{isStatic:true,restitution:.7,friction:.08,label:"bottom-wall",render:{fillStyle:CONFIG.colors.bumper,strokeStyle:"#80809c",lineWidth:2}})); else bodies.push(Bodies.rectangle(center,875,slotWidth-8,42,{isStatic:true,isSensor:true,label:type==="activation"?"activation-slot":"void-slot",plugin:{pachinkrawler:{slotType:type}},render:{visible:false}})); } return bodies; }

function createItemBody(definition,x){ const body=Bodies.fromVertices(x,58,[definition.vertices.map(v=>({x:v.x,y:v.y}))],{label:"player-item",restitution:definition.restitution,friction:definition.friction,frictionAir:.003,density:definition.density,sleepThreshold:90,plugin:{pachinkrawler:{instanceId:gameState.nextItemId,itemId:definition.id,resolved:false}},render:{visible:false}},true); body.label="player-item"; for(const part of body.parts){ part.render.visible=false; part.label="player-item-part"; } return body; }
function getRootBody(body){ return body?.parent && body.parent !== body ? body.parent : body; }

function dropItem(x){
  if(gameState.turn!=="player"||gameState.combatOver) return addLog("Ahora no puedes lanzar objetos.");
  if((gameState.pool[gameState.selectedItemId]||0)<=0) return addLog("No quedan unidades de ese objeto en este turno.");
  const definition=itemDefinitions.get(gameState.selectedItemId); if(!definition)return;
  const item=createItemBody(definition,clamp(x,40,CONFIG.boardWidth-40)); gameState.nextItemId++;
  gameState.pool[definition.id]--; Body.setAngle(item,randomBetween(-.12,.12)); Body.setVelocity(item,{x:randomBetween(-.25,.25),y:0});
  gameState.activeItems.add(item); Composite.add(engine.world,item); chooseAvailableSelection(); updateUi();
}

function resolveItem(item,result){ const root=getRootBody(item),data=root.plugin?.pachinkrawler; if(!data||data.resolved)return; data.resolved=true; const definition=itemDefinitions.get(data.itemId); if(result==="activation")activateEffect(definition); else addLog(`${definition.name} cayó al vacío y no se activó.`); removeItem(root); checkTurnReady(); }
function activateEffect(definition){ const effect=definition.effect||{type:"damage",value:1}; if(effect.type==="damage"){ gameState.enemyHp=Math.max(0,gameState.enemyHp-effect.value); addLog(`${definition.name} se activó: ${effect.value} de daño.`); } else if(effect.type==="armor"){ gameState.playerArmor+=effect.value; addLog(`${definition.name} se activó: +${effect.value} de armadura.`); } else if(effect.type==="heal"){ const before=gameState.playerHealth; gameState.playerHealth=Math.min(gameState.maxHealth,gameState.playerHealth+effect.value); addLog(`${definition.name} se activó: +${gameState.playerHealth-before} de vida.`); } if(gameState.enemyHp<=0){gameState.combatOver=true;gameState.turn="ended";addLog("¡Enemigo derrotado!");} updateUi(); }

Events.on(engine,"collisionStart",event=>{ for(const pair of event.pairs){ const candidates=[pair.bodyA,pair.bodyB]; const part=candidates.find(body=>body.label==="player-item"||body.label==="player-item-part"); if(!part)continue; const item=getRootBody(part); const target=candidates.find(body=>body!==part); if(target?.label==="activation-slot")resolveItem(item,"activation"); else if(target?.label==="void-slot")resolveItem(item,"void"); }});
Events.on(engine,"afterUpdate",()=>{ for(const item of [...gameState.activeItems]) if(item.position.y>CONFIG.boardHeight+140||item.position.x<-180||item.position.x>CONFIG.boardWidth+180) resolveItem(item,"void"); });

function endPlayerTurn(){ if(gameState.turn!=="player"||gameState.combatOver)return; if(gameState.activeItems.size>0)return addLog("Espera a que terminen de caer los objetos activos."); gameState.turn="enemy"; updateUi(); addLog("Turno enemigo…"); window.setTimeout(enemyTurn,450); }
function enemyTurn(){ if(gameState.combatOver)return; let damage=CONFIG.enemyAttack; const blocked=Math.min(gameState.playerArmor,damage); gameState.playerArmor-=blocked; damage-=blocked; gameState.playerHealth=Math.max(0,gameState.playerHealth-damage); addLog(`El enemigo ataca por ${CONFIG.enemyAttack}: ${blocked} bloqueado, ${damage} de daño.`); if(gameState.playerHealth<=0){gameState.combatOver=true;gameState.turn="ended";addLog("Has sido derrotado.");} else {gameState.pool={...basePool};gameState.turn="player";chooseAvailableSelection();} updateUi(); }
function checkTurnReady(){ if(gameState.turn==="player"&&gameState.activeItems.size===0&&remainingPool()===0) addLog("No quedan objetos. Pasa el turno para recibir el ataque enemigo."); }

function selectItem(id){ if(!itemDefinitions.has(id)||(gameState.pool[id]||0)<=0)return; gameState.selectedItemId=id; closeBackpackModal(); updateUi(); }
function chooseAvailableSelection(){ if((gameState.pool[gameState.selectedItemId]||0)>0)return; const next=Object.keys(gameState.pool).find(id=>gameState.pool[id]>0); if(next)gameState.selectedItemId=next; }
function remainingPool(){ return Object.values(gameState.pool).reduce((sum,n)=>sum+n,0); }
function openBackpack(){ renderInventory(); backpackModal.hidden=false; }
function closeBackpackModal(){ backpackModal.hidden=true; }
function renderInventory(){ inventoryList.innerHTML=""; for(const [id,definition] of itemDefinitions){ const count=gameState.pool[id]||0; const button=document.createElement("button"); button.type="button"; button.className=`inventory-item${id===gameState.selectedItemId?" is-selected":""}`; button.disabled=count<=0||gameState.turn!=="player"; button.innerHTML=`<img src="${definition.sprite}" alt=""><span><strong>${definition.name}</strong><small>${effectText(definition)}</small></span><strong>x${count}</strong>`; button.addEventListener("click",()=>selectItem(id)); inventoryList.append(button); } }
function effectText(def){ const e=def.effect; return e.type==="damage"?`${e.value} daño`:e.type==="armor"?`${e.value} armadura`:`${e.value} vida`; }

function shakeMachine(){ if(!gameState.shakeReady||gameState.activeItems.size===0)return; gameState.shakeReady=false; updateUi(); for(const item of gameState.activeItems){Sleeping.set(item,false);Body.applyForce(item,item.position,{x:randomBetween(-.012,.012)*item.mass,y:randomBetween(-.006,-.002)*item.mass});Body.setAngularVelocity(item,item.angularVelocity+randomBetween(-.08,.08));} setTimeout(()=>{gameState.shakeReady=true;updateUi();},CONFIG.shakeCooldownMs); }
function removeItem(item){ Composite.remove(engine.world,item);gameState.activeItems.delete(item);updateUi(); }
function resetItems(){ for(const item of [...gameState.activeItems])removeItem(item);gameState.nextItemId=1; }
function fullReset(){ resetItems(); gameState.enemyHp=30;gameState.playerArmor=0;gameState.playerHealth=20;gameState.pool={...basePool};gameState.turn="player";gameState.combatOver=false;gameState.selectedItemId="sword_test";createBoard();addLog("Nuevo combate: el tablero se ha generado automáticamente.");updateUi(); }

render.canvas.addEventListener("pointerdown",event=>{ const bounds=render.canvas.getBoundingClientRect(),x=(event.clientX-bounds.left)*(CONFIG.boardWidth/bounds.width),y=(event.clientY-bounds.top)*(CONFIG.boardHeight/bounds.height); if(y<=CONFIG.launchAreaHeight)dropItem(x); else setStatus("Haz clic dentro de la franja superior."); });
Events.on(render,"afterRender",()=>{const ctx=render.context;ctx.save();drawLaunchArea(ctx);drawBottomSlots(ctx);drawItemSprites(ctx);if(gameState.debugHitboxes)drawHitboxes(ctx);ctx.restore();});
function drawLaunchArea(ctx){ctx.fillStyle=CONFIG.colors.launchArea;ctx.globalAlpha=.72;ctx.fillRect(0,0,CONFIG.boardWidth,CONFIG.launchAreaHeight);ctx.globalAlpha=1;ctx.strokeStyle=CONFIG.colors.launchLine;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,CONFIG.launchAreaHeight);ctx.lineTo(CONFIG.boardWidth,CONFIG.launchAreaHeight);ctx.stroke();ctx.fillStyle="#f4f4f8";ctx.font="600 18px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(gameState.turn==="player"?"HAZ CLIC AQUÍ PARA SOLTAR UN OBJETO":"TURNO ENEMIGO",CONFIG.boardWidth/2,CONFIG.launchAreaHeight/2);}
function drawBottomSlots(ctx){ctx.font="700 15px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";for(const slot of gameState.slots){if(slot.type==="activation"){ctx.fillStyle=CONFIG.colors.activation;ctx.fillRect(slot.x+4,CONFIG.bottomZoneTop,slot.width-8,110);ctx.fillStyle="#f4fff9";ctx.fillText("ACTIVAR",slot.x+slot.width/2,845);}else if(slot.type==="void"){ctx.fillStyle=CONFIG.colors.void;ctx.fillRect(slot.x+4,CONFIG.bottomZoneTop,slot.width-8,110);ctx.strokeStyle="#555568";ctx.setLineDash([8,8]);ctx.strokeRect(slot.x+8,CONFIG.bottomZoneTop+4,slot.width-16,100);ctx.setLineDash([]);ctx.fillStyle="#a5a5b7";ctx.fillText("VACÍO",slot.x+slot.width/2,845);}}}
function drawItemSprites(ctx){for(const item of gameState.activeItems){const id=item.plugin?.pachinkrawler?.itemId,def=itemDefinitions.get(id),image=itemImages.get(id);if(!def||!image?.complete||!image.naturalWidth)continue;const w=image.naturalWidth*def.scale,h=image.naturalHeight*def.scale;ctx.save();ctx.translate(item.position.x,item.position.y);ctx.rotate(item.angle);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();}}
function drawHitboxes(ctx){ctx.strokeStyle="#ff4d6d";ctx.fillStyle="rgba(255,77,109,.13)";ctx.lineWidth=2;for(const item of gameState.activeItems){const parts=item.parts.length>1?item.parts.slice(1):item.parts;for(const part of parts){ctx.beginPath();part.vertices.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fill();ctx.stroke();}}}

function updateUi(){ const def=itemDefinitions.get(gameState.selectedItemId); enemyHpElement.textContent=`${gameState.enemyHp}/${gameState.enemyMaxHp}`;armorElement.textContent=gameState.playerArmor;healthElement.textContent=`${gameState.playerHealth}/${gameState.maxHealth}`;poolCountElement.textContent=remainingPool();selectedNameElement.textContent=def?.name||"—";if(def)selectedImageElement.src=def.sprite;turnLabelElement.textContent=gameState.combatOver?"Combate terminado":gameState.turn==="player"?"Turno del jugador":"Turno del enemigo"; passButton.disabled=gameState.turn!=="player"||gameState.activeItems.size>0||gameState.combatOver;backpackButton.disabled=gameState.turn!=="player"||gameState.combatOver;shakeButton.disabled=!gameState.shakeReady||gameState.activeItems.size===0;setStatus(`Objetos activos: ${gameState.activeItems.size} · Pool: ${remainingPool()}`);if(!backpackModal.hidden)renderInventory(); }
function addLog(message){logElement.textContent=message;} function setStatus(message){statusElement.textContent=message;} function toggleDebug(){gameState.debugHitboxes=!gameState.debugHitboxes;debugButton.textContent=`Hitboxes: ${gameState.debugHitboxes?"ON":"OFF"}`;} function clamp(v,min,max){return Math.min(Math.max(v,min),max);} function randomBetween(min,max){return Math.random()*(max-min)+min;} function shuffle(values){const r=[...values];for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}

resetButton.addEventListener("click",fullReset);shakeButton.addEventListener("click",shakeMachine);debugButton.addEventListener("click",toggleDebug);passButton.addEventListener("click",endPlayerTurn);backpackButton.addEventListener("click",openBackpack);closeBackpack.addEventListener("click",closeBackpackModal);backpackModal.addEventListener("click",e=>{if(e.target===backpackModal)closeBackpackModal();});
createBoard();updateUi();
