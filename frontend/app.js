// ============================================================
// CARIA IA – app.js
// ============================================================
const API_URL = '/api';

let token = localStorage.getItem('caria_token');
let currentUser = null;
let charts = {};
let allTransactions = [];
let allCategories = [];
let selectedMonth = new Date().getMonth(); // 0-11
let selectedYear  = new Date().getFullYear();

const MONTHS_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const CATEGORIES_DEFAULT = [
  { name:'Moradia',      icon:'ph-house',           color:'#7B2FBE' },
  { name:'Comunicação',  icon:'ph-device-mobile',   color:'#00D4FF' },
  { name:'Alimentação',  icon:'ph-fork-knife',       color:'#FF006E' },
  { name:'Transporte',   icon:'ph-car',              color:'#FFB703' },
  { name:'Saúde',        icon:'ph-heart-pulse',      color:'#00FF88' },
  { name:'Pessoais',     icon:'ph-person',           color:'#9B5DE5' },
  { name:'Educação',     icon:'ph-graduation-cap',   color:'#00D4FF' },
  { name:'Lazer',        icon:'ph-game-controller',  color:'#FF4444' },
  { name:'Serv. Fin.',   icon:'ph-bank',             color:'#FFB703' },
  { name:'Empresa',      icon:'ph-briefcase',        color:'#7B2FBE' },
  { name:'Dependentes',  icon:'ph-users',            color:'#00FF88' },
  { name:'Diversos',     icon:'ph-dots-three-circle',color:'#A0A0C0' }
];

// ---- DOM refs ----
const authView   = document.getElementById('auth-view');
const appView    = document.getElementById('app-view');
const pageContent= document.getElementById('page-content');

// ---- Helper: show/hide views ----
function showView(v) {
  authView.style.display = v === 'auth' ? 'flex' : 'none';
  appView.style.display  = v === 'app'  ? 'flex' : 'none';
}

// ============================================================
// INIT
// ============================================================
async function init() {
  setupTheme();
  setupAuth();
  setupNav();
  setupMonthSelector();
  setupSidebar();
  setupTxModal();
  setupAvatarUpload();

  document.getElementById('logout-btn').addEventListener('click', logout);

  // No modo Cookie-based, sempre tentamos carregar o usuário no início
  await loadUser();

  // Polling para atualização automática do Dashboard (a cada 5 min)
  setInterval(() => {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav && activeNav.dataset.page === 'dashboard' && currentUser) {
      console.log('Auto-refreshing Dashboard...');
      renderDashboard();
    }
  }, 5 * 60 * 1000);
}

// ============================================================
// THEME
// ============================================================
function setupTheme() {
  const saved = localStorage.getItem('caria_theme') || 'dark';
  applyTheme(saved);
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('caria_theme', t);
  const icon  = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon)  icon.className  = t === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
  if (label) label.textContent= t === 'dark' ? 'Tema Claro' : 'Tema Escuro';
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    // re-render current page
    const active = document.querySelector('.nav-item.active');
    if (active) loadPage(active.dataset.page);
  });
});

// ============================================================
// SIDEBAR MOBILE
// ============================================================
function setupSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  let overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}

// ============================================================
// AUTH
// ============================================================
function setupAuth() {
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm   = document.getElementById('login-form');
  const regForm     = document.getElementById('register-form');

  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    loginForm.style.display = 'flex'; regForm.style.display = 'none';
  });
  tabRegister?.addEventListener('click', () => {
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    regForm.style.display = 'flex'; loginForm.style.display = 'none';
  });

  // Toggle Password Visibility
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.target;
      const input = document.getElementById(inputId);
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'ph ph-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'ph ph-eye';
      }
    });
  });

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type=submit]');
    btn.disabled = true;
    const sp = btn.querySelector('span');
    if (sp) sp.textContent = 'Entrando...';
    try {
      const data = await apiCall('/auth/token', 'POST',
        { username: document.getElementById('email').value,
          password: document.getElementById('password').value }, true);
      // O token agora é gerenciado via HTTP-Only cookies pelo backend
      await loadUser();
    } catch(err) {
      alert('E-mail ou senha inválidos: ' + (err.message||''));
      btn.disabled = false;
      if (sp) sp.textContent = 'Entrar na conta';
    }
  });

  regForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = regForm.querySelector('button[type=submit]');
    btn.disabled = true;
    const sp = btn.querySelector('span');
    if (sp) sp.textContent = 'Criando...';
    const email    = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const fullName = document.getElementById('reg-name').value;
    try {
      // Backend expects full_name
      await apiCall('/auth/register', 'POST', {
        full_name: fullName,
        email,
        password
      });
      // Auto-login after register
      const data = await apiCall('/auth/token', 'POST', { username: email, password }, true);
      // O token agora é gerenciado via HTTP-Only cookies pelo backend
      await loadUser();
    } catch(err) {
      alert('Erro ao criar conta: ' + (err.message||''));
      btn.disabled = false;
      if (sp) sp.textContent = 'Criar minha conta';
    }
  });
}

