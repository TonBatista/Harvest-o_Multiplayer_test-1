// Autoridade única: só o dono executa operações e altera os recursos da fazenda.
import {CROPS,TOOLS,useTool,pick,ship,buy,validSave} from './simulation.js';
export const PROTOCOL='harvestao-coop-1';
export const clone=value=>JSON.parse(JSON.stringify(value));
export function validPosition(p){
  return !!p && [p.x,p.z,p.angle].every(Number.isFinite) &&
    p.x>=-10 && p.x<=14 && p.z>=-13 && p.z<=13 && Math.abs(p.angle)<=Math.PI*4;
}
const hasCrop=id=>typeof id==='string' && Object.hasOwn(CROPS,id);
export function validSnapshot(s){
  if(!validSave(s)||!validPosition(s.player)||!TOOLS.includes(s.tool)||!hasCrop(s.seed))return false;
  if(![s.held,s.coopGuestHeld??null].every(v=>v===null||hasCrop(v)))return false;
  for(const key of ['money','shipping','earned','lumber'])if(!Number.isSafeInteger(s[key])||s[key]<0)return false;
  for(const key of ['stamina','fatigue','water'])if(!Number.isFinite(s[key])||s[key]<0||s[key]>100)return false;
  if(!Number.isInteger(s.day)||s.day<1||s.day>30||!Number.isInteger(s.season)||s.season<0||s.season>3||!Number.isSafeInteger(s.year)||s.year<1)return false;
  if(!Number.isFinite(s.minutes)||s.minutes<360||s.minutes>1560||!['sun','rain'].includes(s.weather))return false;
  if(!s.bags||typeof s.bags!=='object'||Array.isArray(s.bags)||!Object.entries(s.bags).every(([k,v])=>hasCrop(k)&&Number.isSafeInteger(v)&&v>=0))return false;
  const coords=new Set();
  for(const p of s.plots){
    if(!p||!Number.isInteger(p.x)||p.x<0||p.x>=12||!Number.isInteger(p.z)||p.z<0||p.z>=12)return false;
    const key=p.x+','+p.z;if(coords.has(key))return false;coords.add(key);
    if(typeof p.tilled!=='boolean'||typeof p.wet!=='boolean'||![null,'weed','stone','branch'].includes(p.obstacle))return false;
    if(p.crop!==null&&!hasCrop(p.crop))return false;
    if(!Number.isInteger(p.age)||p.age<0||p.age>(p.crop?CROPS[p.crop].days:0))return false;
  }
  return true;
}
const deny=message=>({message});
export function executeAction(state,action,guest=false){
  if(!action||!['use','pick','ship','refill','buy'].includes(action.kind))return deny('Ação inválida.');
  if(!validPosition(action.player)||!TOOLS.includes(action.tool)||!hasCrop(action.seed))return deny('Posição ou ferramenta inválida.');
  const local={player:state.player,tool:state.tool,seed:state.seed,held:state.held};
  state.player={...action.player};state.tool=action.tool;state.seed=action.seed;
  if(guest)state.held=state.coopGuestHeld??null;
  let result;
  try{
    const near=(x,z,r)=>Math.hypot(state.player.x-x,state.player.z-z)<r;
    switch(action.kind){
      case 'use':result=useTool(state);break;
      case 'pick':result=pick(state);break;
      case 'ship':result=near(5.2,-5.3,1.4)?ship(state):deny('Chegue perto da caixa de vendas.');break;
      case 'refill':
        if(!near(11.6,.4,1.6)){result=deny('Chegue perto do poço.');break;}
        state.water=100;result={changed:true,message:'Regador compartilhado reabastecido.'};break;
      case 'buy':result=hasCrop(action.crop)?buy(state,action.crop):deny('Semente inválida.');break;
    }
  }finally{
    if(guest){state.coopGuestHeld=state.held;state.held=local.held;}
    state.player=local.player;state.tool=local.tool;state.seed=local.seed;
  }
  return result;
}
export function createAuthority(state){
  state.coopGuestHeld??=null;
  let revision=0;
  return {
    get revision(){return revision;},
    touch(){revision++;},
    local(action){const r=executeAction(state,action);if(r.changed)revision++;return r;},
    snapshot(){return {revision,state:clone(state)};},
    connection(token){
      let lastSeq=0,lastResult=null;
      return {
        receive(packet){
          if(packet?.protocol!==PROTOCOL||packet.token!==token)return null;
          if(!Number.isSafeInteger(packet.seq)||packet.seq<1)return null;
          // A sequência nunca recua. Reenvios não executam a operação de novo.
          if(packet.seq<=lastSeq)return this.snapshot();
          if(packet.seq!==lastSeq+1)return null;
          lastSeq=packet.seq;
          if(packet.revision!==revision)lastResult=deny('A fazenda mudou. Confira o canteiro e tente novamente.');
          else {lastResult=executeAction(state,packet.action,true);if(lastResult.changed)revision++;}
          return this.snapshot();
        },
        snapshot(){return {type:'state',protocol:PROTOCOL,token,revision,ack:lastSeq,result:lastResult,state:clone(state)};}
      };
    }
  };
}
export function applyGuestSnapshot(state,snapshot){
  if(!validSnapshot(snapshot))return false;
  const local={player:state.player,tool:state.tool,seed:state.seed};
  Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,clone(snapshot),local);
  state.held=snapshot.coopGuestHeld??null;
  return true;
}

