import {PROTOCOL,validPosition} from './cooperative.js';

// Dois jogadores, um dono. O visitante nunca envia um estado de fazenda.
export function mountMultiplayer(api){
  const panel=document.createElement('details');
  panel.id='cooperativePanel';panel.open=true;
  panel.innerHTML=`<summary>🌾 Cooperativo · teste 1</summary><p id="mpStatus" role="status">Sua fazenda de teste · offline</p><div class="mp-buttons"><button id="mpHost">Criar sala</button><button id="mpLeave" disabled>Sair</button></div><label for="mpCode">Código da sala</label><input id="mpCode" maxlength="16" placeholder="HVABC123" autocomplete="off" autocapitalize="characters"><button id="mpJoin">Entrar</button><small>2 jogadores. Dinheiro, sementes, energia e água compartilhados. Só o dono salva a fazenda.</small>`;
  document.body.append(panel);
  const $=id=>panel.querySelector('#'+id),status=s=>$('mpStatus').textContent=s;
  let role='solo',peer=null,conn=null,remote=null,channel=null,token=null;
  let revision=-1,seq=0,pending=null,ready=false,epoch=0,lastSeen=0,openedAt=0,lastPublish=0,lastRequest=0;
  const world=api.world;
  function controls(){
    $('mpHost').disabled=$('mpJoin').disabled=role!=='solo';$('mpLeave').disabled=role==='solo';
    $('mpCode').disabled=role!=='solo';api.modeChanged(role);
  }
  function removeRemote(){if(remote){world.scene.remove(remote);remote=null;}}
  function showRemote(pos){
    if(!validPosition(pos))return;
    if(!remote){remote=world.farmer.clone(true);world.scene.add(remote);}
    remote.position.set(pos.x,0,pos.z);remote.rotation.y=pos.angle;
  }
  function send(data){
    if(!conn?.open)return false;
    try{conn.send(data);return true;}catch{return false;}
  }
  function publish(){if(role==='host'&&channel&&conn?.open)send(channel.snapshot());}
  function disconnected(message){
    ready=false;removeRemote();const old=conn;conn=null;channel=null;
    if(old)try{old.close();}catch{}
    if(role==='guest')status(message+' · Sair restaura sua fazenda. Entre de novo para sincronizar.');
    else if(role==='host')status(message+' · sala '+$('mpCode').value+' aberta para reconexão.');
  }
  function leave(){
    epoch++;ready=false;const wasGuest=role==='guest';role='solo';
    const c=conn,p=peer;conn=null;peer=null;channel=null;token=null;pending=null;revision=-1;seq=0;
    try{c?.close();}catch{}try{p?.destroy();}catch{}removeRemote();
    if(wasGuest)api.endVisit();else api.save();
    controls();status('Sua fazenda de teste · offline');
  }
  function bind(c,isHost,myEpoch){
    if(myEpoch!==epoch||conn){c.close();return;}
    conn=c;openedAt=lastSeen=Date.now();lastRequest=0;
    if(isHost){token=crypto.randomUUID();channel=api.authority.connection(token);}
    c.on('open',()=>{
      if(conn!==c||myEpoch!==epoch)return;
      lastSeen=Date.now();
      status(isHost?'Dono · visitante conectado':'Recebendo a fazenda do dono…');
      if(isHost)publish();
      else send({type:'hello',protocol:PROTOCOL});
    });
    c.on('data',d=>{
      if(conn!==c||myEpoch!==epoch||!d||typeof d!=='object')return;
      if(d.protocol!==PROTOCOL){disconnected('Versões diferentes. Atualizem os dois aparelhos');return;}
      if(d.type==='pos'){
        if(!validPosition(d.pos))return;
        lastSeen=Date.now();showRemote(d.pos);return;
      }
      if(isHost){
        if(d.type==='hello'){lastSeen=Date.now();publish();return;}
        if(d.type!=='action')return;
        lastSeen=Date.now();
        const before=api.authority.revision;
        const reply=channel.receive(d);
        if(reply){if(api.authority.revision!==before)api.remoteChanged();send(reply);}
        return;
      }
      if(d.type!=='state'||typeof d.token!=='string'||d.token.length>80)return;
      if(token&&d.token!==token)return;
      if(!Number.isSafeInteger(d.revision)||d.revision<revision||!Number.isSafeInteger(d.ack)||d.ack<0||d.ack>seq)return;
      if(!api.applySnapshot(d.state))return;
      token=d.token;revision=d.revision;lastSeen=Date.now();ready=true;
      status('Visitante · conectado à fazenda do dono');
      if(pending&&d.ack>=pending.seq){
        pending=null;
        if(d.result&&typeof d.result.message==='string')api.notify(d.result.message.slice(0,220));
        if(d.result?.changed)world.act();
      }
    });
    c.on('close',()=>{if(conn===c&&myEpoch===epoch)disconnected('Conexão encerrada');});
    c.on('error',()=>{if(conn===c&&myEpoch===epoch)disconnected('Falha na conexão');});
  }
  function start(isHost){
    if(role!=='solo')return;
    const code=isHost?'HV'+crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase():$('mpCode').value.trim().toUpperCase();
    if(!/^HV[A-Z0-9]{6}$/.test(code)){status('Digite HV e os 6 caracteres do código.');return;}
    if(typeof window.Peer!=='function'){status('PeerJS não carregou. Confira a internet e recarregue a página.');return;}
    role=isHost?'host':'guest';if(!isHost)api.beginVisit();else api.save();
    controls();$('mpCode').value=code;status('Conectando…');openedAt=lastSeen=Date.now();
    const myEpoch=++epoch;
    try{
      const p=new window.Peer(isHost?code:undefined,{debug:0});peer=p;
      p.on('open',()=>{
        if(peer!==p||myEpoch!==epoch)return;
        if(isHost)status('Sala '+code+' · compartilhe o código');
        else bind(p.connect(code,{reliable:true,serialization:'json'}),false,myEpoch);
      });
      p.on('connection',c=>{if(isHost&&peer===p&&myEpoch===epoch)bind(c,true,myEpoch);else c.close();});
      p.on('error',e=>{
        if(peer!==p||myEpoch!==epoch)return;
        disconnected('Erro PeerJS: '+String(e.type||'conexão'));
        if(e.type==='unavailable-id')status('Código ocupado. Clique Sair e crie outra sala.');
        else if(isHost&&!p.open)status('Falha ao abrir sala. Clique Sair e tente novamente.');
      });
      p.on('disconnected',()=>{
        if(peer!==p||myEpoch!==epoch)return;
        status('Servidor de salas desconectado. A partida pode continuar; para nova conexão, saiam e criem outra sala.');
      });
    }catch{disconnected('Não foi possível iniciar a conexão');}
  }
  $('mpHost').onclick=()=>start(true);$('mpJoin').onclick=()=>start(false);$('mpLeave').onclick=leave;
  const timer=setInterval(()=>{
    const now=Date.now();
    if(conn?.open){
      send({type:'pos',protocol:PROTOCOL,pos:api.position()});
      if(role==='host'&&now-lastPublish>1000){lastPublish=now;publish();}
      if(role==='guest'&&pending&&now-pending.at>6000){ready=false;status('Confirmação pendente. Aguarde ou saia e entre novamente.');}
      if(now-lastSeen>10000)disconnected('Sem resposta do outro aparelho');
    }else if(conn&&now-openedAt>15000)disconnected('A conexão demorou demais');
    else if(role==='guest'&&!conn&&now-openedAt>15000)status('Sem conexão. Clique Sair e tente entrar novamente.');
  },100);
  addEventListener('pagehide',()=>{leave();});
  // Após voltar do segundo plano, apenas um estado novo libera ações do visitante.
  document.addEventListener('visibilitychange',()=>{if(role==='guest'){ready=false;}});
  controls();
  return {
    get role(){return role;},publish,
    request(action){
      if(role!=='guest')return false;
      if(!ready||!conn?.open){api.notify('Aguarde a conexão com o dono. Sair volta à sua fazenda.');return true;}
      if(pending){api.notify('Aguarde a confirmação da ação anterior.');return true;}
      const packet={type:'action',protocol:PROTOCOL,token,seq:++seq,revision,action};
      pending={seq,at:Date.now()};
      if(!send(packet)){ready=false;api.notify('Conexão interrompida. Saia e entre novamente para conferir a fazenda.');}
      return true;
    },
    destroy(){leave();clearInterval(timer);panel.remove();}
  };
}