// ============================================================
// API SERVICE (Centralized & Cached)
// ============================================================
const apiService = {
  cache: {},
  
  async request(endpoint, method = 'GET', body = null, isForm = false, useCache = false) {
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body)}`;
    
    if (useCache && method === 'GET' && this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Mostra loading global se necessário (pode ser expandido futuramente)
    document.body.classList.add('loading');

    try {
      const opts = { method, headers: {} };
      if (token) opts.headers['Authorization'] = `Bearer ${token}`;
      
      if (body) {
        if (isForm) {
          opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          opts.body = new URLSearchParams(body).toString();
        } else {
          opts.headers['Content-Type'] = 'application/json';
          opts.body = JSON.stringify(body);
        }
      }

      const res = await fetch(`${API_URL}${endpoint}`, opts);
      if (res.status === 204) return null;

      let json = {};
      try {
        json = await res.json();
      } catch (e) {
        if (!res.ok) {
          const error = new Error('Servidor indisponível. Tente novamente.');
          error.status = res.status;
          throw error;
        }
      }

      if (!res.ok) {
        const error = new Error(json.detail || 'Erro na requisição');
        error.status = res.status;
        throw error;
      }

      if (useCache && method === 'GET') {
        this.cache[cacheKey] = json;
      }
      return json;

    } finally {
      document.body.classList.remove('loading');
    }
  },

  clearCache() {
    this.cache = {};
  }
};

// Mantemos apiCall por retrocompatibilidade, mas roteando para o novo serviço
async function apiCall(endpoint, method = 'GET', body = null, isForm = false) {
  return apiService.request(endpoint, method, body, isForm);
}

// ============================================================
// USER
// ============================================================
async function loadUser() {
  try {
    currentUser = await apiCall('/auth/me');
    // Normalise: backend stores full_name, expose as name
    if (!currentUser.name && currentUser.full_name) {
      currentUser.name = currentUser.full_name;
    }
    allCategories = await apiCall('/categories/');
    showView('app');
    updateHeader();
    await refreshHeaderStats();
    
    // Se estávamos em alguma página específica, mantém nela. Senão, vai para o dashboard.
    const active = document.querySelector('.nav-item.active');
    if (!active) loadPage('dashboard');
    else loadPage(active.dataset.page);

  } catch(e) {
    console.error('loadUser error:', e);
    // 401 = Token expirado ou inválido -> Logout real
    if (e.status === 401) {
      logout();
    } else {
      // Se for erro de rede (status undefined) ou 5xx (servidor reiniciando)
      // Não deslogamos o usuário. Se ele já estava no app, deixamos ele lá.
      // Se é o primeiro carregamento e falhou, mostramos uma tela de "reconectando" em vez de login.
      console.log('Servidor offline ou erro de rede. Mantendo estado atual.');
      if (!currentUser) {
        // Se realmente não temos sessão inicial e o servidor não responde,
        // esperamos um pouco ou mostramos erro, mas EVITAMOS forçar o login
        // a menos que saibamos que o token é inválido.
        if (e.status >= 400 && e.status < 500) {
           showView('auth');
        } else {
           // Servidor fora do ar (5xx ou Network Error)
           document.body.innerHTML = `
             <div style="height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg); color:var(--text);">
               <i class="ph ph-warning-circle" style="font-size:48px; color:var(--warning); margin-bottom:16px;"></i>
               <h2>Caria IA está reiniciando...</h2>
               <p class="text-muted">Aguarde um instante, estamos voltando online.</p>
               <button class="btn-primary mt-4" onclick="location.reload()">Tentar novamente</button>
             </div>
           `;
        }
      }
    }
  }
}

async function logout() {
  try {
    await apiCall('/auth/logout', 'POST');
  } catch (e) {}
  token = null; currentUser = null;
  localStorage.removeItem('caria_token'); // Limpamos apenas por desencargo
  showView('auth');
}

function updateHeader() {
  if (!currentUser) return;
  const initials = (currentUser.name || 'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    if (currentUser.profile_picture) {
      avatar.innerHTML = `<img src="${currentUser.profile_picture}?t=${Date.now()}" alt="avatar">`;
    } else {
      avatar.textContent = initials;
    }
  }
  const nameEl = document.getElementById('user-name-display');
  if (nameEl) nameEl.textContent = currentUser.name || 'Usuário';
  updateMonthLabel();
}

// ============================================================
// MONTH SELECTOR
// ============================================================
function setupMonthSelector() {
  document.getElementById('prev-month')?.addEventListener('click', () => {
    selectedMonth--;
    if (selectedMonth < 0) { selectedMonth = 11; selectedYear--; }
    updateMonthLabel();
    refreshHeaderStats();
  });
  document.getElementById('next-month')?.addEventListener('click', () => {
    selectedMonth++;
    if (selectedMonth > 11) { selectedMonth = 0; selectedYear++; }
    updateMonthLabel();
    refreshHeaderStats();
  });
}

function updateMonthLabel() {
  const el = document.getElementById('month-label');
  if (el) el.textContent = `${MONTHS_PT[selectedMonth]} ${selectedYear}`;
}

async function refreshHeaderStats() {
  try {
    const txs = await apiCall('/transactions/');
    allTransactions = txs;
    const mTxs = txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const income  = mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0);
    const expense = mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
    const balance = (currentUser?.balance || 0) + income - expense;
    document.getElementById('header-income').textContent  = fmtBRL(income);
    document.getElementById('header-expense').textContent = fmtBRL(expense);
    const balEl = document.getElementById('header-balance');
    balEl.textContent = fmtBRL(balance);
    balEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
  } catch(e) {}
}

// ============================================================
// NAV
// ============================================================
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const page = a.dataset.page;
      
      // Sincroniza estado ativo em todos os menus (sidebar e bottom-nav)
      document.querySelectorAll('.nav-item').forEach(x => {
        if (x.dataset.page === page) x.classList.add('active');
        else x.classList.remove('active');
      });
      
      // Fecha sidebar mobile se estiver aberta
      document.querySelector('.sidebar')?.classList.remove('open');
      document.querySelector('.sidebar-overlay')?.classList.remove('open');
      
      loadPage(page);
    });
  });
}

async function loadPage(page) {
  // Destroy charts
  Object.values(charts).forEach(c => { try{c.destroy();}catch(e){} });
  charts = {};
  pageContent.innerHTML = `<div class="spinner"><i class="ph ph-spinner-gap"></i></div>`;
  try {
    switch(page) {
      case 'dashboard':    await renderDashboard(); break;
      case 'transactions': await renderTransactions(); break;
      case 'cards':        await renderCards(); break;
      case 'investments':  await renderInvestments(); break;
      case 'goals':        await renderGoals(); break;
      case 'bills':        await renderBills(); break;
      case 'advisor':      await renderAdvisor(); break;
      case 'reports':      await renderReports(); break;
      case 'gamification': await renderGamification(); break;
      case 'profile':      await renderProfile(); break;
      default:             await renderDashboard();
    }
  } catch(err) {
    console.error(err);
    pageContent.innerHTML = `<div class="card"><p class="text-danger">Erro ao carregar: ${err.message}</p></div>`;
  }
}

// ============================================================
// TX MODAL
// ============================================================
function setupTxModal() {
  const overlay = document.getElementById('tx-modal-overlay');
  document.getElementById('open-tx-modal')?.addEventListener('click', openTxModal);
  document.getElementById('close-tx-modal')?.addEventListener('click', () => overlay.classList.remove('open'));
  overlay?.addEventListener('click', e => { if(e.target===overlay) overlay.classList.remove('open'); });

  document.getElementById('transaction-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    
    // Validations
    const amountVal = document.getElementById('tx-amount').value;
    const amount = parseFloat(amountVal);
    const desc = document.getElementById('tx-desc').value.trim();
    const categoryId = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;

    if (isNaN(amount) || amount <= 0) {
      return alert('O valor da transação deve ser positivo.');
    }
    if (!desc) {
      return alert('Por favor, insira uma descrição.');
    }
    if (!categoryId) {
      return alert('Escolha uma categoria.');
    }
    if (!date) {
      return alert('Selecione uma data válida.');
    }

    const type = document.querySelector('input[name="tx-type"]:checked')?.value || 'expense';
    const body = {
      type,
      amount,
      description: desc,
      category_id: parseInt(categoryId),
      date,
      is_recurring: document.getElementById('tx-recurring').checked,
      card_id: document.getElementById('tx-card').value ? parseInt(document.getElementById('tx-card').value) : null
    };
    
    try {
      await apiCall('/transactions/', 'POST', body);
      apiService.clearCache(); // Limpa cache para refletir mudanças
      overlay.classList.remove('open');
      await refreshHeaderStats();
      const active = document.querySelector('.nav-item.active');
      if (active) loadPage(active.dataset.page);
    } catch(err) { 
      alert('Erro ao salvar: ' + err.message); 
    }
  });
}

async function openTxModal() {
  const overlay = document.getElementById('tx-modal-overlay');
  overlay.classList.add('open');
  // set today
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  // fill categories
  const catSel = document.getElementById('tx-category');
  catSel.innerHTML = allCategories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  // fill cards
  try {
    const cards = await apiCall('/cards/');
    const cardSel = document.getElementById('tx-card');
    cardSel.innerHTML = '<option value="">Nenhum</option>' + cards.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  } catch(e) {}
}

// ============================================================
// AVATAR UPLOAD
// ============================================================
function setupAvatarUpload() {
  document.getElementById('user-avatar')?.addEventListener('click', () =>
    document.getElementById('profile-pic-input')?.click());
  document.getElementById('profile-pic-input')?.addEventListener('change', async e => {
    if (!e.target.files.length) return;
    const fd = new FormData();
    fd.append('file', e.target.files[0]);
    try {
      const res = await fetch(`${API_URL}/auth/me/profile-picture`, {
        method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:fd
      });
      const u = await res.json();
      currentUser.profile_picture = u.profile_picture;
      updateHeader();
    } catch(err) { alert('Erro ao enviar foto.'); }
  });
}

// ============================================================
// UTILS
// ============================================================
function fmtBRL(v) {
  return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtPct(v) { return (v||0).toFixed(1) + '%'; }
function monthTxs(txs) {
  return txs.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });
}
function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid:  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text:  isDark ? '#A0A0C0' : '#5050A0',
    bg:    isDark ? '#12122A' : '#FFFFFF'
  };
}
function categoryColor(catName) {
  const found = CATEGORIES_DEFAULT.find(c => catName?.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]));
  return found ? found.color : '#7B2FBE';
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard() {
  const txs = await apiCall('/transactions/');
  allTransactions = txs;
  await refreshHeaderStats();

  const mTxs    = monthTxs(txs);
  const income  = mTxs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = mTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance = (currentUser?.balance||0) + income - expense;

  // Category spend map
  const catSpend = {};
  mTxs.filter(t=>t.type==='expense').forEach(t => {
    const n = t.category_name || t.category || 'Diversos';
    catSpend[n] = (catSpend[n]||0) + t.amount;
  });

  // Budget map
  const budgets = {};
  try {
    const bList = await apiCall('/budgets/');
    bList.forEach(b => { budgets[b.category_name||b.name] = b.limit; });
  } catch(e){}

  // Fetch AI health score quietly
  let healthScore = currentUser?.health_score || 0;
  try { const hs = await apiCall('/ai/health-score'); healthScore = hs.score; } catch(e){}

  // IBOVESPA ticker
  let ibovHtml = '';
  try {
    const ibov = await fetch('https://brapi.dev/api/quote/%5EBVSP').then(r=>r.json());
    const q = ibov?.results?.[0];
    if(q) {
      const chg = q.regularMarketChangePercent || 0;
      ibovHtml = `<div class="ticker-bar">
        <div class="ticker-item"><span class="ticker-name text-accent">IBOVESPA</span>
          <span class="ticker-val">${(q.regularMarketPrice||0).toLocaleString('pt-BR')}</span>
          <span class="${chg>=0?'text-success':'text-danger'}">${chg>=0?'+':''}${chg.toFixed(2)}%</span>
        </div>
        <div class="ticker-item text-muted" style="font-size:11px;">Atualizado agora • brapi.dev</div>
      </div>`;
    }
  } catch(e){}

  // Category circles
  const catGridHtml = CATEGORIES_DEFAULT.map(cat => {
    const spent   = catSpend[cat.name] || 0;
    const budget  = budgets[cat.name] || 0;
    const pct     = budget > 0 ? Math.min((spent/budget)*100, 150) : 0;
    const circum  = 2 * Math.PI * 26;
    const dash    = circum * (Math.min(pct,100)/100);
    const color   = pct > 100 ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : cat.color;
    return `<div class="cat-card">
      <div class="cat-icon-ring">
        <svg class="cat-ring-svg" viewBox="0 0 60 60">
          <circle class="cat-ring-bg" cx="30" cy="30" r="26"/>
          <circle class="cat-ring-fg" cx="30" cy="30" r="26"
            stroke="${color}" stroke-dasharray="${dash} ${circum}"
            stroke-dashoffset="0"/>
        </svg>
        <div class="cat-ring-inner" style="background:${color}22;">
          <i class="ph ${cat.icon}" style="color:${color};"></i>
        </div>
        ${budget>0 ? `<span class="cat-pct" style="background:${color}33;color:${color};">${pct.toFixed(0)}%</span>` : ''}
      </div>
      <span class="cat-name">${cat.name}</span>
      <span class="cat-amount" style="color:${color};">${fmtBRL(spent)}</span>
    </div>`;
  }).join('');

  // Gauge config
  const budgetTotal  = Object.values(budgets).reduce((a,b)=>a+b,0);
  const budgetUsed   = budgetTotal > 0 ? Math.min((expense/budgetTotal)*100,100) : 0;
  const gaugeColor   = budgetUsed > 80 ? '#FF4444' : budgetUsed > 60 ? '#FFB703' : '#00FF88';

  // Monthly comparison bar data
  const last6 = [];
  for(let i=5;i>=0;i--) {
    let m = selectedMonth - i; let y = selectedYear;
    if(m<0){m+=12;y--;}
    const filtered = txs.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
    last6.push({
      label: MONTHS_PT[m],
      income:  filtered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),
      expense: filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),
    });
  }

  // Goals
  let goalsHtml = '<p class="text-muted">Nenhuma meta cadastrada.</p>';
  try {
    const goals = await apiCall('/goals/');
    if(goals.length) {
      const colors = ['var(--success)','var(--accent)','var(--warning)','var(--primary-l)','var(--pink)'];
      goalsHtml = goals.map((g,i)=>{
        const pct=Math.min((g.current_amount/g.target_amount)*100,100);
        return `<div class="goal-row">
          <div class="goal-label"><span>${g.name}</span><span style="color:${colors[i%colors.length]}">${pct.toFixed(0)}%</span></div>
          <div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%;background:${colors[i%colors.length]};"></div></div>
          <small class="text-muted">${fmtBRL(g.current_amount)} / ${fmtBRL(g.target_amount)}</small>
        </div>`;
      }).join('');
    }
  } catch(e){}

  // Investment profile
  let invProfileHtml = '<p class="text-muted">Sem investimentos registrados.</p>';
  let assetTotal = 0, liabilityTotal = expense;
  try {
    const invs = await apiCall('/investments/');
    if(invs.length) {
      const fixed = invs.filter(i=>i.type==='fixed').reduce((s,i)=>s+i.quantity*i.average_price,0);
      const variable = invs.filter(i=>i.type!=='fixed').reduce((s,i)=>s+i.quantity*i.average_price,0);
      const total = fixed+variable;
      assetTotal = total;
      const fixedPct = total ? (fixed/total*100).toFixed(1) : 0;
      const varPct   = total ? (variable/total*100).toFixed(1) : 0;
      const profile  = fixed/total > 0.7 ? 'Conservador' : fixed/total > 0.4 ? 'Moderado' : 'Arrojado';
      invProfileHtml = `<canvas id="inv-profile-chart" height="140"></canvas>
        <div class="text-center mt-4">
          <div class="inv-profile-badge"><i class="ph ph-shield-star"></i> ${profile}</div>
        </div>
        <div class="d-flex gap-4 mt-4" style="justify-content:center;font-size:12px;">
          <span><span style="color:var(--primary-l)">■</span> Renda Fixa ${fixedPct}%</span>
          <span><span style="color:var(--accent)">■</span> Renda Variável ${varPct}%</span>
        </div>`;
      // chart will be drawn after HTML inserted
      setTimeout(()=>{
        const ctx = document.getElementById('inv-profile-chart')?.getContext('2d');
        if(!ctx) return;
        const cc = getChartColors();
        charts['inv-profile'] = new Chart(ctx, {
          type:'doughnut',
          data:{ labels:['Renda Fixa','Renda Variável'], datasets:[{ data:[fixed,variable], backgroundColor:['var(--primary-l)','var(--accent)'], borderWidth:0 }] },
          options:{ cutout:'70%', plugins:{legend:{display:false}}, animation:{duration:800} }
        });
      },50);
    }
  } catch(e){}

  // Patrimônio
  const netWorth    = assetTotal - liabilityTotal;
  const assetPct    = (assetTotal+liabilityTotal) > 0 ? (assetTotal/(assetTotal+liabilityTotal)*100).toFixed(1) : 50;
  const liabsPct    = (100-parseFloat(assetPct)).toFixed(1);

  pageContent.innerHTML = `
    ${ibovHtml}

    <div class="section-header mb-2">
      <p class="dash-section-title">Desempenho do Mês – ${MONTHS_PT[selectedMonth]} ${selectedYear}</p>
    </div>
    <div class="category-grid mb-4">${catGridHtml}</div>

    <div class="charts-grid mb-4">
      <div class="card">
        <p class="card-title">Comparativo Mensal</p>
        <canvas id="monthly-bar-chart" height="180"></canvas>
      </div>
      <div class="card text-center">
        <p class="card-title">Orçamento</p>
        <canvas id="gauge-chart" height="110"></canvas>
        <div style="font-size:22px;font-weight:800;color:${gaugeColor};margin-top:4px;">${budgetUsed.toFixed(0)}%</div>
        <small class="text-muted">do orçamento usado</small>
        <div class="mt-4" style="font-size:12px;">
          <div class="text-danger">${fmtBRL(expense)} gastos</div>
          <div class="text-muted">de ${fmtBRL(budgetTotal)} planejados</div>
        </div>
      </div>
      <div class="card">
        <p class="card-title">Gastos por Categoria</p>
        <canvas id="cat-bar-chart" height="180"></canvas>
      </div>
    </div>

    <div class="dash-bottom-grid">
      <div class="card">
        <p class="card-title">Patrimônio</p>
        <canvas id="patrimonio-chart" height="140"></canvas>
        <div class="d-flex gap-4 mt-4" style="font-size:12px;justify-content:center;">
          <div class="text-center"><div class="text-success" style="font-size:18px;font-weight:700;">${fmtBRL(assetTotal)}</div><div class="text-muted">Ativos</div></div>
          <div class="text-center"><div style="font-size:18px;font-weight:700;color:${netWorth>=0?'var(--accent)':'var(--danger)'};">${fmtBRL(netWorth)}</div><div class="text-muted">Patrimônio Líq.</div></div>
        </div>
      </div>
      <div class="card">
        <p class="card-title">Metas / Projetos</p>
        ${goalsHtml}
      </div>
      <div class="card">
        <p class="card-title">Perfil de Investimento</p>
        ${invProfileHtml}
      </div>
    </div>

    <div class="card mt-4">
      <p class="card-title">Desempenho do Ano – Saldo Acumulado</p>
      <div class="year-chart-wrap"><canvas id="year-line-chart"></canvas></div>
    </div>
  `;

  // Render Charts
  const cc = getChartColors();

  // Monthly bar
  const mbCtx = document.getElementById('monthly-bar-chart')?.getContext('2d');
  if(mbCtx) charts['monthly-bar'] = new Chart(mbCtx, {
    type:'bar',
    data:{
      labels: last6.map(l=>l.label),
      datasets:[
        { label:'Receita',  data:last6.map(l=>l.income),  backgroundColor:'rgba(0,255,136,0.7)', borderRadius:6 },
        { label:'Despesa',  data:last6.map(l=>l.expense), backgroundColor:'rgba(255,68,68,0.7)',  borderRadius:6 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:cc.text,font:{size:11}}}},
      scales:{
        x:{grid:{color:cc.grid},ticks:{color:cc.text}},
        y:{grid:{color:cc.grid},ticks:{color:cc.text, callback:v=>'R$'+v.toLocaleString('pt-BR')}}
      }
    }
  });

  // Gauge (doughnut half)
  const gaugeCtx = document.getElementById('gauge-chart')?.getContext('2d');
  if(gaugeCtx) charts['gauge'] = new Chart(gaugeCtx, {
    type:'doughnut',
    data:{ datasets:[{ data:[budgetUsed, 100-budgetUsed], backgroundColor:[gaugeColor,'rgba(255,255,255,0.05)'], borderWidth:0 }] },
    options:{
      circumference:180, rotation:-90,
      cutout:'78%',
      plugins:{legend:{display:false},tooltip:{enabled:false}},
      animation:{duration:1000}
    }
  });

  // Cat bar horizontal
  const catNames  = Object.keys(catSpend).slice(0,8);
  const catVals   = catNames.map(n=>catSpend[n]);
  const catColors = catNames.map(n=>categoryColor(n));
  const cbCtx = document.getElementById('cat-bar-chart')?.getContext('2d');
  if(cbCtx) charts['cat-bar'] = new Chart(cbCtx, {
    type:'bar',
    data:{ labels:catNames, datasets:[{ data:catVals, backgroundColor:catColors, borderRadius:6 }] },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{color:cc.grid},ticks:{color:cc.text,callback:v=>'R$'+v.toLocaleString('pt-BR')}},
        y:{grid:{display:false},ticks:{color:cc.text}}
      }
    }
  });

  // Patrimônio doughnut
  const patCtx = document.getElementById('patrimonio-chart')?.getContext('2d');
  if(patCtx) charts['patrimonio'] = new Chart(patCtx, {
    type:'doughnut',
    data:{
      labels:['Ativos','Passivos'],
      datasets:[{ data:[parseFloat(assetPct),parseFloat(liabsPct)], backgroundColor:['var(--success)','var(--danger)'], borderWidth:0 }]
    },
    options:{ cutout:'70%', plugins:{legend:{labels:{color:cc.text}}}, animation:{duration:800} }
  });

  // Year line
  const yearData = [];
  let running = currentUser?.balance || 0;
  for(let m=0;m<12;m++) {
    const mFiltered = txs.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===selectedYear;});
    running += mFiltered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    running -= mFiltered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    yearData.push(running);
  }
  const ylCtx = document.getElementById('year-line-chart')?.getContext('2d');
  if(ylCtx) charts['year-line'] = new Chart(ylCtx, {
    type:'line',
    data:{
      labels: MONTHS_PT,
      datasets:[{ label:'Saldo Acumulado', data:yearData,
        borderColor:'var(--primary-l)', backgroundColor:'rgba(123,47,190,0.1)',
        tension:0.4, fill:true, pointBackgroundColor:'var(--primary-l)', pointRadius:4
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:cc.text}}},
      scales:{
        x:{grid:{color:cc.grid},ticks:{color:cc.text}},
        y:{grid:{color:cc.grid},ticks:{color:cc.text,callback:v=>'R$'+v.toLocaleString('pt-BR')}}
      }
    }
  });
}

// ============================================================
// TRANSACTIONS
// ============================================================
async function renderTransactions() {
  const [txs, cats] = await Promise.all([apiCall('/transactions/'),apiCall('/categories/')]);
  allTransactions = txs;
  const mTxs = monthTxs(txs);
  await refreshHeaderStats();

  pageContent.innerHTML = `
    <div class="section-header">
      <h2>Transações</h2>
      <div class="d-flex gap-2">
        <select id="tx-filter-type" class="btn-secondary" style="padding:8px 14px;">
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <select id="tx-filter-cat" class="btn-secondary" style="padding:8px 14px;">
          <option value="">Todas categorias</option>
          ${cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <label class="btn-secondary" style="cursor:pointer;" for="csv-import-input">
          <i class="ph ph-upload"></i> Importar CSV
        </label>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="tx-table">
          <thead><tr>
            <th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Ações</th>
          </tr></thead>
          <tbody id="tx-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  function renderTxRows(list) {
    const tbody = document.getElementById('tx-tbody');
    if(!tbody) return;
    tbody.innerHTML = list.map(t => `
      <tr>
        <td class="text-muted">${new Date(t.date).toLocaleDateString('pt-BR')}</td>
        <td><strong>${t.description}</strong>${t.is_recurring?' <span class="badge" style="background:rgba(0,212,255,0.15);color:var(--accent);font-size:10px;">Rec.</span>':''}</td>
        <td class="text-muted">${t.category_name||'—'}</td>
        <td><span class="badge ${t.type==='income'?'badge-income':'badge-expense'}">${t.type==='income'?'Receita':'Despesa'}</span></td>
        <td class="${t.type==='income'?'text-success':'text-danger'}" style="font-weight:700;">${fmtBRL(t.amount)}</td>
        <td><button class="icon-btn danger del-tx" data-id="${t.id}"><i class="ph ph-trash"></i></button></td>
      </tr>`).join('');
  }

  renderTxRows(mTxs);

  let filtType='', filtCat='';
  function applyFilter() {
    let f = mTxs;
    if(filtType) f = f.filter(t=>t.type===filtType);
    if(filtCat)  f = f.filter(t=>String(t.category_id)===filtCat);
    renderTxRows(f);
  }
  document.getElementById('tx-filter-type')?.addEventListener('change', e=>{ filtType=e.target.value; applyFilter(); });
  document.getElementById('tx-filter-cat')?.addEventListener('change',  e=>{ filtCat=e.target.value;  applyFilter(); });

  document.getElementById('tx-tbody')?.addEventListener('click', async e => {
    const btn = e.target.closest('.del-tx');
    if(btn) {
      if(confirm('Excluir transação?')) {
        await apiCall(`/transactions/${btn.dataset.id}`,'DELETE');
        loadPage('transactions');
      }
    }
  });

  // CSV import
  document.getElementById('csv-import-input')?.addEventListener('change', async e => {
    if(!e.target.files.length) return;
    const fd = new FormData();
    fd.append('file', e.target.files[0]);
    try {
      const res = await fetch(`${API_URL}/control/import-csv`, { method:'POST', headers:{Authorization:`Bearer ${token}`}, body:fd });
      const data = await res.json();
      alert(`Importadas ${data.imported||0} transações!`);
      loadPage('transactions');
    } catch(err) { alert('Erro ao importar: '+err.message); }
  });
}

