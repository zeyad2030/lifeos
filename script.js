const KEY="lifeos_complete_v3";
const $=s=>document.querySelector(s); const $$=s=>document.querySelectorAll(s);
const clone=o=>JSON.parse(JSON.stringify(o));
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>Date.now()+"_"+Math.random().toString(16).slice(2);
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const minutes=s=>Math.floor(s/60);
const pct=(n,g)=>g>0?Math.min(100,Math.round(n/g*100)):100;

// ==========================================
// 🛡️ حماية الموقع والتحويل لموقع آخر عند فتح Inspect
// ==========================================
(function antiInspect() {
    // ضع هنا الرابط الذي تريد توجيه المستخدم إليه عند محاولة الفحص
    const redirectUrl = "https://www.google.com";

    const detectDevTool = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
            window.location.replace(redirectUrl);
        }
    };
    window.addEventListener('resize', detectDevTool);
    setInterval(detectDevTool, 1000);

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
            (e.ctrlKey && e.key.toUpperCase() === 'U')
        ) {
            e.preventDefault();
            window.location.replace(redirectUrl);
        }
    });
})();

// ==========================================
// 🛡️ نظام معالجة الرابط، فك التشفير، والتخزين
// ==========================================
function decodeToken(encodedStr) {
    try {
        return atob(encodedStr);
    } catch (e) {
        return encodedStr;
    }
}

(function handleUrlToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');

    if (codeParam) {
        const decoded = decodeToken(codeParam);
        localStorage.setItem('lifeos_ai_secret_key', decoded);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
})();

function getApiKey() {
    return localStorage.getItem('lifeos_ai_secret_key') || "";
}

const defaults={
 tasks:[],sessions:[],words:[],
 settings:{studyGoal:120,englishGoal:20,gamingGoal:60},
 gamingUsed:0,gamingDate:"",
 timer:{seconds:1500,mode:"study",running:false},
 gamingTimer:{seconds:0,running:false}
};
let state=load();
let page="dashboard";
let interval=null;
let gamingInterval=null;
let sessionStartedAt=null;
let accumulated=0;

