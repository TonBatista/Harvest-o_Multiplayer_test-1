// Harvestão — protótipo experimental: apenas posições de 2 personagens.
// Usa o servidor público padrão do PeerJS, sem garantia de disponibilidade.
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
while(!window.harvestaoMultiplayerWorld) await sleep(100);
const {scene,farmer}=window.harvestaoMultiplayerWorld;
const panel=document.createElement('div');panel.style.cssText='position:fixed;top:70px;right:8px;z-index:9999;background:#253824ee;color:white;padding:10px;border-radius:12px;font:13px sans-serif;max-width:210px;box-shadow:0 2px 10px #0005';
panel.innerHTML='<b>🌾 Multiplayer (teste)</b><p id="mpStatus">Desconectado</p><button id="mpHost">Criar sala</button><input id="mpCode" placeholder="Código da sala" maxlength="16" style="width:125px;margin-top:7px"><button id="mpJoin">Entrar</button><button id="mpLeave" style="margin-top:7px">Sair</button><small style="display:block;margin-top:7px">Teste somente de movimento. Fazendas e inventários não são compartilhados.</small>';
document.body.append(panel);
const $=id=>panel.querySelector('#'+id),status=s=>$('mpStatus').textContent=s;
let peer=null,conn=null,remote=null,interval=null;
function removeRemote(){if(remote){scene.remove(remote);remote=null}}
function clear(){clearInterval(interval);interval=null;if(conn){try{conn.close()}catch{}}conn=null;if(peer){try{peer.destroy()}catch{}}peer=null;removeRemote();status('Desconectado')}
function showRemote(pos){if(!remote){remote=farmer.clone(true);remote.traverse(o=>{if(o.isMesh){o.castShadow=true}});scene.add(remote)}if([pos.x,pos.z,pos.angle].every(Number.isFinite)){remote.position.set(pos.x,0,pos.z);remote.rotation.y=pos.angle}}
function localPos(){return {x:farmer.position.x,z:farmer.position.z,angle:farmer.rotation.y}}
function bind(c){if(conn){c.close();return}conn=c;status('Conectando…');c.on('open',()=>{status('Conectado: 2 jogadores');interval=setInterval(()=>{if(c.open)c.send({type:'pos',pos:localPos()})},100)});c.on('data',d=>{if(d?.type==='pos'&&d.pos)showRemote(d.pos)});c.on('close',()=>{conn=null;removeRemote();clearInterval(interval);status('Amigo desconectou')});c.on('error',e=>status('Erro de conexão: '+e.message))}
function makePeer(id){if(typeof Peer==='undefined'){status('Biblioteca PeerJS não carregou. Verifique internet.');return null}const p=new Peer(id,{debug:0});peer=p;p.on('error',e=>status('Erro: '+e.type));p.on('disconnected',()=>status('Servidor de conexão indisponível'));return p}
$('mpHost').onclick=()=>{clear();const code='HV'+Math.random().toString(36).slice(2,8).toUpperCase();const p=makePeer(code);if(!p)return;p.on('open',()=>{status('Sala: '+code+' — compartilhe o código');$('mpCode').value=code});p.on('connection',bind)};
$('mpJoin').onclick=()=>{const code=$('mpCode').value.trim().toUpperCase();if(!/^HV[A-Z0-9]{6}$/.test(code)){status('Digite um código válido (HV + 6 caracteres)');return}clear();const p=makePeer();if(!p)return;p.on('open',()=>bind(p.connect(code,{reliable:true})))};
$('mpLeave').onclick=clear;
window.addEventListener('pagehide',clear);