// ============================================================
// CARDS
// ============================================================
async function renderCards() {
  const cards = await apiCall('/cards/');

  let formHtml = `<div id="cc-form-wrap" class="card mb-4" style="display:none;">
    <form id="cc-form" class="d-flex gap-4" style="flex-wrap:wrap;align-items:flex-end;">
      <div class="form-field"><label>Nome</label><input id="cc-name" type="text" placeholder="Ex: Nubank" required></div>
      <div class="form-field"><label>Limite</label><input id="cc-limit" type="number" step="0.01" required></div>
      <div class="form-field"><label>Dia Fechamento</label><input id="cc-closing" type="number" min="1" max="31" required></div>
      <div class="form-field"><label>Dia Vencimento</label><input id="cc-due" type="number" min="1" max="31" required></div>
      <button type="submit" class="btn-primary">Salvar</button>
    </form></div>`;

  let cardsHtml = cards.length ? cards.map((c,i)=>{
    const gradients = [
      'linear-gradient(135deg,#2D1B69,#7B2FBE,#00D4FF)',
      'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
      'linear-gradient(135deg,#4a0e8f,#c94b4b,#4a0e8f)',
    ];
    return `<div>
      <div class="cc-visual" style="background:${gradients[i%gradients.length]}">
        <div><div class="cc-chip"></div><div class="cc-number">**** **** **** ${String(c.id).padStart(4,'0')}</div></div>
        <div class="d-flex" style="justify-content:space-between;align-items:flex-end;">
          <div><div class="cc-name">${c.name}</div><small style="color:rgba(255,255,255,0.6);">Fecha dia ${c.closing_day} • Vence dia ${c.due_day}</small></div>
          <div class="cc-limit">Limite ${fmtBRL(c.limit)}</div>
        </div>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button class="btn-secondary" onclick="showInvoice(${c.id},'${c.name}')"><i class="ph ph-receipt"></i> Fatura</button>
        <button class="btn-danger del-card" data-id="${c.id}"><i class="ph ph-trash"></i></button>
      </div>
    </div>`;
  }).join('') : '<p class="text-muted">Nenhum cartão cadastrado.</p>';

  pageContent.innerHTML = `
    <div class="section-header"><h2>Cartões de Crédito</h2>
      <button class="btn-primary" id="new-cc-btn"><i class="ph ph-plus"></i> Novo Cartão</button>
    </div>
    ${formHtml}
    <div class="grid-3">${cardsHtml}</div>`;

  document.getElementById('new-cc-btn')?.addEventListener('click',()=>{
    const w=document.getElementById('cc-form-wrap');
    if(w) w.style.display=w.style.display==='none'?'':'none';
  });
  document.getElementById('cc-form')?.addEventListener('submit', async e=>{
    e.preventDefault();
    await apiCall('/cards/','POST',{
      name:document.getElementById('cc-name').value,
      limit:parseFloat(document.getElementById('cc-limit').value),
      closing_day:parseInt(document.getElementById('cc-closing').value),
      due_day:parseInt(document.getElementById('cc-due').value)
    });
    loadPage('cards');
  });
  document.querySelectorAll('.del-card').forEach(btn=>btn.addEventListener('click',async()=>{
    if(confirm('Excluir cartão?')){ await apiCall(`/cards/${btn.dataset.id}`,'DELETE'); loadPage('cards'); }
  }));
}
window.showInvoice = async (id,name)=>{
  try {
    const inv = await apiCall(`/cards/${id}/invoice`);
    alert(`Fatura: ${name}\nTotal gasto: ${fmtBRL(inv.invoice_total)}\nLimite disponível: ${fmtBRL(inv.available_limit)}`);
  } catch(e){ alert('Erro ao buscar fatura.'); }
};

