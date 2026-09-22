(() => {
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const KEY='odd-earth-sensorium-v02', REAL=window.OE_REAL_DATA||{heart:[],lung:[],echo:{}};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), pick=a=>a[Math.floor(Math.random()*a.length)];
  const modules={
    heart:{title:'Hear physiology',choices:['Normal','Murmur'],prompt:'Is this recording normal, or is a murmur present?'},
    lung:{title:'Resolve breath',choices:['Normal','Wheeze','Crackles'],prompt:'Classify the dominant respiratory sound.'},
    echo:{title:'See with sound',choices:['Left','Right'],prompt:'Which side contains the nearer boundary?'},
    pulse:{title:'Feel hemodynamics',choices:['A','B'],prompt:'Which waveform represents the stiffer arterial system?'}
  };
  const fresh=()=>({createdAt:new Date().toISOString(),modules:Object.fromEntries(Object.keys(modules).map(k=>[k,{difficulty:.2,sessions:[]}]))});
  let state; try{state=JSON.parse(localStorage.getItem(KEY))||fresh()}catch{state=fresh()}
  let session=null,media=null,audioCtx=null,serialPort=null;
  const audioCache=new Map(), htmlAudioCache=new Map();
  const dialog=$('#trainerDialog'),stage=$('#trainerStage'),feedback=$('#feedback'),actions=$('#trainerActions');

  const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));renderProfile()};
  const ctx=()=>audioCtx||(audioCtx=new (window.AudioContext||window.webkitAudioContext)());
  const stop=()=>{if(media){try{if(typeof media.stop==='function')media.stop();else if(typeof media.pause==='function'){media.pause();media.currentTime=0}}catch{}media=null}};

  function primeHtmlAudio(item){
    const url=item.localUrl||item.url;
    if(!url)return null;
    if(htmlAudioCache.has(url))return htmlAudioCache.get(url);
    const a=new Audio();a.preload='auto';a.src=url;a.load();htmlAudioCache.set(url,a);return a;
  }

  async function preloadAudio(item){
    const url=item.localUrl||item.url;
    if(!url)return null;
    if(audioCache.has(url))return audioCache.get(url);
    const job=(async()=>{
      try{
        const res=await fetch(url,{mode:'cors',cache:'force-cache'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const arr=await res.arrayBuffer();
        return await ctx().decodeAudioData(arr.slice(0));
      }catch(err){
        console.warn('Audio predecode failed; browser audio fallback will be used:',url,err);
        primeHtmlAudio(item);
        return null;
      }
    })();
    audioCache.set(url,job);
    return job;
  }

  async function warmModule(module,mode){
    if(module!=='heart'&&module!=='lung')return;
    const split=mode==='eval'?'eval':'train';
    const pool=(REAL[module]||[]).filter(x=>x.split===split);
    pool.forEach(primeHtmlAudio);
    await Promise.allSettled(pool.map(preloadAudio));
  }

  function choose(module,label){
    const split=session.mode==='eval'?'eval':'train';
    const pool=(REAL[module]||[]).filter(x=>x.label===label&&x.split===split);
    if(!pool.length)return null;
    const unused=pool.filter(x=>!session.used.has(x.id)), chosen=pick(unused.length?unused:pool);
    session.used.add(chosen.id); return chosen;
  }
  async function remote(item){
    stop();
    const start=+item.start||0,end=item.end==null?null:+item.end;
    const buffer=await preloadAudio(item);
    if(buffer){
      const c=ctx(),source=c.createBufferSource(),gain=c.createGain();
      source.buffer=buffer;gain.gain.value=.95;source.connect(gain).connect(c.destination);
      media=source;
      const duration=end==null?Math.max(.05,buffer.duration-start):Math.max(.05,end-start);
      try{source.start(0,start,Math.min(duration,Math.max(.05,buffer.duration-start)))}catch{fallback()}
      source.onended=()=>{if(media===source)media=null};
      return;
    }
    const a=primeHtmlAudio(item);media=a;
    const go=()=>{try{a.currentTime=start}catch{};const p=a.play();if(p?.catch)p.catch(()=>fallback());if(end!=null)setTimeout(()=>{if(media===a)a.pause()},Math.max(200,(end-start)*1000))};
    a.onerror=()=>fallback();
    if(a.readyState>=1)go();else a.onloadedmetadata=go;
  }
  function tone(f,t,d=.08,g=.12){const c=ctx(),o=c.createOscillator(),v=c.createGain();o.frequency.value=f;v.gain.setValueAtTime(g,c.currentTime+t);v.gain.exponentialRampToValueAtTime(.0001,c.currentTime+t+d);o.connect(v).connect(c.destination);o.start(c.currentTime+t);o.stop(c.currentTime+t+d+.02)}
  function fallback(){
    if(session.module==='heart'){for(let i=0;i<4;i++){tone(60,i*.8);tone(85,i*.8+.28,.07,.08);if(session.current.correct==='Murmur')tone(180,i*.8+.12,.2,.035)}}
    if(session.module==='lung'){const lab=session.current.correct;if(lab==='Wheeze')for(let i=0;i<5;i++)tone(420,i*.55,.35,.035);else if(lab==='Crackles')for(let i=0;i<8;i++)tone(900,i*.38,.025,.045);else for(let i=0;i<5;i++)tone(220,i*.6,.25,.02)}
  }
  function playEcho(side,d){
    const c=ctx(),now=c.currentTime+.05,base=.07,delta=.06*(1-d*.8);
    const ping=(pan,delay,gain)=>{const o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.frequency.value=2400;g.gain.setValueAtTime(gain,now+delay);g.gain.exponentialRampToValueAtTime(.0001,now+delay+.025);p.pan.value=pan;o.connect(g).connect(p).connect(c.destination);o.start(now+delay);o.stop(now+delay+.03)};
    ping(0,0,.12); ping(-.9,side==='Left'?base:base+delta,.08); ping(.9,side==='Right'?base:base+delta,.08);
  }
  function wave(stiff,n=240){const a=[];for(let i=0;i<n;i++){const x=i/(n-1),rise=Math.exp(-Math.pow((x-(.17-.07*stiff))/(.09-.025*stiff),2)),refl=(.2+.45*stiff)*Math.exp(-Math.pow((x-(.46-.12*stiff))/.11,2));a.push(rise+refl)}const m=Math.max(...a);return a.map(v=>v/m)}
  function drawWave(canvas,stiff){const g=canvas.getContext('2d'),v=wave(stiff),w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);g.strokeStyle='#9df7d1';g.lineWidth=3;g.beginPath();v.forEach((y,i)=>{const x=i*w/(v.length-1),yy=h-15-y*(h-30);i?g.lineTo(x,yy):g.moveTo(x,yy)});g.stroke()}

  async function start(module,mode='train'){
    session={module,mode,total:10,i:0,trials:[],difficulty:state.modules[module].difficulty,used:new Set(),answered:false};
    $('#trainerEyebrow').textContent=(module.toUpperCase()+' // '+(mode==='eval'?'BLIND BENCHMARK':'TRAINING'));
    $('#trainerTitle').textContent=modules[module].title; $('#confidenceBlock').style.display='block';dialog.showModal();
    if(module==='heart'||module==='lung'){
      try{await ctx().resume()}catch{}
      stage.innerHTML='<div class="task-instruction"><p class="eyebrow">PREPARING SESSION</p><h3>Loading recordings into memory…</h3><p>One short preload now removes the pause between trials.</p></div>';
      actions.innerHTML='';feedback.textContent='';
      await warmModule(module,mode);
    }
    next();
  }
  function next(){
    stop();session.answered=false;feedback.textContent='';feedback.className='feedback';actions.innerHTML='';$('#confidence').value=3;$('#confidenceValue').textContent='3 / 5';
    $('#trialLabel').textContent=`Trial ${session.i+1} / ${session.total}`;$('#trialProgress').style.width=`${(session.i+1)/session.total*100}%`;$('#difficultyLabel').textContent=`Difficulty ${Math.round(session.difficulty*100)}`;
    const m=modules[session.module],correct=pick(m.choices); let sample=null,dataMode='procedural';
    if(session.module==='heart'||session.module==='lung'){sample=choose(session.module,correct);if(sample)dataMode='real'}
    if(session.module==='echo')dataMode='hybrid';
    session.current={correct,sample,dataMode,difficulty:session.difficulty,playedAt:null};
    renderTrial();
  }
  function renderTrial(){
    const m=modules[session.module],t=session.current;
    const answers=m.choices.map((x,i)=>`<button class="answer-btn" data-a="${x}">${i+1}. ${x}</button>`).join('');
    if(session.module==='pulse'){
      const a=Math.random()*.45+.1,b=Math.random()*.45+.45,tough=a>b?'A':'B';t.correct=tough;t.a=a;t.b=b;
      stage.innerHTML=`<div class="task-instruction"><h3>${m.prompt}</h3><p>Visual proxy now; Web Serial can drive OE Pulse hardware.</p><div class="wave-pair"><div class="wave-card"><strong>A</strong><canvas id="wa" width="320" height="150"></canvas></div><div class="wave-card"><strong>B</strong><canvas id="wb" width="320" height="150"></canvas></div></div><div class="answer-grid">${answers}</div><div class="hardware-box"><button class="button ghost" id="serialBtn">${serialPort?'Hardware connected':'Connect pulse hardware'}</button> <button class="button ghost" id="sendBtn" ${serialPort?'':'disabled'}>Send A/B</button></div></div>`;
      drawWave($('#wa'),a);drawWave($('#wb'),b);$('#serialBtn').onclick=connectSerial;$('#sendBtn').onclick=sendPulse;
    }else{
      stage.innerHTML=`<div class="task-instruction"><h3>${m.prompt}</h3><p class="data-mode">${t.dataMode==='real'?'● REAL RESEARCH RECORDING':t.dataMode==='hybrid'?'◐ REAL-WORLD ACOUSTIC TASK':'○ PROCEDURAL FALLBACK'}</p><button class="play-btn" id="playStimulus">▶</button><div class="answer-grid ${m.choices.length===3?'three':''}">${answers}</div></div>`;
      $('#playStimulus').onclick=async()=>{if(!t.playedAt)t.playedAt=performance.now();if(t.sample)await remote(t.sample);else if(session.module==='echo')playEcho(t.correct,t.difficulty);else fallback()};
    }
    $$('.answer-btn',stage).forEach(b=>b.onclick=()=>answer(b.dataset.a));
  }
  function answer(a){
    if(session.answered)return;session.answered=true;const t=session.current,ok=a===t.correct,conf=+$('#confidence').value,rt=t.playedAt?performance.now()-t.playedAt:null;
    session.trials.push({answer:a,correctAnswer:t.correct,correct:ok,confidence:conf,rtMs:rt,difficulty:t.difficulty,dataMode:t.dataMode,sampleId:t.sample?.id||null,subject:t.sample?.subject||null,ts:new Date().toISOString()});
    if(session.mode!=='eval')session.difficulty=clamp(session.difficulty+(ok?.055:-.085),.02,.96);
    $$('.answer-btn',stage).forEach(x=>x.disabled=true);
    feedback.textContent=session.mode==='eval'?'Response recorded. Ground truth remains hidden.':ok?'Correct.':'Not this time — correct answer: '+t.correct;
    feedback.className='feedback '+(session.mode==='eval'?'':ok?'correct':'incorrect');
    const n=document.createElement('button');n.className='button primary';n.textContent=session.i+1>=session.total?'Finish session':'Next trial';n.onclick=()=>{session.i++;session.i>=session.total?finish():next()};actions.appendChild(n);
  }
  function finish(){
    const tr=session.trials,n=tr.length,acc=tr.filter(x=>x.correct).length/n,rts=tr.filter(x=>x.rtMs).map(x=>x.rtMs),rt=rts.length?rts.reduce((a,b)=>a+b,0)/rts.length:null;
    const cal=1-tr.reduce((s,x)=>s+Math.abs((x.confidence-1)/4-(x.correct?1:0)),0)/n;
    state.modules[session.module].sessions.push({date:new Date().toISOString(),mode:session.mode,accuracy:acc,meanRtMs:rt,confidenceCalibration:cal,endDifficulty:session.difficulty,trials:tr});
    if(session.mode!=='eval')state.modules[session.module].difficulty=session.difficulty;save();$('#confidenceBlock').style.display='none';actions.innerHTML='';
    stage.innerHTML=`<div class="session-summary"><p class="eyebrow">SESSION COMPLETE</p><h3>${modules[session.module].title}</h3><div class="summary-grid"><div><span>${Math.round(acc*100)}%</span><small>accuracy</small></div><div><span>${rt?(rt/1000).toFixed(1)+'s':'—'}</span><small>response</small></div><div><span>${Math.round(cal*100)}%</span><small>calibration</small></div><div><span>${Math.round(session.difficulty*100)}</span><small>difficulty</small></div></div><button class="button primary" id="again">Train again</button> <button class="button ghost" id="done">Profile</button></div>`;
    $('#again').onclick=()=>start(session.module,session.mode);$('#done').onclick=()=>{dialog.close();location.hash='#profile'};
  }

  async function connectSerial(){if(!('serial'in navigator)){feedback.textContent='Use desktop Chrome/Edge for Web Serial.';return}try{serialPort=await navigator.serial.requestPort();await serialPort.open({baudRate:115200});renderTrial()}catch(e){feedback.textContent=e.message}}
  async function sendPulse(){if(!serialPort)return;const w=serialPort.writable.getWriter(),msg=JSON.stringify({cmd:'PULSE_PAIR',a:{stiffness:session.current.a,bpm:72},b:{stiffness:session.current.b,bpm:72},duration_ms:7000})+'\n';await w.write(new TextEncoder().encode(msg));w.releaseLock()}

  function score(k){const s=state.modules[k].sessions;if(!s.length)return 0;const r=s.slice(-5),acc=r.reduce((a,x)=>a+x.accuracy,0)/r.length,d=r.reduce((a,x)=>a+x.endDifficulty,0)/r.length,c=r.reduce((a,x)=>a+x.confidenceCalibration,0)/r.length;return clamp((acc*.55+d*.3+c*.15)*100,0,100)}
  function renderProfile(){
    const labels={heart:'Heart',lung:'Lungs',echo:'Echo',pulse:'Pulse'},keys=Object.keys(labels);
    $('#profileStats').innerHTML=keys.map(k=>{const sc=score(k),n=state.modules[k].sessions.length;return `<div class="stat-row"><div class="stat-top"><strong>${labels[k]}</strong><span>${Math.round(sc)}</span></div><div class="bar"><i style="width:${sc}%"></i></div><div class="stat-meta"><span>${n} sessions</span><span>${n?'tracked':'untrained'}</span></div></div>`}).join('');
    const c=$('#profileCanvas'),g=c.getContext('2d'),w=c.width,h=c.height,cx=w/2,cy=h/2,R=145,vals=keys.map(score).map(x=>x/100),ang=i=>-Math.PI/2+i*Math.PI*2/4;g.clearRect(0,0,w,h);g.strokeStyle='rgba(157,247,209,.18)';
    for(let r=1;r<=4;r++){g.beginPath();for(let i=0;i<4;i++){let a=ang(i),x=cx+Math.cos(a)*R*r/4,y=cy+Math.sin(a)*R*r/4;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.stroke()}
    g.beginPath();vals.forEach((v,i)=>{let a=ang(i),x=cx+Math.cos(a)*R*v,y=cy+Math.sin(a)*R*v;i?g.lineTo(x,y):g.moveTo(x,y)});g.closePath();g.fillStyle='rgba(157,247,209,.15)';g.fill();g.strokeStyle='#9df7d1';g.stroke();
    g.fillStyle='#dfe9e4';g.font='600 14px system-ui';g.textAlign='center';['HEART','LUNGS','ECHO','PULSE'].forEach((x,i)=>{let a=ang(i);g.fillText(x,cx+Math.cos(a)*(R+40),cy+Math.sin(a)*(R+40)+5)});
  }
  function renderDatasets(){
    const ds=[['Heart','CirCor DigiScope','PhysioNet','Real curated phonocardiograms'],['Lungs','SPRSound','GitHub','Real event-labelled respiratory sounds'],['Echo','VisualEchoes','GitHub','Echolocation source/curriculum foundation'],['Pulse','PWDB','Zenodo','Arterial waveform ingestion foundation']];
    $('#datasetGrid').innerHTML=ds.map(x=>`<article class="dataset-card"><p class="eyebrow">${x[0]} // ${x[2]}</p><h3>${x[1]}</h3><p>${x[3]}</p></article>`).join('');
  }
  $$('.module-start').forEach(b=>b.onclick=()=>start(b.dataset.module,'train'));$$('.module-eval').forEach(b=>b.onclick=()=>start(b.dataset.module,'eval'));
  $('#closeTrainer').onclick=()=>{stop();dialog.close()};$('#confidence').oninput=e=>$('#confidenceValue').textContent=e.target.value+' / 5';
  $('#exportBtn').onclick=()=>{const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='odd-earth-human-instrument-profile.json';a.click()};
  $('#resetDataBtn').onclick=()=>{if(confirm('Reset all locally stored Sensorium data?')){state=fresh();save()}};
  renderDatasets();renderProfile();
})();