function load(){
 try{
  const x=JSON.parse(localStorage.getItem(KEY)||"null");
  if(!x)return clone(defaults);
  return {...clone(defaults),...x,settings:{...defaults.settings,...x.settings},timer:{...defaults.timer,...x.timer,running:false},gamingTimer:{...defaults.gamingTimer,...x.gamingTimer,running:false}};
 }catch{return clone(defaults)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function toast(msg){const el=$("#toast");if(el){el.textContent=msg;el.style.display="block";setTimeout(()=>el.style.display="none",2500)}}
function studySeconds(){return state.sessions.filter(s=>s.date===today()&&s.type==="study").reduce((a,s)=>a+s.seconds,0)}
function englishSeconds(){return state.sessions.filter(s=>s.date===today()&&s.type==="english").reduce((a,s)=>a+s.seconds,0)}
function studyMin(){return minutes(studySeconds())}
function englishMin(){return minutes(englishSeconds())}
function tasks(){return state.tasks.filter(t=>t.date===today())}
function unlocked(){return studyMin()>=Number(state.settings.studyGoal)&&englishMin()>=Number(state.settings.englishGoal)}
function resetGamingDay(){if(state.gamingDate!==today()){state.gamingDate=today();state.gamingUsed=0;state.gamingTimer.running=false;state.gamingTimer.seconds=0;save()}}
function remainingGaming(){resetGamingDay();return Math.max(0,Number(state.settings.gamingGoal)-Number(state.gamingUsed))}
function fmt(s){s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function dateText(){return new Date().toLocaleDateString("ar-EG",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}

const titles={dashboard:"لوحة التحكم",study:"المذاكرة",timer:"مؤقت التركيز",english:"تعلم الإنجليزي",gaming:"نظام اللعب",settings:"الإعدادات"};
$$(".nav button").forEach(b=>b.onclick=()=>{page=b.dataset.page;$$
(".nav button").forEach(x=>x.classList.toggle("active",x===b));render()});
if($("#date")) $("#date").textContent=dateText();

function render(){ if($("#title")) $("#title").textContent=titles[page];({dashboard:dashboard,study:study,timer:timer,english:english,gaming:gaming,settings:settings}[page])() }

function taskList(list){
 if(!list.length)return '<div class="empty">لا توجد مهام هنا حاليًا.</div>';
 return list.map(t=>`<div class="task ${t.done?"done":""}">
 <div class="task-main"><input type="checkbox" data-check="${t.id}" ${t.done?"checked":""}>
 <div><div class="task-title">${esc(t.title)}</div><div class="small muted">${esc(t.subject)} •${t.minutes} دقيقة</div></div></div>
 <div class="row"><span class="tag">${t.done?"مكتملة":"مفتوحة"}</span><button class="btn danger delete-task" data-id="${t.id}">حذف</button></div>
 </div>`).join("")
}
function bindTasks(){
 $$("[data-check]").forEach(x=>x.onchange=()=>{let t=state.tasks.find(t=>String(t.id)===x.dataset.check);if(t){t.done=x.checked;save();render()}});
 $$(".delete-task").forEach(x=>x.onclick=()=>{state.tasks=state.tasks.filter(t=>String(t.id)!==x.dataset.id);save();render()});
}
function dashboard(){
 const sm=studyMin(),em=englishMin(),ts=tasks(),done=ts.filter(t=>t.done).length;
 $("#content").innerHTML=`
 <div class="grid">
  ${metric("📚 المذاكرة",sm+" دقيقة",state.settings.studyGoal,sm)}
  ${metric("🇬🇧 الإنجليزي",em+" دقيقة",state.settings.englishGoal,em)}
  <div class="card"><div class="muted">🎯 المهام</div><div class="stat">${done}/${ts.length}</div><div class="muted">مهام مكتملة اليوم</div></div>
  <div class="card"><div class="muted">🎮 حالة اللعب</div><div class="stat">${unlocked()?"🔓":"🔒"}</div><div class="muted">${unlocked()?"أهدافك مكتملة":"أكمل أهدافك اليومية"}</div></div>
 </div>
 <div class="card"><h2>🎯 مهام اليوم</h2><div>${taskList(ts)}</div><button class="btn" id="addShortcut">+ إضافة مهمة</button></div>
 <div class="card"><h2>⚡ إجراءات سريعة</h2><button class="btn" id="startShortcut">بدء مذاكرة</button><button class="btn secondary" id="englishShortcut">مراجعة الإنجليزي</button><button class="btn secondary" id="gameShortcut">حالة اللعب</button></div>`;
 bindTasks();
 $("#addShortcut").onclick=()=>{page="study";render()};
 $("#startShortcut").onclick=()=>{page="timer";render()};
 $("#englishShortcut").onclick=()=>{page="english";render()};
 $("#gameShortcut").onclick=()=>{page="gaming";render()};
}
function metric(label,value,goal,current){
 return `<div class="card"><div class="muted">${label}</div><div class="stat">${value}</div><div class="muted">الهدف: ${goal} دقيقة</div><div class="progress"><div style="width:${pct(current,goal)}%"></div></div><div class="small muted">${pct(current,goal)}% مكتمل</div></div>`;
}

function study(){
 $("#content").innerHTML=`
 <div class="card">
  <h2>🤖 توليد الجدول التلقائي بالذكاء الاصطناعي</h2>
  <label>اكتب للذكاء الاصطناعي ماذا تريد أن تفعل في حياتك اليوم (مثلاً: عندي امتحان رياضيات ووراي فيزياء وعايز أنظم يومي)</label>
  <textarea id="aiSchedulePrompt" rows="3" placeholder="اكتب خطتك أو يومك هنا..."></textarea>
  <button class="btn" id="generateAiTasksBtn" style="margin-top:10px;">✨ توليد المهام وإضافتها تلقائياً</button>
  <div id="aiScheduleStatus" class="small muted" style="margin-top:8px;"></div>
 </div>

 <div class="card"><h2>➕ إضافة مهمة يدوياً</h2><form id="taskForm">
 <label>اسم المهمة</label><input id="taskTitle" required placeholder="حل 20 سؤال رياضيات">
 <div class="two"><div><label>المادة</label><select id="subject"><option>رياضيات</option><option>فيزياء</option><option>كيمياء</option><option>إنجليزي</option><option>برمجة</option><option>أخرى</option></select></div><div><label>المدة المتوقعة</label><input id="taskMinutes" type="number" min="1" value="30"></div></div>
 <button class="btn" type="submit">حفظ المهمة</button></form></div>
 
 <div class="card"><h2>📋 مهام اليوم</h2>${taskList(tasks())}</div>
 <div class="card"><h2>📊 جلسات اليوم</h2>${sessionList()}</div>`;

 $("#taskForm").onsubmit=e=>{e.preventDefault();state.tasks.push({id:uid(),title:$("#taskTitle").value.trim(),subject:$("#subject").value,minutes:Math.max(1,Number($("#taskMinutes").value)||30),done:false,date:today()});save();render()};
 
 $("#generateAiTasksBtn").onclick = async () => {
  const promptText = $("#aiSchedulePrompt").value.trim();
  if(!promptText) return toast("اكتب خطتك أو طلبك أولاً!");
  if(!aiEnabled()) return toast("مفتاح الذكاء الاصطناعي غير مفعل في الإعدادات!");
  
  $("#aiScheduleStatus").textContent = "جاري توليد الجدول والمهام عبر الذكاء الاصطناعي...";
  try {
   const data = await groqJSON(`بناءً على طلب المستخدم التالي: "${promptText}". أنشئ جدول مهام لليوم وأرجع مصفوفة JSON فقط بالشكل التالي:
[
  {"title": "اسم المهمة", "subject": "رياضيات أو فيزياء أو كيمياء أو إنجليزي أو برمجة أو أخرى", "minutes": 30}
]`);
   if(Array.isArray(data) && data.length > 0){
    data.forEach(item => {
     state.tasks.push({
      id: uid(),
      title: item.title || "مهمة جديدة",
      subject: item.subject || "أخرى",
      minutes: Number(item.minutes) || 30,
      done: false,
      date: today()
     });
    });
    save();
    toast("تم توليد وإضافة المهام بنجاح! 🎉");
    render();
   } else {
    $("#aiScheduleStatus").textContent = "لم يتم إرجاع مهام صالحة، حاول مرة أخرى.";
   }
  } catch(e) {
   $("#aiScheduleStatus").textContent = "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: " + e.message;
  }
 };

 bindTasks();
}
function sessionList(){
 const list=state.sessions.filter(s=>s.date===today()).slice().reverse();
 if(!list.length)return '<div class="empty">لم تسجل جلسات بعد.</div>';
 return list.map(s=>`<div class="task"><div><b>${s.type==="english"?"🇬🇧 إنجليزي":"📚 مذاكرة"}</b><div class="small muted">${esc(s.subject||"عام")}</div></div><span class="tag">${minutes(s.seconds)} دقيقة</span></div>`).join("");
}

function timer(){
 $("#content").innerHTML=`
 <div class="card"><h2 class="center">⏱️ جلسة تركيز</h2>
 <div class="two"><div><label>نوع الجلسة</label><select id="timerType"><option value="study" ${state.timer.mode==="study"?"selected":""}>📚 مذاكرة</option><option value="english" ${state.timer.mode==="english"?"selected":""}>🇬🇧 إنجليزي</option></select></div><div><label>الموضوع</label><input id="timerSubject" placeholder="رياضيات / Vocabulary"></div></div>
 <div class="timer" id="display">${fmt(state.timer.seconds)}</div><div class="center muted" id="timerStatus">${state.timer.running?"الجلسة تعمل":"جاهز للتركيز؟"}</div>
 <div class="center"><button class="btn success" id="start">▶ بدء</button><button class="btn secondary" id="pause">⏸ إيقاف</button><button class="btn danger" id="stop">⏹ إنهاء</button><button class="btn ghost" id="reset">↺ إعادة</button></div>
 <p class="small muted center">المؤقت يسجل وقت الجلسة عند الضغط على إنهاء، حتى لو أوقفت المؤقت مؤقتًا.</p></div>`;
 $("#timerType").onchange=e=>{state.timer.mode=e.target.value;save()};
 $("#start").onclick=startTimer;$("#pause").onclick=pauseTimer;$("#stop").onclick=stopTimer;$("#reset").onclick=resetTimer;
}
function updateTimer(){if($("#display"))$("#display").textContent=fmt(state.timer.seconds);if($("#timerStatus"))$("#timerStatus").textContent=state.timer.running?"الجلسة تعمل":"المؤقت متوقف"}
function startTimer(){
 if(state.timer.running)return;
 state.timer.running=true;sessionStartedAt=Date.now();save();
 clearInterval(interval);
 interval=setInterval(()=>{
  if(!state.timer.running)return;
  state.timer.seconds--;save();updateTimer();
  if(state.timer.seconds<=0){toast("انتهت الجلسة 🎉");stopTimer()}
 },1000);updateTimer();
}
function pauseTimer(){
 if(sessionStartedAt){accumulated+=Math.floor((Date.now()-sessionStartedAt)/1000);sessionStartedAt=null}
 state.timer.running=false;save();updateTimer();
}
function stopTimer(){
 if(sessionStartedAt){accumulated+=Math.floor((Date.now()-sessionStartedAt)/1000);sessionStartedAt=null}
 if(accumulated>=60){
  state.sessions.push({id:uid(),date:today(),type:state.timer.mode,subject:$("#timerSubject")?.value||"عام",seconds:accumulated});
 }
 accumulated=0;state.timer.running=false;state.timer.seconds=1500;clearInterval(interval);interval=null;save();render();
}
function resetTimer(){clearInterval(interval);interval=null;sessionStartedAt=null;accumulated=0;state.timer.running=false;state.timer.seconds=1500;save();render()}

function english(){
 $("#content").innerHTML=`
 <div class="grid">
  <div class="card"><h2>📚 كلماتك</h2><div class="stat">${state.words.length}</div><div class="muted">إجمالي الكلمات المحفوظة</div></div>
  <div class="card"><h2>🧠 مساعد الذكاء الاصطناعي</h2><div class="muted">ميزات الـ AI مفعلة وتعمل تلقائياً بكفاءة.</div><button class="btn" id="aiQuick">اقتراح درس سريع</button></div>
 </div>

 <div class="card"><h2>➕ إضافة كلمة مع AI</h2>
 <form id="wordForm"><div class="two"><div><label>الكلمة</label><input id="word" required placeholder="success"></div><div><label>المعنى</label><input id="meaning" placeholder="النجاح"></div></div>
 <div class="row"><button class="btn" type="submit">حفظ الكلمة</button><button class="btn secondary" type="button" id="suggestForms">✨ جلب المعنى والتصريفات</button></div>
 <div class="forms">
  <div class="form"><b>Noun (اسم)</b><input id="noun" placeholder="الاسم المشتق"></div>
  <div class="form"><b>Verb (فعل)</b><input id="verb" placeholder="الفعل"></div>
  <div class="form"><b>Adjective (صفة)</b><input id="adjective" placeholder="الصفة"></div>
  <div class="form"><b>Adverb (ظرف)</b><input id="adverb" placeholder="الظرف"></div>
 </div>
 </form><div id="formsStatus" class="small muted"></div></div>

 <div class="card">
  <div class="row" style="justify-content: space-between; align-items: center; margin-bottom: 10px;">
   <h2 style="margin:0;">🤖 مساعد الإنجليزي</h2>
   <button class="btn ghost" id="expandAiBtn" title="تكبير النافذة" style="padding: 4px 10px; font-size: 16px;">🔍 تكبير</button>
  </div>
  <label>اكتب طلبك</label><textarea id="aiPrompt" rows="3" placeholder="اكتب درس إنجليزي للمبتدئين عن كلمة success مع جداول وأمثلة"></textarea>
  <button class="btn" id="askAI">إرسال للمساعد</button>
  <div id="aiResult" class="ai-output">ستظهر النتيجة هنا...</div>
 </div>

 <div class="card"><h2>🎯 نظام التسميع بالوقت التنازلي</h2><div id="quizArea">${quizMarkup()}</div></div>
 <div class="card"><h2>📖 الكلمات المحفوظة</h2>${wordsList()}</div>

 <div id="aiModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center; padding:20px;">
  <div style="background:var(--card,#1e293b); color:var(--text,#f8fafc); width:90%; max-width:800px; max-height:85vh; border-radius:12px; display:flex; flex-direction:column; box-shadow:0 10px 25px rgba(0,0,0,0.5); overflow:hidden; border:1px solid rgba(255,255,255,0.1);">
   <div style="padding:15px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1);">
    <h3 style="margin:0; color:var(--primary);">🔍 لوحة مساعد الذكاء الاصطناعي الموسعة</h3>
    <button class="btn danger" id="closeModalBtn" style="padding:4px 12px; font-size:14px;">✕ إغلاق</button>
   </div>
   <div style="padding:20px; overflow-y:auto; flex:1;" id="modalContentBody"></div>
  </div>
 </div>`;

 $("#wordForm").onsubmit=e=>{e.preventDefault();saveWord();};
 $("#suggestForms").onclick=()=>aiForms($("#word").value.trim());
 $("#askAI").onclick=()=>askAI($("#aiPrompt").value.trim());
 $("#aiQuick").onclick=()=>{if(!aiEnabled())return;$("#aiPrompt").value="اعمل لي درس إنجليزي احترافي للمبتدئين عن كلمة success مع جداول منظمة لصيغ الكلمة (Word Forms) وأمثلة واضحة وتمرين قصير.";askAI($("#aiPrompt").value)};
 
 $("#expandAiBtn").onclick=()=>{
  const currentContent = $("#aiResult").innerHTML;
  $("#modalContentBody").innerHTML = currentContent || '<div class="empty">لا توجد نتائج معروضة حالياً. أرسل طلباً للمساعد أولاً.</div>';
  $("#aiModal").style.display = "flex";
 };
 $("#closeModalBtn").onclick=()=>{
  $("#aiModal").style.display = "none";
 };
 $("#aiModal").onclick=(e)=>{
  if(e.target.id==="aiModal") $("#aiModal").style.display = "none";
 };

 $$(".delete-word").forEach(b=>b.onclick=()=>{state.words=state.words.filter(w=>String(w.id)!==b.dataset.id);save();render()});
 bindQuiz();
}

async function saveWord(){
 const word=$("#word").value.trim();if(!word)return;
 const item={id:uid(),word,meaning:$("#meaning").value.trim(),noun:$("#noun").value.trim(),verb:$("#verb").value.trim(),adjective:$("#adjective").value.trim(),adverb:$("#adverb").value.trim(),created:today()};
 if(aiEnabled()){
  $("#formsStatus").textContent="جاري جلب المعنى والتصريفات...";
  try{
   const data=await groqJSON(`قم بتحليل الكلمة الإنجليزية "${word}". أرجع كائن JSON فقط باللغة الإنجليزية للمفاتيح التالية:
- "meaningArabic": المعنى بالعربية
- "noun": اسم الكلمة (Noun) إذا وجد، وإلا "—"
- "verb": الفعل المرتبط أو أصل الفعل (Verb) إذا وجد، وإلا "—"
- "adjective": الصفة (Adjective) إذا وجدت، وإلا "—"
- "adverb": الظرف (Adverb) إذا وجد، وإلا "—"`);
   item.meaning=item.meaning||data.meaningArabic||"";
   item.noun=item.noun||data.noun||"—";
   item.verb=item.verb||data.verb||"—";
   item.adjective=item.adjective||data.adjective||"—";
   item.adverb=item.adverb||data.adverb||"—";
  }catch(e){$("#formsStatus").textContent="تعذر استخدام AI، يمكنك الحفظ يدويًا.";}
 }
 state.words.push(item);save();toast("تم حفظ الكلمة");render();
}

function wordsList(){
 if(!state.words.length)return '<div class="empty">أضف أول كلمة لك.</div>';
 return state.words.slice().reverse().map(w=>`
  <div class="word" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 15px; margin-bottom: 12px; transition: all 0.3s ease;">
   <div class="word-head" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 8px;">
    <div class="word-name" style="font-size: 18px; font-weight: bold; color: var(--primary);">${esc(w.word)}</div>
    <button class="btn danger delete-word" data-id="${w.id}" style="padding: 4px 10px; font-size: 12px;">حذف</button>
   </div>
   <p style="margin: 6px 0 12px 0; color: var(--text, #f8fafc); font-size: 15px;"><b>المعنى:</b> ${esc(w.meaning||"بدون معنى")}</p>
   <div class="forms" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;">
    <div class="form" style="background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; font-size: 13px;"><b style="display: block; color: var(--muted, #94a3b8); font-size: 11px;">Noun</b>${esc(w.noun||"—")}</div>
    <div class="form" style="background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; font-size: 13px;"><b style="display: block; color: var(--muted, #94a3b8); font-size: 11px;">Verb</b>${esc(w.verb||"—")}</div>
    <div class="form" style="background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; font-size: 13px;"><b style="display: block; color: var(--muted, #94a3b8); font-size: 11px;">Adjective</b>${esc(w.adjective||"—")}</div>
    <div class="form" style="background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; font-size: 13px;"><b style="display: block; color: var(--muted, #94a3b8); font-size: 11px;">Adverb</b>${esc(w.adverb||"—")}</div>
   </div>
  </div>`).join("");
}
function aiEnabled(){return !!getApiKey().trim()}
function quizMarkup(){
 if(state.words.length<4)return '<div class="empty">احفظ 4 كلمات على الأقل لبدء التسميع التفاعلي بالوقت.</div>';
 return '<div class="muted">كل سؤال معه 10 ثواني، وستنتقل الكلمات تلقائياً ورا بعض.</div><button class="btn" id="startQuiz">بدء التسميع المتسلسل</button>';
}
function bindQuiz(){
 const start=$("#startQuiz");if(start)start.onclick=startQuizSequence;
}

let quizQueue=[];
let quizIndex=0;
let quizScore=0;
let quizTimer=null;
let timeLeft=10;

function startQuizSequence(){
 if(state.words.length<4)return;
 quizQueue=state.words.slice().sort(()=>Math.random()-.5);
 quizIndex=0;
 quizScore=0;
 runQuizStep();
}

function runQuizStep(){
 clearInterval(quizTimer);
 if(quizIndex>=quizQueue.length){
  $("#quizArea").innerHTML=`<div class="center" style="padding:20px;"><h3>🎉 انتهى التسميع!</h3><div class="stat" style="margin:10px 0;">نتيجتك: ${quizScore} /${quizQueue.length}</div><button class="btn" id="restartQuizBtn">إعادة التسميع</button></div>`;
  $("#restartQuizBtn").onclick=startQuizSequence;
  return;
 }

 timeLeft=10;
 const currentWord=quizQueue[quizIndex];
 const pool=state.words.filter(w=>w.id!==currentWord.id).sort(()=>Math.random()-.5).slice(0,3);
 const options=[currentWord,...pool].sort(()=>Math.random()-.5);

 $("#quizArea").innerHTML=`
 <div class="row" style="justify-content: space-between; margin-bottom:10px;">
  <span class="tag">السؤال ${quizIndex+1} من ${quizQueue.length}</span>
  <span class="tag" id="quizTimerTag" style="background:var(--primary); color:#fff;">⏳ 10 ثواني</span>
 </div>
 <div class="muted">اختر المعنى الصحيح للكلمة:</div>
 <div class="quiz-word">${esc(currentWord.word)}</div>${options.map((o)=>`<button class="quiz-option" data-id="${o.id}">${esc(o.meaning||"بدون معنى")}</button>`).join("")}
 <div id="quizFeedback" class="small muted" style="margin-top:10px;"></div>`;

 $$(".quiz-option").forEach(b=>b.onclick=(e)=>{
  clearInterval(quizTimer);
  const correct=String(b.dataset.id)===String(currentWord.id);
  if(correct) quizScore++;
  $$(".quiz-option").forEach(x=>x.disabled=true);
  b.classList.add(correct?"correct":"wrong");
  $("#quizFeedback").textContent=correct?"✅ إجابة صحيحة! الانتقال للكلمة التالية...":"❌ خطأ. الإجابة: "+(currentWord.meaning||"");
  
  setTimeout(()=>{
   quizIndex++;
   runQuizStep();
  }, 1200);
 });

 quizTimer=setInterval(()=>{
  timeLeft--;
  if($("#quizTimerTag")) $("#quizTimerTag").textContent=`⏳ ${timeLeft} ثواني`;
  if(timeLeft<=0){
   clearInterval(quizTimer);
   $$(".quiz-option").forEach(x=>x.disabled=true);
   $("#quizFeedback").textContent=`⏰ انتهى الوقت! الإجابة الصحيحة: ${currentWord.meaning||""}`;
   setTimeout(()=>{
    quizIndex++;
    runQuizStep();
   }, 1500);
  }
 },1000);
}

function renderAIText(text){
 let safe = esc(text||"");
 safe = safe.replaceAll(/---+/g, '');

 let html = safe.replace(/\|(.+)\|/g, (match, p1) => {
  const cells = p1.split('|').map(c => `<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.1);">${c.trim()}</td>`).join('');
  return `<tr>${cells}</tr>`;
 });
 html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, (match) => {
  return `<div style="overflow-x:auto; margin:8px 0;"><table class="ai-table" style="width:100%; border-collapse:collapse; text-align:right;">${match}</table></div>`;
 });

 return html
  .replace(/^###\s*(.+)$/gm,'<div class="ai-title" style="font-size:16px; font-weight:bold; margin-top:10px; color:var(--primary);">$1</div>')
  .replace(/^##\s*(.+)$/gm,'<div class="ai-title" style="font-size:18px; font-weight:bold; margin-top:12px; color:var(--primary);">$1</div>')
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  .replace(/^\*\s*(.+)$/gm,'<div style="margin:2px 0;">• $1</div>')
  .replace(/^\-\s*(.+)$/gm,'<div style="margin:2px 0;">• $1</div>')
  .replace(/`([^`]+)`/g,'<strong>$1</strong>')
  .replace(/\n{2,}/g,'<div style="height:4px"></div>')
  .replace(/\n/g,'<br>');
}

async function groq(prompt){
 if(!aiEnabled())throw new Error("الـ AI غير مفعّل.");
 const key=getApiKey();
 const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
  method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
  body:JSON.stringify({model:"openai/gpt-oss-120b",messages:[
   {role:"system",content:"أنت مساعد شخصي ذكي ومنظم لجداول الحياة والمذاكرة. ركّز في إجاباتك على دقة البيانات وتنسيقها."},
   {role:"user",content:prompt}],stream:false,temperature:.35,max_completion_tokens:1500,reasoning_effort:"low"})
 });
 const json=await response.json();if(!response.ok)throw new Error(json?.error?.message||"حدث خطأ في طلب AI");
 return json.choices?.[0]?.message?.content||"لم تصل نتيجة.";
}
async function groqJSON(prompt){
 const raw=await groq(prompt+" أرجع JSON صالحًا فقط بدون أي نصوص أو تفاصيل خارجية أو علامات Markdown إضافية.");
 const cleaned=raw.replace(/```json|```/g,"").trim();
 return JSON.parse(cleaned);
}
async function aiForms(word){
 if(!aiEnabled())return toast("الـ AI غير متاح");
 if(!word)return toast("اكتب الكلمة أولًا");
 $("#aiResult").innerHTML='<span class="ai-badge">AI</span> جاري جلب المعنى والتصريفات...';
 try{
  const data=await groqJSON(`قم بتحليل الكلمة الإنجليزية "${word}". أرجع كائن JSON فقط باللغة الإنجليزية للمفاتيح التالية:
- "meaningArabic": المعنى بالعربية
- "noun": اسم الكلمة (Noun) إذا وجد، وإلا "—"
- "verb": الفعل المرتبط أو أصل الفعل (Verb) إذا وجد، وإلا "—"
- "adjective": الصفة (Adjective) إذا وجدت، وإلا "—"
- "adverb": الظرف إذا وجد، وإلا "—"`);
  $("#meaning").value=data.meaningArabic||"";
  $("#noun").value=data.noun||"—";
  $("#verb").value=data.verb||"—";
  $("#adjective").value=data.adjective||"—";
  $("#adverb").value=data.adverb||"—";
  $("#aiResult").innerHTML='<div class="ai-section"><div class="ai-title">Word Forms</div>'+renderAIText(JSON.stringify(data,null,2))+'</div>';
 }catch(e){$("#aiResult").textContent=e.message}
}
async function askAI(prompt){
 if(!aiEnabled())return toast("الـ AI غير متاح");
 if(!prompt)return toast("اكتب طلبك أولًا");
 $("#aiResult").innerHTML='<span class="ai-badge">AI</span> جاري تنسيق وإعداد الدرس...';
 try{
  const resText = await groq(prompt);
  const formatted = renderAIText(resText);
  $("#aiResult").innerHTML=formatted;
  if($("#aiModal").style.display === "flex"){
   $("#modalContentBody").innerHTML = formatted;
  }
 }catch(e){$("#aiResult").textContent=e.message}
}

function gaming(){
 const ok=unlocked();
 resetGamingDay();
 const remain=remainingGaming();
 
 $("#content").innerHTML=`
 <div class="card">
  <h2>🎮 نظام اللعب الذكي</h2>
  <div class="status ${ok?"ok":""}">
   <div style="font-size:35px">${ok?"🔓":"🔒"}</div>
   <h3>${ok?"اللعب متاح وجاهز":"اللعب مقفول حتى تكمل أهدافك"}</h3>
   <p>${ok?"لقد حققت أهداف المذاكرة والإنجليزي بنجاح! يمكنك البدء باللعب الآن.":"أكمل أهداف اليوم في المذاكرة والإنجليزي لفتح جلسة اللعب."}</p>
  </div>
  
  <div class="grid" style="margin-top:15px">
   <div class="card"><h3>📚 المذاكرة</h3><div class="stat">${studyMin()} دقيقة</div><div class="muted">الهدف: ${state.settings.studyGoal} د</div></div>
   <div class="card"><h3>🇬🇧 الإنجليزي</h3><div class="stat">${englishMin()} دقيقة</div><div class="muted">الهدف: ${state.settings.englishGoal} د</div></div>
  </div>

  <div style="text-align:center; margin: 20px 0;">
   <div class="muted">الرصيد المتبقي للعب اليوم</div>
   <div class="stat" id="gamingTimeDisplay">${fmt(state.gamingTimer.running ? state.gamingTimer.seconds : remain * 60)}</div>
   <div class="small muted" id="gamingStatusText">${state.gamingTimer.running ? "جلسة اللعب تعمل الآن..." : "المؤقت متوقف"}</div>
  </div>

  <div class="center">
   <button class="btn success" id="startGamingTimer" ${!ok || remain <= 0 ? "disabled":""}>▶ بدء وقت اللعب</button>
   <button class="btn danger" id="stopGamingTimer" ${!state.gamingTimer.running ? "disabled":""}>⏹ إنهاء وإغلاق</button>
   <button class="btn ghost" id="resetGame">إعادة ضبط الرصيد</button>
  </div>
  <div class="small muted center" style="margin-top: 10px;">عند انتهاء الوقت المحدد، سيتم إغلاق اللعبة تلقائياً وإرسال إشعار تنبيهي.</div>
 </div>`;

 $("#startGamingTimer").onclick = startGamingCountdown;
 $("#stopGamingTimer").onclick = stopGamingCountdown;
 $("#resetGame").onclick = () => {
  clearInterval(gamingInterval);
  state.gamingUsed = 0;
  state.gamingTimer.running = false;
  state.gamingTimer.seconds = 0;
  state.gamingDate = today();
  save();
  render();
  toast("تم إعادة ضبط رصيد اللعب");
 };
}

function startGamingCountdown(){
 const remain=remainingGaming();
 if(!unlocked() || remain<=0) return toast("أهدافك لم تكتمل أو انتهى رصيدك!");
 
 if(!state.gamingTimer.running){
  if(state.gamingTimer.seconds<=0){
   state.gamingTimer.seconds = remain * 60;
  }
  state.gamingTimer.running = true;
  save();
 }

 clearInterval(gamingInterval);
 gamingInterval = setInterval(()=>{
  if(!state.gamingTimer.running) return;
  state.gamingTimer.seconds--;
  save();
  
  if($("#gamingTimeDisplay")) $("#gamingTimeDisplay").textContent = fmt(state.gamingTimer.seconds);
  if($("#gamingStatusText")) $("#gamingStatusText").textContent = "جلسة اللعب تعمل الآن...";

  if(state.gamingTimer.seconds<=0){
   stopGamingCountdown();
   toast("⏰ انتهى وقت اللعب المخصص! تم قفل النظام.");
  }
 }, 1000);

 render();
 toast("بدأ مؤقت اللعب 🎮");
}

function stopGamingCountdown(){
 if(state.gamingTimer.running){
  const elapsed = (remainingGaming() * 60) - state.gamingTimer.seconds;
  const elapsedMinutes = Math.ceil(elapsed / 60);
  if(elapsedMinutes > 0){
   state.gamingUsed = Math.min(Number(state.settings.gamingGoal), state.gamingUsed + elapsedMinutes);
  }
 }
 clearInterval(gamingInterval);
 gamingInterval = null;
 state.gamingTimer.running = false;
 state.gamingTimer.seconds = 0;
 save();
 render();
}

function settings(){
 $("#content").innerHTML=`
 <div class="card"><h2>⚙️ أهدافك</h2><form id="settingsForm">
 <label>هدف المذاكرة بالدقائق</label><input id="sg" type="number" min="1" value="${state.settings.studyGoal}">
 <label>هدف الإنجليزي بالدقائق</label><input id="eg" type="number" min="1" value="${state.settings.englishGoal}">
 <label>حد اللعب بالدقائق</label><input id="gg" type="number" min="1" value="${state.settings.gamingGoal}">
 <button class="btn" type="submit">حفظ الأهداف</button></form></div>
 
 <div class="card"><h2>🤖 إعداد الذكاء الاصطناعي</h2><form id="aiKeyForm">
 <label>مفتاح Groq API (يُحفظ محلياً بمتصفحك فقط)</label>
 <input id="aiKeyInput" type="password" placeholder="gsk_..." value="${getApiKey()}">
 <div class="row" style="margin-top:10px;">
     <button class="btn" type="submit">حفظ المفتاح</button>
     <button class="btn danger" type="button" id="clearApiKey">حذف المفتاح</button>
 </div>
 </form></div>

 <div class="card"><h2>💾 النسخ الاحتياطي</h2><button class="btn secondary" id="export">تصدير JSON</button><label>استيراد نسخة JSON</label><input type="file" id="importFile" accept=".json"><button class="btn danger" id="clear">حذف جميع البيانات</button></div>`;
 
 $("#settingsForm").onsubmit=e=>{
  e.preventDefault();
  state.settings.studyGoal=Math.max(1,+$("#sg").value||120);
  state.settings.englishGoal=Math.max(1,+$("#eg").value||20);
  state.settings.gamingGoal=Math.max(1,+$("#gg").value||60);
  save();toast("تم حفظ الأهداف");
 };

 $("#aiKeyForm").onsubmit=e=>{
  e.preventDefault();
  const key=$("#aiKeyInput").value.trim();
  if(key){
   localStorage.setItem('lifeos_ai_secret_key', key);
   toast("تم حفظ مفتاح الـ AI بنجاح");
  }
 };

 $("#clearApiKey").onclick=()=>{
  localStorage.removeItem('lifeos_ai_secret_key');
  $("#aiKeyInput").value="";
  toast("تم إزالة مفتاح الـ AI");
 };
 
 $("#export").onclick=exportData;
 $("#importFile").onchange=importData;
 $("#clear").onclick=clearData;
}
function exportData(){
 const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="lifeos-backup-"+today()+".json";a.click();URL.revokeObjectURL(url);
}
function importData(e){
 const file=e.target.files[0];if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{try{const x=JSON.parse(reader.result);if(!x||typeof x!=="object")throw 0;state={...clone(defaults),...x,settings:{...defaults.settings,...x.settings}};save();toast("تم الاستيراد");render()}catch{toast("ملف غير صالح")}};
 reader.readAsText(file);
}
function clearData(){
 if(!confirm("سيتم حذف كل البيانات. هل أنت متأكد؟"))return;
 state=clone(defaults);save();resetTimer();render();
}
function resetTop(){
 if(confirm("حذف كل البيانات؟")){state=clone(defaults);save();resetTimer();render();}
}
if($("#exportTop")) $("#exportTop").onclick=exportData;
if($("#resetTop")) $("#resetTop").onclick=resetTop;

// إخفاء السكرول نهائياً لجميع العناصر عبر كود البرمجة الداخلي
const styleTag = document.createElement('style');
styleTag.innerHTML = `
 *::-webkit-scrollbar { display: none; width: 0px; height: 0px; }
 * { scrollbar-width: none; -ms-overflow-style: none; }
`;
document.head.appendChild(styleTag);

resetGamingDay();render();