// ============================================================
// INVESTMENTS
// ============================================================
async function renderInvestments() {
  const invs = await apiCall('/investments/');
  const totalInvested = invs.reduce((s,i)=>s+i.quantity*i.average_price,0);

  pageContent.innerHTML = `
    <div class="section-header"><h2>Investimentos</h2>
      <button class="btn-primary" id="new-inv-btn"><i class="ph ph-plus"></i> Novo Ativo</button>
    </div>
    <div id="inv-form-wrap" class="card mb-4" style="display:none;">
      <form id="inv-form" class="d-flex gap-4" style="flex-wrap:wrap;align-items:flex-end;">
        <div class="form-field"><label>Ticker</label><input id="i-ticker" style="text-transform:uppercase" placeholder="PETR4" required></div>
        <div class="form-field"><label>Tipo</label>
          <select id="i-type"><option value="stock">Ação</option><option value="fii">FII</option><option value="fixed">Renda Fixa</option></select>
        </div>
        <div class="form-field"><label>Quantidade</label><input id="i-qty" type="number" step="0.01" required></div>
        <div class="form-field"><label>Preço Médio</label><input id="i-price" type="number" step="0.01" required></div>
        <button type="submit" class="btn-primary">Salvar</button>
      </form>
    </div>
    <div class="grid-3 mb-4">
      <div class="card text-center"><p class="card-title">Total Investido</p><h2 style="font-size:26px;" id="inv-total-el">${fmtBRL(totalInvested)}</h2></div>
      <div class="card text-center"><p class="card-title">Rentabilidade</p><h2 class="text-success" id="inv-return-el">—</h2></div>
      <div class="card text-center"><p class="card-title">Cotações</p>
        <button class="btn-primary w-full mt-2" id="fetch-quotes-btn"><i class="ph ph-arrows-clockwise"></i> Atualizar (brapi.dev)</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Ticker</th><th>Tipo</th><th>Qtd</th><th>Preço Médio</th><th>Total Pago</th><th>Cotação Atual</th><th>Ações</th></tr></thead>
        <tbody id="inv-tbody">
          ${invs.map(i=>`<tr>
            <td><strong>${i.ticker}</strong></td>
            <td><span class="badge badge-pending">${i.type.toUpperCase()}</span></td>
            <td>${i.quantity}</td>
            <td>${fmtBRL(i.average_price)}</td>
            <td>${fmtBRL(i.quantity*i.average_price)}</td>
            <td id="quote-${i.ticker}" class="text-muted">—</td>
            <td><button class="icon-btn danger del-inv" data-id="${i.id}"><i class="ph ph-trash"></i></button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  document.getElementById('new-inv-btn')?.addEventListener('click',()=>{
    const w=document.getElementById('inv-form-wrap');
    if(w) w.style.display=w.style.display==='none'?'':'none';
  });
  document.getElementById('inv-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    await apiCall('/investments/','POST',{
      ticker:document.getElementById('i-ticker').value.toUpperCase(),
      type:document.getElementById('i-type').value,
      quantity:parseFloat(document.getElementById('i-qty').value),
      average_price:parseFloat(document.getElementById('i-price').value)
    });
    loadPage('investments');
  });
  document.getElementById('inv-tbody')?.addEventListener('click',async e=>{
    const btn=e.target.closest('.del-inv');
    if(btn && confirm('Remover ativo?')){ await apiCall(`/investments/${btn.dataset.id}`,'DELETE'); loadPage('investments'); }
  });

  document.getElementById('fetch-quotes-btn')?.addEventListener('click', async ()=>{
    if(!invs.length) return;
    const btn = document.getElementById('fetch-quotes-btn');
    btn.innerHTML='<i class="ph ph-spinner-gap"></i> Buscando...'; btn.disabled=true;
    try {
      const tickers = [...new Set(invs.map(i=>i.ticker))].join(',');
      const res = await fetch(`https://brapi.dev/api/quote/${tickers}`);
      const data = await res.json();
      let currentTotal=0;
      invs.forEach(i=>{
        const q = data.results?.find(r=>r.symbol===i.ticker);
        const el = document.getElementById(`quote-${i.ticker}`);
        if(q && el) {
          const price = q.regularMarketPrice;
          const val   = price * i.quantity;
          currentTotal += val;
          const chg = q.regularMarketChangePercent||0;
          el.innerHTML = `<span style="font-weight:700;">${fmtBRL(price)}</span> <small class="${chg>=0?'text-success':'text-danger'}">${chg>=0?'+':''}${chg.toFixed(2)}%</small>`;
        } else { currentTotal += i.quantity*i.average_price; }
      });
      const ret = totalInvested>0 ? ((currentTotal-totalInvested)/totalInvested*100) : 0;
      document.getElementById('inv-total-el').textContent = fmtBRL(currentTotal);
      const retEl = document.getElementById('inv-return-el');
      retEl.textContent = `${ret>=0?'+':''}${ret.toFixed(2)}%`;
      retEl.className = ret>=0 ? 'text-success' : 'text-danger';
    } catch(e){ alert('Erro ao buscar cotações.'); }
    btn.innerHTML='<i class="ph ph-arrows-clockwise"></i> Atualizar (brapi.dev)'; btn.disabled=false;
  });
}

