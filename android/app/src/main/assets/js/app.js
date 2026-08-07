/* ============================================================
   دليل رائد الأعمال - منطق التطبيق
   ============================================================ */
(function(){
  'use strict';

  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store = {
    get(k,d){ try{const v=localStorage.getItem(k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
    set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  };

  // حماية توافق المتصفحات القديمة
  if(!window.matchMedia){ window.matchMedia = function(q){ return {matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false;}}; }; }
  if(!window.scrollTo){ window.scrollTo = function(){}; }

  let currentRoute='home';
  let checked = store.get('re_checks',{});
  let currentYear = store.get('re_year',1);
  let theme = store.get('re_theme','light');
  let notes = store.get('re_notes',[]);
  let favorites = store.get('re_favs',[]);

  // Gamification State
  let currentDay = store.get('re_day', 1);
  let xp = store.get('re_xp', 0);
  let streak = store.get('re_streak', 0);
  let lastLoginDate = store.get('re_last_login', '');
  let dailyProgress = store.get('re_daily_prog', {lesson:false, task:false, question:false, date:''});

  /* ---------- شاشة البداية ---------- */
  window.addEventListener('load', ()=>{
    setTimeout(()=>{
      $('#splash').classList.add('hide');
      setTimeout(()=>{ $('#splash').hidden=true; init(); }, 600);
    }, 1200);
  });

  function init(){
    applyTheme();
    buildNav();
    buildBottomNav();
    bindEvents();
    registerSW();
    $('#appHeader').hidden=false;
    $('#content').hidden=false;
    $('#bottomNav').hidden=false;
    // drawer يبقى مخفي على الجوال، يظهر عبر CSS على الشاشات الكبيرة
    if(window.matchMedia('(min-width:900px)').matches){
      $('#drawer').hidden=false;
    }
    route();
  }

  function applyTheme(){
    document.documentElement.setAttribute('data-theme', theme);
  }

  /* ---------- القائمة الجانبية ---------- */
  function buildNav(){
    const list = $('#navList');
    list.innerHTML = SECTIONS.map(s=>`
      <li><button class="nav-item ${s.id==='home'?'active':''}" data-route="${s.id}">
        <span class="ni-num">${s.num}</span><span>${s.title}</span>
      </button></li>`).join('');
    list.addEventListener('click', e=>{
      const btn=e.target.closest('.nav-item'); if(!btn) return;
      navigate(btn.dataset.route);
      closeDrawer();
    });
  }

  function buildBottomNav(){
    $$('.nav-tab').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
  }

  function bindEvents(){
    $('#menuBtn').addEventListener('click', openDrawer);
    $('#drawerOverlay').addEventListener('click', closeDrawer);
    $('#toTop').addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
    window.addEventListener('scroll', ()=>{
      $('#toTop').hidden = window.scrollY < 400;
    });
    // تثبيت PWA
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e=>{
      e.preventDefault(); deferredPrompt=e;
      const ib=$('#installBtn'); ib.hidden=false;
      ib.addEventListener('click', async()=>{
        ib.hidden=true; deferredPrompt.prompt();
        await deferredPrompt.userChoice; deferredPrompt=null;
      },{once:true});
    });
    window.addEventListener('appinstalled', ()=>{ $('#installBtn').hidden=true; toast('تم تثبيت التطبيق بنجاح ✅'); });

    $('#resetProgress').addEventListener('click',()=>{
      if(confirm('هل تريد إعادة ضبط كل علامات التقدم المحفوظة؟')){
        checked={}; store.set('re_checks',{}); toast('تم إعادة الضبط');
        if(currentRoute==='dashboard') renderDashboard();
      }
    });

    // --- الميزات الجديدة ---
    // الوضع الليلي
    $('#themeBtn')?.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      store.set('re_theme', theme);
      applyTheme();
    });

    // حجم الخط
    let textSizes = ['normal', 'text-lg', 'text-sm'];
    let currSizeIdx = store.get('re_text_size', 0);
    const applyTextSize = () => {
      document.body.classList.remove('text-lg', 'text-sm');
      if (textSizes[currSizeIdx] !== 'normal') document.body.classList.add(textSizes[currSizeIdx]);
    };
    applyTextSize();
    $('#textSizeBtn')?.addEventListener('click', () => {
      currSizeIdx = (currSizeIdx + 1) % textSizes.length;
      store.set('re_text_size', currSizeIdx);
      applyTextSize();
      toast(currSizeIdx === 0 ? 'حجم الخط: عادي' : currSizeIdx === 1 ? 'حجم الخط: كبير' : 'حجم الخط: صغير');
    });

    // تصدير البيانات
    $('#exportData')?.addEventListener('click', () => {
      const dataStr = JSON.stringify({ checks: checked, year: currentYear, notes: notes, favs: favorites, day: currentDay, xp: xp, streak: streak });
      const blob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'entrepreneur-guide-backup.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('تم التصدير بنجاح 📁');
      closeDrawer();
    });

    // استيراد البيانات
    $('#importDataBtn')?.addEventListener('click', () => $('#importDataFile').click());
    $('#importDataFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed.checks !== undefined) {
            checked = parsed.checks; currentYear = parsed.year || 1;
            notes = parsed.notes || []; favorites = parsed.favs || [];
            currentDay = parsed.day || 1; xp = parsed.xp || 0; streak = parsed.streak || 0;
            store.set('re_checks', checked); store.set('re_year', currentYear);
            store.set('re_notes', notes); store.set('re_favs', favorites);
            store.set('re_day', currentDay); store.set('re_xp', xp); store.set('re_streak', streak);
            toast('تم الاستيراد بنجاح ✅');
            render(currentRoute);
            closeDrawer();
          } else { toast('ملف غير صالح ❌'); }
        } catch(err) { toast('حدث خطأ ❌'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // التنقل بالتجزئة
    window.addEventListener('hashchange', route);
  }

  function openDrawer(){
    $('#drawer').hidden=false;
    requestAnimationFrame(()=>{ $('#drawer').classList.add('show'); $('#drawerOverlay').hidden=false; requestAnimationFrame(()=>$('#drawerOverlay').classList.add('show')); });
  }
  function closeDrawer(){
    if(window.matchMedia('(min-width:900px)').matches) return;
    $('#drawer').classList.remove('show');
    const ov=$('#drawerOverlay'); ov.classList.remove('show');
    setTimeout(()=>{ $('#drawer').hidden=true; ov.hidden=true; },320);
  }

  function navigate(route){ currentRoute=route; location.hash=route; }

  function route(){
    const hashStr = location.hash || '#home';
    const cleanHash = hashStr.slice(1);
    const path = cleanHash.split('?')[0] || 'home';
    
    currentRoute = SECTIONS.find(s=>s.id===path) ? path : 'home';
    updateActiveNav();
    render(currentRoute);
    
    // معالجة البارامترات (Deep Linking)
    const urlParams = new URLSearchParams(cleanHash.split('?')[1] || '');
    
    if (currentRoute === 'mistakes') {
      const targetId = urlParams.get('id');
      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById('err-' + targetId);
          if(el) {
            el.scrollIntoView({behavior: 'smooth', block: 'center'});
            el.classList.add('highlight-anim');
            setTimeout(() => el.classList.remove('highlight-anim'), 3000);
          }
        }, 100);
      } else {
        window.scrollTo({top:0});
      }
    } 
    else if (currentRoute === 'notebook') {
      const q = urlParams.get('q');
      if (q) {
        setTimeout(() => {
          const input = document.getElementById('newNoteTxt');
          if (input && !input.value) {
            input.value = "إجابة سؤال (" + q + "): \n";
            input.focus();
            input.scrollIntoView({behavior: 'smooth', block: 'center'});
          }
        }, 100);
      } else {
        window.scrollTo({top:0});
      }
    }
    else {
      window.scrollTo({top:0});
    }

    if(window.matchMedia('(max-width:899px)').matches) closeDrawer();
  }

  function updateActiveNav(){
    $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.route===currentRoute));
    $$('.nav-tab').forEach(b=>b.classList.toggle('active', b.dataset.route===currentRoute));
    const sec = SECTIONS.find(s=>s.id===currentRoute);
    $('#sectionTitle').textContent = sec? sec.title : 'دليل رائد الأعمال';
  }

  /* ---------- المشغّل الرئيسي ---------- */
  function render(route){
    const c=$('#content');
    const map={
      home:renderHome, plan:renderPlan, learning:renderLearning, currentjob:renderCurrentJob,
      personality:renderPersonality, sales:renderSales, money:renderMoney, project:renderProject,
      reputation:renderReputation, mistakes:renderMistakes, books:renderBooks, courses:renderCourses,
      ai:renderAI, habits:renderHabits, dashboard:renderDashboard, scenarios:renderScenarios, future:renderFuture,
      notebook:renderNotebook, favorites:renderFavorites
    };
    c.innerHTML = (map[route]||renderHome)();
    if(route==='plan') bindPlanEvents();
    if(route==='dashboard') bindDashboardEvents();
    if(route==='mistakes') bindMistakesSearch();
    if(route==='notebook') bindNotebookEvents();
    if(route==='favorites') bindMistakesSearch(); // reuse events for favs if needed
    if(route==='home') bindHomeEvents();
  }

  function toast(msg){
    const t=$('#toast'); t.textContent=msg; t.hidden=false;
    clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 2200);
  }

  function getLevel(xp) {
    if (xp < 100) return 'متدرب 🌱';
    if (xp < 500) return 'مبادر 🚀';
    if (xp < 1000) return 'صاحب مشروع 💼';
    return 'رائد أعمال 👑';
  }

  function getDailyContent(dayIndex) {
    const lessonIdx = dayIndex % MISTAKES.length;
    const lesson = MISTAKES[lessonIdx];
    const allTasks = [...DASHBOARD.daily, ...HABITS.morning, ...HABITS.atWork];
    const task = allTasks.length ? allTasks[dayIndex % allTasks.length] : "استمر في التعلم";
    const question = typeof REFLECTIONS !== 'undefined' ? REFLECTIONS[dayIndex % REFLECTIONS.length] : "راجع أهدافك اليوم";
    return {lesson, lessonIdx, task, question};
  }

  function renderHome(){
    const today = new Date().toLocaleDateString('en-CA');
    if (lastLoginDate !== today) {
      const yest = new Date(); yest.setDate(yest.getDate()-1);
      if (lastLoginDate === yest.toLocaleDateString('en-CA')) {
        streak++;
      } else if (lastLoginDate !== '') {
        streak = 1;
      } else { streak = 1; }
      lastLoginDate = today;
      store.set('re_last_login', lastLoginDate);
      store.set('re_streak', streak);
      if(dailyProgress.date !== today) {
         dailyProgress = {lesson:false, task:false, question:false, date:today};
         store.set('re_daily_prog', dailyProgress);
      }
    }

    const {lesson, task, question} = getDailyContent(currentDay - 1);
    const level = getLevel(xp);
    const nextLevelXP = xp < 100 ? 100 : (xp < 500 ? 500 : (xp < 1000 ? 1000 : xp+1));
    const pct = Math.min(100, Math.round((xp / nextLevelXP) * 100));
    const isDone = dailyProgress.lesson && dailyProgress.task && dailyProgress.question;

    try { if (window.AndroidApp) window.AndroidApp.setDailyTask(task); } catch(e){}

    const tiles = SECTIONS.filter(s=>s.id!=='home').map(s=>`
      <button class="section-tile" data-go="${s.id}">
        <span class="ic ${s.color}">${s.num}</span>
        <span class="t">${s.title}</span>
      </button>`).join('');

    return `
      <section class="hero coach-hero" style="background: linear-gradient(135deg, var(--teal-700) 0%, var(--teal-500) 100%);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1 style="font-size:22px; margin-bottom:4px;">أهلاً بك، يا رائد الأعمال!</h1>
            <p style="margin:0; opacity:0.9;">اليوم هو يومك الـ <b>${currentDay}</b> في رحلتك.</p>
          </div>
          <div style="text-align:center; background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:12px;">
            <div style="font-size:20px;">🔥</div>
            <div style="font-weight:bold; font-size:12px;">${streak} أيام</div>
          </div>
        </div>
        <div style="margin-top:16px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; font-weight:bold;">
            <span>المستوى: ${level}</span>
            <span>${xp} / ${nextLevelXP} XP</span>
          </div>
          <div class="bar" style="height:8px; background:rgba(255,255,255,0.3); border-radius:4px; overflow:hidden;">
            <span style="width:${pct}%; background:var(--amber); border-radius:4px; display:block; height:100%; transition:width 0.5s;"></span>
          </div>
        </div>
      </section>

      <div class="card coach-card" style="margin-top:-15px; position:relative; z-index:10;">
        <h2 style="margin-bottom:15px;">🎯 خطة اليوم</h2>
        
        <div class="check-item coach-item-wrapper ${dailyProgress.lesson ? 'done' : ''}" style="align-items:flex-start; padding:12px;">
          <button class="chk coach-chk-btn" data-type="lesson" style="border:none; background:transparent; cursor:pointer; padding:0; margin-left:10px; flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5L20 7"/></svg>
          </button>
          <div class="txt coach-txt-btn" data-type="lesson-text" style="cursor:pointer; flex:1;">
            <b style="color:var(--teal-600)">📖 اقرأ هذا الدرس:</b><br>
            <span style="font-size:14px;">${esc(lesson.err)}</span>
          </div>
        </div>

        <div class="check-item coach-item-wrapper ${dailyProgress.task ? 'done' : ''}" style="align-items:flex-start; padding:12px;">
          <button class="chk coach-chk-btn" data-type="task" style="border:none; background:transparent; cursor:pointer; padding:0; margin-left:10px; flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5L20 7"/></svg>
          </button>
          <div class="txt coach-txt-btn" data-type="task-text" style="cursor:pointer; flex:1;">
            <b style="color:var(--amber-dark)">⚡ نفذ هذه المهمة:</b><br>
            <span style="font-size:14px;">${esc(task)}</span>
          </div>
        </div>

        <div class="check-item coach-item-wrapper ${dailyProgress.question ? 'done' : ''}" style="align-items:flex-start; padding:12px;">
          <button class="chk coach-chk-btn" data-type="question" style="border:none; background:transparent; cursor:pointer; padding:0; margin-left:10px; flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5L20 7"/></svg>
          </button>
          <div class="txt coach-txt-btn" data-type="question-text" style="cursor:pointer; flex:1;">
            <b style="color:var(--cyan-700)">🤔 أجب عن هذا السؤال:</b><br>
            <span style="font-size:14px;">${esc(question)}</span>
          </div>
        </div>

        <div id="coachSuccess" style="display:${isDone ? 'block' : 'none'}; margin-top:15px; padding:15px; background:rgba(34,197,94,0.1); color:#166534; border:1px solid rgba(34,197,94,0.3); border-radius:8px; text-align:center; animation:fadeIn 0.5s;">
          <div style="font-size:30px; margin-bottom:10px;">🎉</div>
          <h3 style="margin-bottom:10px; color:#15803d">أحسنت! لقد أنهيت يومك.</h3>
          <button id="nextDayBtn" class="btn-primary" style="background:#16a34a;">انتقل لليوم التالي (+50 XP)</button>
        </div>
      </div>
      
      <div class="section-grid" style="margin-top:20px;">
        ${tiles}
      </div>
    `;
  }

  function bindHomeEvents() {
    const {lesson, lessonIdx, task, question} = getDailyContent(currentDay - 1);

    // Deep Linking on text click
    $$('.coach-txt-btn').forEach(el => {
      el.addEventListener('click', () => {
        const type = el.dataset.type;
        if(type === 'lesson-text') {
          navigate('mistakes?id=' + lessonIdx);
        }
        else if (type === 'task-text') {
          navigate('dashboard');
        }
        else if (type === 'question-text') {
          navigate('notebook?q=' + encodeURIComponent(question));
        }
      });
    });

    // Check button click
    $$('.coach-chk-btn').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const type = el.dataset.type;
        if(dailyProgress[type]) return; // already done

        dailyProgress[type] = true;
        store.set('re_daily_prog', dailyProgress);
        
        el.closest('.coach-item-wrapper').classList.add('done');
        xp += 10; // 10 XP per sub-task
        store.set('re_xp', xp);
        toast('+10 XP 🌟');
        
        if (dailyProgress.lesson && dailyProgress.task && dailyProgress.question) {
          $('#coachSuccess').style.display = 'block';
        }
        // Small delay then update header XP bar
        setTimeout(()=> {
           if(currentRoute==='home') {
               const st = document.documentElement.scrollTop;
               $('#content').innerHTML = renderHome();
               bindHomeEvents();
               document.documentElement.scrollTop = st;
           }
        }, 800);
      });
    });

    $('#nextDayBtn')?.addEventListener('click', () => {
       xp += 50;
       currentDay++;
       dailyProgress = {lesson:false, task:false, question:false, date: dailyProgress.date};
       store.set('re_xp', xp);
       store.set('re_day', currentDay);
       store.set('re_daily_prog', dailyProgress);
       toast('يوم جديد، وتحدي جديد! +50 XP 🎉');
       $('#content').innerHTML = renderHome();
       bindHomeEvents();
       window.scrollTo({top:0, behavior:'smooth'});
    });
  }

  function countAllChecks(){
    return DASHBOARD.daily.length+DASHBOARD.weekly.length+DASHBOARD.monthly.length+DASHBOARD.quarterly.length+DASHBOARD.yearly.length;
  }

  /* ========== الخطة الزمنية ========== */
  function renderPlan(){
    const y = PLAN.find(p=>p.year===currentYear) || PLAN[0];
    let html=`
      <div class="sec-intro">${esc(y.title)} — ${esc(y.theme)}</div>
      <div class="year-tabs">
        ${PLAN.map(p=>`<button class="year-tab ${p.year===currentYear?'active':''}" data-year="${p.year}">السنة ${p.year}</button>`).join('')}
      </div>`;
    y.quarters.forEach(q=>{
      html+=`<div class="quarter-block"><h2>📌 ${esc(q.q)}</h2>`;
      q.months.forEach(m=>{
        html+=`<div class="month"><h3>🗓️ ${esc(m.m)}</h3>`;
        m.weeks.forEach(w=>{
          html+=`<div class="week"><h4>${esc(w.w)}</h4><ul>${w.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`;
        });
        html+=`</div>`;
      });
      html+=`</div>`;
    });
    return html;
  }
  function bindPlanEvents(){
    $$('.year-tab').forEach(t=>t.addEventListener('click',()=>{
      currentYear=parseInt(t.dataset.year); store.set('re_year',currentYear);
      $('#content').innerHTML=renderPlan(); bindPlanEvents();
    }));
  }

  /* ========== التعلم ========== */
  function renderLearning(){
    let html=`<div class="sec-intro">${esc(LEARNING.intro)}</div>`;
    LEARNING.phases.forEach((ph,i)=>{
      html+=`<div class="card"><h2><span class="ic ${ph.color}" style="width:34px;height:34px;border-radius:10px;font-size:16px">${i+1}</span>${esc(ph.phase)}</h2>`;
      ph.skills.forEach(s=>{
        html+=`<div class="acc-item"><button class="acc-head"><span>${esc(s.name)}</span><span class="arr">▾</span></button>
          <div class="acc-body">
            <p><b>لماذا؟</b> ${esc(s.why)}</p>
            <p><b>متى؟</b> ${esc(s.when)}</p>
            <p><b>المصدر:</b> ${esc(s.source)}</p>
            <p><b>تطبيق عملي:</b> ${esc(s.practice)}</p>
          </div></div>`;
      });
      html+=`</div>`;
    });
    return html;
  }

  /* ========== الاستفادة من العمل ========== */
  function renderCurrentJob(){
    const j=CURRENTJOB;
    const block=(title,icon,arr)=>`<div class="card"><h2>${icon} ${title}</h2><ul>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return `<div class="sec-intro">${esc(j.intro)}</div>
      ${block('ماذا أراقب؟','👁️',j.watch)}
      ${block('ماذا أكتب؟','📝',j.write)}
      ${block('ماذا أسأل صاحب المحل؟','🗣️',j.askOwner)}
      ${block('كيف أتعلم من الزبائن؟','🧑‍🤝‍🧑',j.fromCustomers)}
      ${block('كيف أتعلم من الموردين؟','🚚',j.fromSuppliers)}
      ${block('كيف أتعلم من الأخطاء؟','🔄',j.fromMistakes)}
      ${block('ما الذي أدونه يومياً؟','📋',j.dailyLog)}`;
  }

  /* ========== الشخصية ========== */
  function renderPersonality(){
    let html=`<div class="sec-intro">${esc(PERSONALITY.intro)}</div>`;
    PERSONALITY.traits.forEach(t=>{
      html+=`<div class="card"><h2>✨ ${esc(t.trait)}</h2><p>${esc(t.desc)}</p>
        <h3>تمارين يومية</h3><ul>${t.daily.map(d=>`<li>${esc(d)}</li>`).join('')}</ul>
        <div class="exercise"><b>تمرين أسبوعي:</b> ${esc(t.weekly)}</div>
        <div class="exercise"><b>تمرين شهري:</b> ${esc(t.monthly)}</div>
      </div>`;
    });
    return html;
  }

  /* ========== البيع ========== */
  function renderSales(){
    let html=`<div class="sec-intro">${esc(SALES.intro)}</div>`;
    SALES.skills.forEach(s=>{
      html+=`<div class="card"><h2>💼 ${esc(s.name)}</h2>`;
      if(s.steps) html+=`<ul>${s.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      if(s.tips) html+=`<div class="box tip"><span class="bt">نصيحة</span>${esc(s.tips)}</div>`;
      if(s.example) html+=`<div class="box success"><span class="bt">مثال</span>${esc(s.example)}</div>`;
      if(s.types) html+=`<div class="table-wrap"><table><tr><th>النوع</th><th>كيف تتعامل معه</th></tr>${s.types.map(t=>`<tr><td><b>${esc(t.type)}</b></td><td>${esc(t.handle)}</td></tr>`).join('')}</table></div>`;
      if(s.techniques) html+=`<ul>${s.techniques.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      if(s.rules) html+=`<ul>${s.rules.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      if(s.actions) html+=`<ul>${s.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      html+=`</div>`;
    });
    html+=`<div class="card"><h2>🎬 سيناريوهات تدريب حقيقية</h2>`;
    SALES.scenarios.forEach(sc=>{
      html+=`<div class="scenario"><h3>${esc(sc.sit)}</h3><div class="say"><b>قل/افعل:</b> ${esc(sc.say)}</div></div>`;
    });
    html+=`</div>`;
    return html;
  }

  /* ========== المال ========== */
  function renderMoney(){
    const m=MONEY;
    let html=`<div class="sec-intro">${esc(m.intro)}</div>`;
    html+=`<div class="card"><h2>💵 كيف أوزع راتبي</h2><div class="table-wrap"><table><tr><th>النسبة</th><th>البند</th><th>التفصيل</th></tr>${m.salarySplit.map(x=>`<tr><td><b>${x.pct}</b></td><td>${esc(x.name)}</td><td>${esc(x.detail)}</td></tr>`).join('')}</table></div><div class="box info"><span class="bt">ملاحظة</span>${esc(m.note)}</div></div>`;
    html+=`<div class="card"><h2>🏦 كيف أوفر رأس المال</h2><ul>${m.capital.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    html+=`<div class="card"><h2>📈 متى أبدأ الاستثمار</h2><ul>${m.invest.map(x=>`<li><b>${esc(x.when)}</b> — ${esc(x.what)}</li>`).join('')}</ul></div>`;
    html+=`<div class="card"><h2>📦 متى أشتري البضاعة</h2><p>${esc(m.buyStock)}</p></div>`;
    html+=`<div class="card"><h2>🏪 متى أفتح المشروع</h2><p>${esc(m.openShop)}</p></div>`;
    html+=`<div class="card"><h2>🧮 كيف أحسب الأرباح</h2><ul>${m.profitCalc.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    html+=`<div class="card"><h2>📉 كيف أحسب الخسائر</h2><ul>${m.lossCalc.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    html+=`<div class="card"><h2>🚀 متى أتوسع</h2><ul>${m.expand.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    html+=`<div class="card"><h2>🕌 الزكاة</h2><ul>${m.zaka.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return html;
  }

  /* ========== المشروع ========== */
  function renderProject(){
    const p=PROJECT;
    const card=(t,icon,arr)=>`<div class="card"><h2>${icon} ${t}</h2><ul>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    return `<div class="sec-intro">دليل تنفيذي خطوة بخطوة لبناء مشروعك، من الفكرة حتى التوسع.</div>
      ${card('كيف أختار فكرة المشروع','💡',p.idea)}
      ${card('كيف أدرس السوق','🔍',p.marketStudy)}
      <div class="card"><h2>✅ كيف أعرف أن الفكرة ناجحة</h2><p>${esc(p.validate)}</p></div>
      ${card('كيف أختار الموقع','📍',p.location)}
      ${card('كيف أتعامل مع الموردين','🤝',p.suppliers)}
      ${card('كيف أستورد','✈️',p.import)}
      ${card('كيف أحدد الأسعار','🏷️',p.pricing)}
      ${card('كيف أختار المنتجات','🎯',p.chooseProducts)}
      <div class="card"><h2>🐣 كيف أبدأ برأس مال صغير</h2><ul>${p.smallCapital.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>🛡️ كيف أقلل المخاطر</h2><ul>${p.reduceRisk.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>🌍 كيف أوسع المشروع</h2><ul>${p.scale.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }

  /* ========== السمعة ========== */
  function renderReputation(){
    let html=`<div class="sec-intro">${esc(REPUTATION.intro)}</div>`;
    REPUTATION.points.forEach(p=>{
      html+=`<div class="card"><h2>⭐ ${esc(p.title)}</h2><p>${esc(p.body)}</p></div>`;
    });
    return html;
  }

  /* ========== الأخطاء (100) ========== */
  function renderMistakes(){
    let html=`<div class="sec-intro">أكبر ${MISTAKES.length} خطأ يقع فيها رواد الأعمال المبتدئون، وكيف تتجنبها. اقرأها قبل أي قرار كبير.</div>
      <div class="search-box"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 10-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z"/></svg><input id="errSearch" type="search" placeholder="ابحث في الأخطاء..."></div>
      <div id="errList">${renderMistakeList(MISTAKES)}</div>`;
    return html;
  }
  function renderMistakeList(arr){
    return arr.map((m)=>{
      const mIdx = MISTAKES.indexOf(m);
      const isFav = favorites.includes(mIdx);
      return `<div class="error-item" id="err-${mIdx}">
      <div class="et" style="justify-content:space-between">
        <div style="display:flex;gap:8px;align-items:flex-start">
          <span class="num">${mIdx+1}</span><span>${esc(m.err)}</span>
        </div>
        <button class="icon-btn fav-btn ${isFav?'active':''}" data-idx="${mIdx}" style="color:${isFav?'var(--amber)':'var(--text-mute)'};background:transparent;">
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
      </div>
      <div class="sol"><b>✔ الحل:</b> ${esc(m.fix)}</div></div>`;
    }).join('');
  }
  function bindMistakesSearch(){
    const inp=$('#errSearch'); if(!inp) return;
    inp.addEventListener('input',()=>{
      const q=inp.value.trim();
      const filtered = q? MISTAKES.filter(m=>m.err.includes(q)||m.fix.includes(q)) : MISTAKES;
      $('#errList').innerHTML = filtered.length? renderMistakeList(filtered) : '<p style="text-align:center;color:var(--text-mute);padding:20px">لا توجد نتائج</p>';
    });
  }

  /* ========== الكتب ========== */
  function renderBooks(){
    let html=`<div class="sec-intro">${esc(BOOKS.intro)}</div>`;
    BOOKS.stages.forEach(st=>{
      html+=`<div class="card"><h2>📚 ${esc(st.stage)}</h2>`;
      st.books.forEach((b,i)=>{
        html+=`<div class="item-card"><span class="rank">${i+1}</span><div class="body">
          <h4>${esc(b.t)}</h4>
          <div class="meta"><span class="tag stage">${esc(b.why)}</span></div>
          <div class="desc">${esc(b.benefit)}</div></div></div>`;
      });
      html+=`</div>`;
    });
    return html;
  }

  /* ========== الدورات ========== */
  function renderCourses(){
    let html=`<div class="sec-intro">أفضل الدورات المجانية والمدفوعة عالمياً ومحلياً. ابدأ بالمجاني أولاً.</div>`;
    html+=`<div class="card"><h2>🆓 دورات مجانية</h2>`;
    COURSES.free.forEach((c,i)=>{
      html+=`<div class="item-card"><span class="rank c-green" style="background:var(--green)">${i+1}</span><div class="body">
        <h4>${esc(c.t)}</h4><div class="meta">${esc(c.p)} <span class="tag free">مجاني</span></div>
        <div class="desc">${esc(c.why)}</div></div></div>`;
    });
    html+=`</div><div class="card"><h2>💳 دورات مدفوعة</h2>`;
    COURSES.paid.forEach((c,i)=>{
      html+=`<div class="item-card"><span class="rank c-amber" style="background:var(--amber)">${i+1}</span><div class="body">
        <h4>${esc(c.t)}</h4><div class="meta">${esc(c.p)} <span class="tag paid">مدفوع</span></div>
        <div class="desc">${esc(c.why)}</div></div></div>`;
    });
    html+=`</div><div class="box tip"><span class="bt">نصيحة</span>${esc(COURSES.note)}</div>`;
    return html;
  }

  /* ========== الذكاء الاصطناعي ========== */
  function renderAI(){
    let html=`<div class="sec-intro">${esc(AI.intro)}</div>`;
    AI.uses.forEach(u=>{
      html+=`<div class="card"><h2>🤖 ${esc(u.area)}</h2><ul>${u.how.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    });
    html+=`<div class="box danger"><span class="bt">⚠ تنبيه مهم</span>${esc(AI.warning)}</div>`;
    return html;
  }

  /* ========== العادات ========== */
  function renderHabits(){
    const h=HABITS;
    const list=arr=>arr.map(x=>`<li>${esc(x)}</li>`).join('');
    return `<div class="sec-intro">نظام عادات يومي متكامل. التزم به 90 يوماً يصبح جزءاً منك.</div>
      <div class="routine-block">
        <div class="routine morning"><h4>🌅 الصباح</h4><ul>${list(h.morning)}</ul></div>
        <div class="routine work"><h4>🛠️ أثناء العمل</h4><ul>${list(h.atWork)}</ul></div>
        <div class="routine evening"><h4>🌆 بعد العمل</h4><ul>${list(h.afterWork)}</ul></div>
        <div class="routine night"><h4>🌙 قبل النوم</h4><ul>${list(h.night)}</ul></div>
      </div>
      <div class="card"><h2>📅 عادات أسبوعية</h2><ul>${list(h.weekly)}</ul></div>
      <div class="card"><h2>🗓️ عادات شهرية</h2><ul>${list(h.monthly)}</ul></div>`;
  }

  /* ========== لوحة المتابعة ========== */
  function renderDashboard(){
    const total=countAllChecks();
    const done=Object.values(checked).filter(Boolean).length;
    const pct=total?Math.round(done/total*100):0;
    const circ=2*Math.PI*60;
    const off=circ-(pct/100)*circ;

    const checks=(arr,prefix)=>arr.map((x,i)=>{
      const id=`${prefix}_${i}`;
      return `<label class="check-item ${checked[id]?'done':''}" data-id="${id}">
        <span class="chk"><svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5L20 7"/></svg></span>
        <span class="txt">${esc(x)}</span></label>`;
    }).join('');

    const kpis=DASHBOARD.kpis.map(k=>`<div class="kpi"><div class="v">📊</div><div class="l"><b>${esc(k.k)}</b><br><span style="color:var(--teal-600)">${esc(k.target)}</span><br>${esc(k.how)}</div></div>`).join('');

    return `
      <div class="card">
        <div class="progress-ring-wrap">
          <div class="progress-ring">
            <svg width="150" height="150">
              <circle cx="75" cy="75" r="60" stroke="var(--surface-2)" stroke-width="12" fill="none"/>
              <circle cx="75" cy="75" r="60" stroke="var(--teal-600)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/>
            </svg>
            <div class="pct"><span class="n">${pct}%</span><span class="l">${done}/${total} مكتمل</span></div>
          </div>
        </div>
      </div>
      <div class="card goal-section"><h3>☀️ أهداف يومية</h3>${checks(DASHBOARD.daily,'d')}</div>
      <div class="card goal-section"><h3>📅 أهداف أسبوعية</h3>${checks(DASHBOARD.weekly,'w')}</div>
      <div class="card goal-section"><h3>🗓️ أهداف شهرية</h3>${checks(DASHBOARD.monthly,'m')}</div>
      <div class="card goal-section"><h3>📆 أهداف ربع سنوية</h3>${checks(DASHBOARD.quarterly,'q')}</div>
      <div class="card goal-section"><h3>🎯 أهداف سنوية</h3>${checks(DASHBOARD.yearly,'y')}</div>
      <div class="card">
        <h3>📈 مؤشرات الأداء (KPIs)</h3>
        <p style="font-size:13px;color:var(--text-soft);margin-bottom:10px">راقب هذه الأرقام لقياس تقدم مشروعك.</p>
        <div class="kpi-grid">${kpis}</div>
      </div>
      <div class="box success"><span class="bt">نصيحة المتابعة</span>راجع لوحتك مساء كل يوم، وعدّل أهدافك نهاية كل أسبوع. الانتظام الصغير يصنع الإنجاز الكبير.</div>`;
  }
  function bindDashboardEvents(){
    $$('.check-item').forEach(el=>el.addEventListener('click',e=>{
      e.preventDefault();
      const id=el.dataset.id;
      checked[id]=!checked[id];
      store.set('re_checks',checked);
      el.classList.toggle('done',checked[id]);
      // تحديث النسبة
      const total=countAllChecks();
      const done=Object.values(checked).filter(Boolean).length;
      const pct=total?Math.round(done/total*100):0;
      const ring=$('.progress-ring circle:nth-child(2)');
      if(ring){const circ=2*Math.PI*60; ring.setAttribute('stroke-dashoffset', circ-(pct/100)*circ);}
      const num=$('.progress-ring .n'); if(num) num.textContent=pct+'%';
      const lbl=$('.progress-ring .l'); if(lbl) lbl.textContent=`${done}/${total} مكتمل`;
    }));
  }

  /* ========== الحالات العملية ========== */
  function renderScenarios(){
    let html=`<div class="sec-intro">${SCENARIOS.length} سيناريو واقعياً قد تواجهها يومياً في المحل، مع أفضل طريقة للتعامل مع كل منها. تدرب عليها عقلياً قبل مواجهتها.</div>`;
    SCENARIOS.forEach((s,i)=>{
      html+=`<div class="scenario"><h3>${i+1}. ${esc(s.title)}</h3>
        <div class="sit"><b>الموقف:</b> ${esc(s.situation)}</div>
        <h4 style="font-size:13px;color:var(--teal-700);margin:8px 0 4px">أفضل طريقة:</h4>
        <ul style="margin-bottom:8px">${s.approach.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>
        <div class="say"><b>قلها:</b> ${esc(s.say)}</div></div>`;
    });
    return html;
  }

  /* ========== المستقبل ========== */
  function renderFuture(){
    const f=FUTURE;
    return `<div class="sec-intro">عند وصولك لنهاية السنوات الثلاث، هذه حصيلة ما يجب أن تكون عليه والخطة لما بعدها.</div>
      <div class="card"><h2>🎓 ماذا يجب أن تكون قد تعلمت</h2><ul>${f.learned.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>🏅 المهارات التي تتقنها</h2><ul>${f.mastered.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>💰 رأس المال المتوقع</h2><ul>${f.capital.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>🏪 هل تفتح المشروع؟</h2>
        <div class="box success"><span class="bt">نعم إذا:</span>${esc(f.openShop.yes)}</div>
        <div class="box danger"><span class="bt">أجّل إذا:</span>${esc(f.openShop.no)}</div></div>
      <div class="card"><h2>💼 هل تستمر موظفاً؟</h2><ul>${f.stayEmployee.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>🚀 هل تتوسع؟</h2><ul>${f.expand.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h2>🗺️ الخطة للخمس سنوات التالية (4-8)</h2>
        <div class="table-wrap"><table><tr><th>السنة</th><th>الهدف</th></tr>${f.nextFive.map(x=>`<tr><td><b>${esc(x.y)}</b></td><td>${esc(x.goal)}</td></tr>`).join('')}</table></div></div>
      <div class="hero" style="margin-top:16px"><h1>🌟 كلمة أخيرة</h1><p style="color:#fff;line-height:2">${esc(f.final)}</p></div>`;
  }

  /* ---------- Service Worker ---------- */
  function registerSW(){
    if('serviceWorker' in navigator){
      window.addEventListener('load',()=>{
        navigator.serviceWorker.register('sw.js').catch(()=>{});
      });
    }
  }

  /* ========== دفتر الأفكار ========== */
  function renderNotebook(){
    let html = `<div class="sec-intro">دون أفكارك وملاحظاتك هنا. جميع الملاحظات تُحفظ على جهازك فقط بشكل آمن.</div>`;
    html += `<div class="card" style="margin-bottom:16px;">
      <textarea id="newNoteTxt" placeholder="اكتب فكرتك أو ملاحظتك هنا..." rows="3" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:inherit;resize:vertical;outline:none;margin-bottom:10px;"></textarea>
      <button id="addNoteBtn" class="btn-primary" style="width:auto;">حفظ الملاحظة</button>
    </div>`;
    html += `<div id="notesList">`;
    if(notes.length===0){
      html += `<p style="text-align:center;color:var(--text-mute);padding:20px;">لا توجد ملاحظات حالياً.</p>`;
    } else {
      notes.forEach((n, i) => {
        html += `<div class="card" style="position:relative;padding-bottom:10px;margin-bottom:10px;">
          <p style="white-space:pre-wrap;margin-bottom:8px;font-size:14.5px;">${esc(n.text)}</p>
          <span style="font-size:11px;color:var(--text-mute)">${esc(n.date)}</span>
          <button class="icon-btn del-note-btn" data-idx="${i}" style="position:absolute;top:10px;left:10px;width:32px;height:32px;color:var(--rose);background:rgba(225,29,72,.1);">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>`;
      });
    }
    html += `</div>`;
    return html;
  }
  function bindNotebookEvents(){
    $('#addNoteBtn')?.addEventListener('click', ()=>{
      const t = $('#newNoteTxt').value.trim();
      if(!t) return;
      notes.unshift({text: t, date: new Date().toLocaleDateString('ar-SA')});
      store.set('re_notes', notes);
      toast('تم الحفظ 📓');
      $('#content').innerHTML = renderNotebook();
      bindNotebookEvents();
    });
    $$('.del-note-btn').forEach(b => b.addEventListener('click', (e)=>{
      if(!confirm('حذف الملاحظة؟')) return;
      const idx = parseInt(e.currentTarget.dataset.idx);
      notes.splice(idx, 1);
      store.set('re_notes', notes);
      $('#content').innerHTML = renderNotebook();
      bindNotebookEvents();
    }));
  }

  /* ========== المفضلة ========== */
  function renderFavorites(){
    let html = `<div class="sec-intro">الأخطاء والمقالات التي قمت بتفضيلها للرجوع إليها سريعاً.</div>`;
    const favMistakes = MISTAKES.filter((m,i)=>favorites.includes(i));
    if(favMistakes.length===0){
      html += `<p style="text-align:center;color:var(--text-mute);padding:20px;">لا يوجد شيء في المفضلة حالياً.</p>`;
    } else {
      html += `<div id="errList">${renderMistakeList(favMistakes)}</div>`;
    }
    return html;
  }

  // تفويض النقر على بطاقات الرئيسية وأزرار المفضلة
  document.addEventListener('click', e=>{
    const go=e.target.closest('[data-go]');
    if(go){ navigate(go.dataset.go); }
    // الأكورديون
    const acc=e.target.closest('.acc-head');
    if(acc){ acc.parentElement.classList.toggle('open'); }
    // المفضلة
    const favBtn = e.target.closest('.fav-btn');
    if(favBtn){
      const idx = parseInt(favBtn.dataset.idx);
      if(favorites.includes(idx)){
        favorites = favorites.filter(id => id !== idx);
        favBtn.classList.remove('active');
        favBtn.style.color = 'var(--text-mute)';
        toast('تم الإزالة من المفضلة 🗑️');
      } else {
        favorites.push(idx);
        favBtn.classList.add('active');
        favBtn.style.color = 'var(--amber)';
        toast('تمت الإضافة للمفضلة ⭐');
      }
      store.set('re_favs', favorites);
      if(currentRoute==='favorites') {
        $('#content').innerHTML = renderFavorites();
      }
    }
  });

})();