// ============================================================
// GOALS
// ============================================================
async function renderGoals() {
  const goals = await apiCall('/goals/');
  const colors=['var(--success)','var(--accent)','var(--warning)','var(--primary-l)','var(--pink)'];
  const labels=['Reserva de Emergência','Curto Prazo','Médio Prazo','Longo Prazo','Aposentadoria'];

  pageContent.innerHTML = `
    <div class="section-header"><h2>Metas Financeiras</h2>
      <button class="btn-primary" id="new-goal-btn"><i class="ph ph-plus"></i> Nova Meta</button>
    </div>
    <div id="goal-form-wrap" class="card mb-4" style="display:none;">
      <form id="goal-form" class="d-flex gap-4" style="flex-wrap:wrap;align-items:flex-end;">
        <div class="form-field"><label>Nome da Meta</label><input id="g-name" placeholder="Ex: Viagem Europa" required></div>
        <div class="form-field"><label>Objetivo (R$)</label><input id="g-target" type="number" step="0.01" required></div>
        <div class="form-field"><label>Atual (R$)</label><input id="g-current" type="number" step="0.01" value="0"></div>
        <div class="form-field"><label>Prazo</label><input id="g-deadline" type="date"></div>
        <button type="submit" class="btn-primary">Salvar</button>
      </form>
    </div>
    <div class="grid-2">
      ${goals.map((g,i)=>{
        const pct=Math.min((g.current_amount/g.target_amount)*100,100);
        const col=colors[i%colors.length];
        const lbl=labels[i%labels.length];
        return `<div class="card">
          <div class="d-flex gap-2" style="justify-content:space-between;margin-bottom:12px;">
            <div>
              <p style="font-size:10px;color:var(--text-2);text-transform:uppercase;letter-spacing:1px;">${lbl}</p>
              <h3 style="font-size:16px;">${g.name}</h3>
            </div>
            <button class="icon-btn danger del-goal" data-id="${g.id}"><i class="ph ph-trash"></i></button>
          </div>
          <div class="d-flex gap-4 mb-2" style="justify-content:space-between;font-size:13px;">
            <span style="color:${col};font-weight:700;">${fmtBRL(g.current_amount)}</span>
            <span class="text-muted">de ${fmtBRL(g.target_amount)}</span>
          </div>
          <div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${pct}%;background:${col};"></div></div>
          <div class="d-flex gap-4 mt-2" style="justify-content:space-between;font-size:11px;">
            <span style="color:${col};font-weight:700;">${pct.toFixed(1)}%</span>
            ${g.deadline?`<span class="text-muted">até ${new Date(g.deadline).toLocaleDateString('pt-BR')}</span>`:''}
          </div>
          <form class="d-flex gap-2 mt-4 add-to-goal-form" data-id="${g.id}">
            <input type="number" step="0.01" placeholder="Adicionar R$" class="add-goal-val" style="flex:1;">
            <button type="submit" class="btn-primary" style="padding:8px 14px;"><i class="ph ph-plus"></i></button>
          </form>
        </div>`;
      }).join('')}
    </div>
    ${!goals.length?'<div class="card text-center"><p class="text-muted">Nenhuma meta cadastrada ainda.</p></div>':''}
  `;

  document.getElementById('new-goal-btn')?.addEventListener('click',()=>{
    const w=document.getElementById('goal-form-wrap');
    if(w) w.style.display=w.style.display==='none'?'':'none';
  });
  document.getElementById('goal-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    await apiCall('/goals/','POST',{
      name:document.getElementById('g-name').value,
      target_amount:parseFloat(document.getElementById('g-target').value),
      current_amount:parseFloat(document.getElementById('g-current').value||0),
      deadline:document.getElementById('g-deadline').value||null
    });
    loadPage('goals');
  });
  document.querySelectorAll('.del-goal').forEach(btn=>btn.addEventListener('click',async()=>{
    if(confirm('Excluir meta?')){ await apiCall(`/goals/${btn.dataset.id}`,'DELETE'); loadPage('goals'); }
  }));
  document.querySelectorAll('.add-to-goal-form').forEach(form=>form.addEventListener('submit',async e=>{
    e.preventDefault();
    const val=parseFloat(form.querySelector('.add-goal-val').value);
    if(isNaN(val)) return;
    const goal=goals.find(g=>g.id==parseInt(form.dataset.id));
    if(!goal) return;
    await apiCall(`/goals/${form.dataset.id}`,'PUT',{
      name:goal.name, target_amount:goal.target_amount,
      current_amount:goal.current_amount+val,
      deadline:goal.deadline
    });
    loadPage('goals');
  }));
}

// ============================================================
// BILLS
// ============================================================
async function renderBills() {
  const bills = await apiCall('/bills/');
  const today = new Date(); today.setHours(0,0,0,0);

  pageContent.innerHTML = `
    <div class="section-header"><h2>Contas a Pagar</h2>
      <button class="btn-primary" id="new-bill-btn"><i class="ph ph-plus"></i> Nova Conta</button>
    </div>
    <div id="bill-form-wrap" class="card mb-4" style="display:none;">
      <form id="bill-form" class="d-flex gap-4" style="flex-wrap:wrap;align-items:flex-end;">
        <div class="form-field"><label>Descrição</label><input id="b-desc" placeholder="Ex: Aluguel" required></div>
        <div class="form-field"><label>Valor</label><input id="b-amount" type="number" step="0.01" required></div>
        <div class="form-field"><label>Vencimento</label><input id="b-due" type="date" required></div>
        <button type="submit" class="btn-primary">Salvar</button>
      </form>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          ${bills.map(b=>{
            const dueDate=new Date(b.due_date); dueDate.setHours(0,0,0,0);
            const diff=Math.ceil((dueDate-today)/(1000*60*60*24));
            const isNear=!b.is_paid && diff>=0 && diff<=3;
            const isPast=!b.is_paid && diff<0;
            return `<tr ${isNear?'style="background:rgba(255,183,3,0.06);"':''} ${isPast?'style="background:rgba(255,68,68,0.06);"':''}>
              <td><strong>${b.description}</strong>${isNear?` <span class="badge badge-pending">Vence em ${diff}d</span>`:''}${isPast?` <span class="badge badge-expense">Vencida</span>`:''}</td>
              <td class="text-danger" style="font-weight:700;">${fmtBRL(b.amount)}</td>
              <td>${new Date(b.due_date).toLocaleDateString('pt-BR')}</td>
              <td><span class="badge ${b.is_paid?'badge-paid':'badge-pending'}">${b.is_paid?'Pago':'Pendente'}</span></td>
              <td class="d-flex gap-2">
                ${!b.is_paid?`<button class="btn-secondary pay-bill" data-id="${b.id}" style="font-size:12px;padding:6px 10px;"><i class="ph ph-check"></i> Pagar</button>`:''}
                <button class="icon-btn danger del-bill" data-id="${b.id}"><i class="ph ph-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;

  document.getElementById('new-bill-btn')?.addEventListener('click',()=>{
    const w=document.getElementById('bill-form-wrap');
    if(w) w.style.display=w.style.display==='none'?'':'none';
  });
  document.getElementById('bill-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    await apiCall('/bills/','POST',{description:document.getElementById('b-desc').value,amount:parseFloat(document.getElementById('b-amount').value),due_date:document.getElementById('b-due').value,is_paid:false});
    loadPage('bills');
  });
  document.querySelectorAll('.pay-bill').forEach(btn=>btn.addEventListener('click',async()=>{
    await apiCall(`/bills/${btn.dataset.id}/pay`,'PUT'); loadPage('bills');
  }));
  document.querySelectorAll('.del-bill').forEach(btn=>btn.addEventListener('click',async()=>{
    if(confirm('Excluir conta?')){ await apiCall(`/bills/${btn.dataset.id}`,'DELETE'); loadPage('bills'); }
  }));
}

// ============================================================
// ADVISOR (AI)
// ============================================================
async function renderAdvisor() {
  pageContent.innerHTML = `<div class="spinner"><i class="ph ph-spinner-gap"></i></div>`;
  const [ins,ideas,health,pred] = await Promise.all([
    apiCall('/ai/insights').catch(()=>({insights:[]})),
    apiCall('/ai/ideas').catch(()=>({ideas:[]})),
    apiCall('/ai/health-score').catch(()=>({score:0,tips:[]})),
    apiCall('/ai/predict').catch(()=>({prediction:0}))
  ]);

  const score=health.score||0;
  const scoreColor=score>80?'var(--success)':score>50?'var(--warning)':'var(--danger)';
  const scoreLabel=score>80?'Excelente':score>50?'Estável':'Atenção';
  const circum=2*Math.PI*60;
  const dash=circum*(score/100);

  pageContent.innerHTML = `
    <div class="section-header"><h2><i class="ph ph-brain"></i> IA Advisor</h2></div>
    <div class="grid-2 mb-4">
      <div class="card text-center">
        <p class="card-title">Score de Saúde Financeira</p>
        <div class="score-ring-wrap mt-4">
          <svg viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" fill="none" stroke="var(--bg-light)" stroke-width="12"/>
            <circle cx="70" cy="70" r="60" fill="none" stroke="${scoreColor}" stroke-width="12"
              stroke-linecap="round" stroke-dasharray="${dash} ${circum}" transform="rotate(-90 70 70)"/>
          </svg>
          <div class="score-val">
            <span style="color:${scoreColor};">${score}</span>
            <span>${scoreLabel}</span>
          </div>
        </div>
        <div class="mt-4">
          ${health.tips?.map(t=>`<div class="ai-msg mt-2"><i class="ph ph-lightbulb"></i><div><p>${t}</p></div></div>`).join('')||''}
        </div>
      </div>
      <div class="card text-center">
        <p class="card-title">Previsão de Gastos – Próximo Mês</p>
        <h1 class="text-gradient" style="font-size:42px;margin:28px 0;">${fmtBRL(pred.prediction||0)}</h1>
        <p class="text-muted">Baseado no seu histórico de despesas</p>
        <div class="ai-msg mt-4"><i class="ph ph-robot"></i><div><p>A IA analisa seus padrões mensais para prever gastos futuros com precisão.</p></div></div>
      </div>
    </div>
    <div class="card mb-4">
      <p class="card-title">Análise Personalizada</p>
      ${ins.insights?.map(i=>`<div class="ai-msg"><i class="ph ph-lightbulb"></i><div><p>${i}</p></div></div>`).join('')||'<p class="text-muted">Adicione transações para receber análises.</p>'}
    </div>
    <div class="card">
      <p class="card-title">Ideias Empreendedoras</p>
      ${ideas.ideas?.map(i=>`<div class="ai-msg" style="border-left-color:var(--success);background:rgba(0,255,136,0.05);"><i class="ph ph-rocket-launch" style="color:var(--success);"></i><div><p>${i}</p></div></div>`).join('')||'<p class="text-muted">Nenhuma ideia no momento.</p>'}
    </div>`;
}

// ============================================================
// REPORTS
// ============================================================
async function renderReports() {
  pageContent.innerHTML = `<div class="spinner"><i class="ph ph-spinner-gap"></i></div>`;
  
  try {
    const [txs, evolution, distribution] = await Promise.all([
      apiCall('/transactions/'),
      apiCall('/reports/net-worth-evolution').catch(()=>({evolution:[]})),
      apiCall('/reports/category-distribution').catch(()=>({distribution:[]}))
    ]);

    const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const net     = income-expense;

    pageContent.innerHTML = `
      <div class="section-header">
        <h2>Relatórios Avançados</h2>
        <div class="d-flex gap-2">
          <button class="btn-secondary" onclick="exportCSV()"><i class="ph ph-file-csv"></i> Exportar CSV</button>
          <button class="btn-primary" onclick="exportPDF()"><i class="ph ph-file-pdf"></i> Exportar PDF</button>
        </div>
      </div>
      <div class="grid-3 mb-4">
        <div class="card text-center"><p class="card-title">Total Receitas</p><h2 class="text-success">${fmtBRL(income)}</h2></div>
        <div class="card text-center"><p class="card-title">Total Despesas</p><h2 class="text-danger">${fmtBRL(expense)}</h2></div>
        <div class="card text-center"><p class="card-title">Resultado Líquido</p><h2 class="${net>=0?'text-success':'text-danger'}">${fmtBRL(net)}</h2></div>
      </div>
      <div class="grid-2 mb-4">
        <div class="card">
          <p class="card-title">Distribuição por Categoria (%)</p>
          <canvas id="rep-cat-chart" height="220"></canvas>
        </div>
        <div class="card">
          <p class="card-title">Evolução de Patrimônio (12 Meses)</p>
          <canvas id="rep-evo-chart" height="220"></canvas>
        </div>
      </div>
      <div class="card">
        <p class="card-title">Resumo de Categorias</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Categoria</th><th>Total Gasto</th><th>% do Total</th></tr></thead>
            <tbody>
              ${distribution.distribution?.map(d=>`
                <tr>
                  <td><strong>${d.category}</strong></td>
                  <td class="text-danger">${fmtBRL(d.amount)}</td>
                  <td>${d.percentage}%</td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="text-center text-muted">Sem dados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const cc = getChartColors();
    const distData = distribution.distribution || [];
    const pieCtx = document.getElementById('rep-cat-chart')?.getContext('2d');
    if(pieCtx) charts['rep-cat'] = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: distData.map(d=>d.category),
        datasets: [{
          data: distData.map(d=>d.amount),
          backgroundColor: distData.map(d=>categoryColor(d.category)),
          borderWidth: 2,
          borderColor: 'var(--bg-card)'
        }]
      },
      options: {
        plugins: { legend: { position: 'right', labels: { color: cc.text, font: { size: 10 } } } },
        animation: { duration: 800 }
      }
    });

    const evoCtx = document.getElementById('rep-evo-chart')?.getContext('2d');
    if(evoCtx) {
      const evo = evolution.evolution || [];
      charts['rep-evo'] = new Chart(evoCtx, {
        type: 'line',
        data: {
          labels: evo.map(e=>e.month),
          datasets: [{
            label: 'Patrimônio Líquido',
            data: evo.map(e=>e.balance),
            borderColor: 'var(--primary-l)',
            backgroundColor: 'rgba(123,47,190,0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: cc.text } } },
          scales: {
            x: { grid: { color: cc.grid }, ticks: { color: cc.text } },
            y: { grid: { color: cc.grid }, ticks: { color: cc.text, callback: v=>'R$'+v.toLocaleString('pt-BR') } }
          }
        }
      });
    }
  } catch(err) {
    console.error(err);
    pageContent.innerHTML = `<div class="card"><p class="text-danger">Erro ao carregar relatórios.</p></div>`;
  }
}
window.exportCSV = () => {
  if (!allTransactions || !allTransactions.length) return alert('Nenhuma transação para exportar.');
  const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
  const rows = allTransactions.map(t => [
    new Date(t.date).toLocaleDateString('pt-BR'),
    t.description,
    t.category_name || 'Diversos',
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.amount.toString().replace('.', ',')
  ]);
  const content = [headers, ...rows].map(e => e.join(';')).join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `caria_ia_export_${new Date().getTime()}.csv`);
  link.click();
};

window.exportPDF = async () => {
  try {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(22); doc.text('Caria IA – Relatório Financeiro',14,20);
    doc.setFontSize(12); doc.setTextColor(120);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,14,30);
    doc.save('caria-ia-relatorio.pdf');
  } catch(e){ alert('Erro ao exportar PDF.'); }
};

// ============================================================
// GAMIFICATION
// ============================================================
async function renderGamification() {
  const [achievements, alerts] = await Promise.all([
    apiCall('/gamification/achievements').catch(()=>[]),
    apiCall('/gamification/alerts').catch(()=>[])
  ]);

  const score=currentUser?.health_score||0;
  const scoreColor=score>80?'var(--success)':score>50?'var(--warning)':'var(--danger)';

  pageContent.innerHTML = `
    <div class="section-header"><h2>Conquistas & Score</h2></div>
    <div class="grid-2 mb-4">
      <div class="card text-center">
        <p class="card-title">Score Financeiro</p>
        <div style="width:120px;height:120px;border-radius:50%;border:10px solid ${scoreColor};display:flex;align-items:center;justify-content:center;margin:16px auto;">
          <span style="font-size:36px;font-weight:800;">${score}</span>
        </div>
        <p class="mt-2" style="color:${scoreColor};font-weight:700;">${score>80?'Excelente':score>50?'Em dia':'Atenção'}</p>
      </div>
      <div class="card">
        <p class="card-title">Alertas e Notificações</p>
        <div style="max-height:240px;overflow-y:auto;">
          ${alerts.length?alerts.map(a=>`
            <div class="d-flex gap-2 align-center" style="padding:10px;background:var(--bg-light);border-radius:8px;margin-bottom:8px;">
              <i class="ph ph-${a.type==='danger'?'warning':'info'}" style="color:var(--${a.type==='danger'?'danger':'accent'});font-size:20px;"></i>
              <div style="flex:1;font-size:13px;">${a.message}</div>
              ${!a.is_read?`<button class="icon-btn text-success read-alert" data-id="${a.id}" style="font-size:14px;"><i class="ph ph-check"></i></button>`:''}
            </div>`).join('')
          :'<p class="text-muted">Nenhum alerta recente.</p>'}
        </div>
      </div>
    </div>
    <p class="dash-section-title">Medalhas</p>
    <div class="grid-4">
      ${achievements.length?achievements.map(a=>`
        <div class="achievement-card">
          <div class="achievement-icon">🏆</div>
          <p style="font-size:13px;font-weight:700;">${a.title}</p>
          <p class="text-muted" style="font-size:11px;">${a.description||''}</p>
        </div>`).join('')
      :`<div class="card text-center" style="grid-column:1/-1;"><p class="text-muted">Comece a registrar transações para desbloquear conquistas.</p></div>`}
    </div>`;

  document.querySelectorAll('.read-alert').forEach(btn=>btn.addEventListener('click',async()=>{
    await apiCall(`/gamification/alerts/${btn.dataset.id}/read`,'PUT');
    renderGamification();
  }));
}

// ============================================================
// PROFILE / SETTINGS
// ============================================================
async function renderProfile() {
  const profile = currentUser?.financial_profile ? JSON.parse(currentUser.financial_profile) : { income:0, goal:'', currency:'BRL' };
  const initials = (currentUser?.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  pageContent.innerHTML = `
    <div class="section-header"><h2>Perfil & Configurações</h2></div>
    <div class="grid-2">
      <div class="card settings-section">
        <h3>Dados Pessoais</h3>
        <div class="d-flex gap-4 align-center mb-4">
          <div class="profile-avatar-large" id="prof-avatar">${currentUser?.profile_picture?`<img src="${currentUser.profile_picture}">`:initials}</div>
          <div>
            <h3 style="font-size:18px;">${currentUser?.name||'Usuário'}</h3>
            <p class="text-muted">${currentUser?.email||''}</p>
            <p class="text-muted" style="font-size:12px;">Planejador Financeiro</p>
          </div>
        </div>

        <div class="settings-section">
          <h3>Saldo Manual</h3>
          <div class="d-flex gap-2">
            <input type="number" id="balance-input" step="0.01" value="${currentUser?.balance||0}" placeholder="R$ 0,00">
            <button class="btn-primary" id="save-balance-btn">Salvar</button>
          </div>
        </div>

        <div class="settings-section mt-4">
          <h3>Perfil Financeiro</h3>
          <div class="form-field mb-2"><label>Renda Mensal (R$)</label><input type="number" id="pf-income" value="${profile.income||0}"></div>
          <div class="form-field mb-2"><label>Objetivo Principal</label><select id="pf-goal">
            <option ${profile.goal==='aposentadoria'?'selected':''} value="aposentadoria">Aposentadoria</option>
            <option ${profile.goal==='casa'?'selected':''} value="casa">Casa Própria</option>
            <option ${profile.goal==='viagem'?'selected':''} value="viagem">Viagem</option>
            <option ${profile.goal==='emergencia'?'selected':''} value="emergencia">Reserva de Emergência</option>
            <option ${profile.goal==='outros'?'selected':''} value="outros">Outros</option>
          </select></div>
          <div class="form-field mb-4"><label>Moeda Principal</label><select id="pf-currency">
            <option value="BRL" ${profile.currency==='BRL'?'selected':''}>Real (BRL)</option>
            <option value="USD" ${profile.currency==='USD'?'selected':''}>Dólar (USD)</option>
            <option value="EUR" ${profile.currency==='EUR'?'selected':''}>Euro (EUR)</option>
          </select></div>
          <button class="btn-primary" id="save-profile-btn">Salvar Perfil</button>
        </div>
      </div>

      <div class="card">
        <h3 class="settings-section" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">Aparência</h3>
        <div class="d-flex gap-2 align-center mb-4">
          <button class="btn-secondary" id="theme-light-btn">☀️ Tema Claro</button>
          <button class="btn-secondary" id="theme-dark-btn">🌙 Tema Escuro</button>
        </div>

        <h3 class="settings-section" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">Orçamentos por Categoria</h3>
        <div id="budget-list"><div class="spinner"><i class="ph ph-spinner-gap"></i></div></div>

        <h3 class="settings-section mt-4" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">Backup</h3>
        <button class="btn-secondary" id="export-data-btn"><i class="ph ph-download-simple"></i> Exportar dados (JSON)</button>
      </div>
    </div>`;

  // Avatar click
  document.getElementById('prof-avatar')?.addEventListener('click',()=>document.getElementById('profile-pic-input')?.click());

  // Balance save
  document.getElementById('save-balance-btn')?.addEventListener('click',async()=>{
    const bal=parseFloat(document.getElementById('balance-input').value);
    if(!isNaN(bal)){
      await apiCall('/auth/me/balance','PUT',{balance:bal});
      currentUser.balance=bal;
      alert('Saldo atualizado!');
      await refreshHeaderStats();
    }
  });

  // Profile save
  document.getElementById('save-profile-btn')?.addEventListener('click',async()=>{
    const fp={income:parseFloat(document.getElementById('pf-income').value)||0, goal:document.getElementById('pf-goal').value, currency:document.getElementById('pf-currency').value};
    await apiCall('/auth/me/profile','PUT',{financial_profile:JSON.stringify(fp)});
    currentUser.financial_profile=JSON.stringify(fp);
    alert('Perfil salvo!');
  });

  // Theme buttons
  document.getElementById('theme-light-btn')?.addEventListener('click',()=>applyTheme('light'));
  document.getElementById('theme-dark-btn')?.addEventListener('click',()=>applyTheme('dark'));

  // Budgets
  try {
    const budgets=await apiCall('/budgets/');
    const bl=document.getElementById('budget-list');
    if(bl) {
      bl.innerHTML=`<div class="d-flex gap-2" style="flex-wrap:wrap;">
        ${CATEGORIES_DEFAULT.map(cat=>{
          const existing=budgets.find(b=>b.category_name===cat.name);
          return `<div class="form-field" style="min-width:140px;">
            <label style="font-size:11px;">${cat.name}</label>
            <input type="number" step="0.01" placeholder="Sem limite" data-cat="${cat.name}" class="budget-input" value="${existing?.limit||''}">
          </div>`;
        }).join('')}
      </div>
      <button class="btn-primary mt-4" id="save-budgets-btn">Salvar Orçamentos</button>`;

      document.getElementById('save-budgets-btn')?.addEventListener('click',async()=>{
        const inputs=document.querySelectorAll('.budget-input');
        for(const inp of inputs){
          const val=parseFloat(inp.value);
          if(!isNaN(val) && val>0){
            const existing=budgets.find(b=>b.category_name===inp.dataset.cat);
            if(existing){ await apiCall(`/budgets/${existing.id}`,'PUT',{limit:val}).catch(()=>{}); }
            else { await apiCall('/budgets/','POST',{category_name:inp.dataset.cat,limit:val}).catch(()=>{}); }
          }
        }
        alert('Orçamentos salvos!');
      });
    }
  } catch(e) { document.getElementById('budget-list').innerHTML='<p class="text-muted">Sem orçamentos.</p>'; }

  // JSON Export
  document.getElementById('export-data-btn')?.addEventListener('click',async()=>{
    const txs=await apiCall('/transactions/');
    const blob=new Blob([JSON.stringify({user:currentUser, transactions:txs},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='caria-ia-backup.json'; a.click();
    URL.revokeObjectURL(url);
  });
}

// ============================================================
// BOOTSTRAP
// ============================================================
init();
