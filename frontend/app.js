// ============================================================
// CARIA IA – app.js
// ============================================================
const API_URL = '/api'; // Certifique-se de que as chamadas estão usando a URL relativa e não localhost.

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

// ---- Helper: UI Feedback & Views ----
function showView(v) {
  const views = ['auth', 'app'];
  views.forEach(viewId => {
    const el = document.getElementById(`${viewId}-view`);
    if (!el) return;
    if (viewId === v) {
      el.style.display = 'flex';
      el.classList.add('active');
    } else {
      el.style.display = 'none';
      el.classList.remove('active');
    }
  });
}

/**
 * Premium Toast Notifications
 * @param {string} msg - Message to show
 * @param {string} type - success, error, warning
 */
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const iconMap = {
    success: 'ph-fill ph-check-circle',
    error: 'ph-fill ph-x-circle',
    warning: 'ph-fill ph-warning-circle'
  };

  toast.innerHTML = `
    <i class="${iconMap[type] || 'ph-fill ph-info'}"></i>
    <span>${msg}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 5s
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 400);
  }, 5000);

  // Remove on click
  toast.onclick = () => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 400);
  };
}

/**
 * Skeleton Loader Generator
 * @param {HTMLElement} container - Where to inject skeletons
 * @param {string} type - 'card', 'text', 'title'
 * @param {number} count - How many skeletons
 */
function setSkeleton(container, type = 'card', count = 3) {
  if (!container) return;
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton skeleton-${type}"></div>`;
  }
  container.innerHTML = html;
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
  setupBalanceModal();

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
          showToast('Servidor indisponível. Tente novamente.', 'error');
          const error = new Error('Servidor indisponível.');
          error.status = res.status;
          throw error;
        }
      }

      if (!res.ok) {
        showToast(json.detail || 'Erro na requisição', 'error');
        const error = new Error(json.detail || 'Erro na requisição');
        error.status = res.status;
        throw error;
      }

      if (useCache && method === 'GET') {
        this.cache[cacheKey] = json;
      }
      return json;

    } catch (err) {
      if (err.status === 401) {
        showToast('Sessão expirada. Faça login novamente.', 'warning');
      }
      throw err;
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
           // Servidor fora do ar (5xx or Network Error)
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
  
  // Premium Skeleton Loading
  setSkeleton(pageContent, 'card', 4);
  
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
    showToast(`Erro ao carregar página: ${err.message}`, 'error');
    pageContent.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-warning-circle"></i>
        <p>Ops! Ocorreu um erro ao carregar esta seção.</p>
        <button class="btn-primary mt-4" onclick="loadPage('${page}')">Tentar Novamente</button>
      </div>
    `;
  }
}

// ============================================================
// TX MODAL
// ============================================================
function setupTxModal() {
  const overlay = document.getElementById('tx-modal-overlay');
  document.getElementById('open-tx-modal')?.addEventListener('click', openTxModal);
  
  const closeModal = () => overlay.classList.remove('open');
  document.getElementById('close-tx-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-tx-btn')?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => { if(e.target===overlay) closeModal(); });

  document.getElementById('transaction-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    
    // Validations with Toasts
    const amountVal = document.getElementById('tx-amount').value;
    const amount = parseFloat(amountVal);
    const desc = document.getElementById('tx-desc').value.trim();
    const categoryId = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;

    if (isNaN(amount) || amount <= 0) return showToast('O valor deve ser positivo.', 'warning');
    if (!desc) return showToast('Insira uma descrição.', 'warning');
    if (!categoryId) return showToast('Escolha uma categoria.', 'warning');
    if (!date) return showToast('Selecione uma data.', 'warning');

    const type = document.querySelector('input[name="tx-type"]:checked')?.value || 'expense';
    const body = {
      type, amount, description: desc,
      category_id: parseInt(categoryId),
      date,
      is_recurring: document.getElementById('tx-recurring').checked,
      card_id: document.getElementById('tx-card').value ? parseInt(document.getElementById('tx-card').value) : null
    };
    
    try {
      await apiCall('/transactions/', 'POST', body);
      apiService.clearCache();
      closeModal();
      showToast('Transação salva com sucesso!');
      await refreshHeaderStats();
      const active = document.querySelector('.nav-item.active');
      if (active) loadPage(active.dataset.page);
    } catch(err) { /* Toast is handled in apiService */ }
  });
}

function setupBalanceModal() {
  const overlay = document.getElementById('balance-modal-overlay');
  const card    = document.getElementById('header-balance-card');
  const input   = document.getElementById('new-balance-input');
  const saveBtn = document.getElementById('save-balance-btn');
  
  const openModal = () => {
    if (!currentUser) return;
    input.value = currentUser.balance || 0;
    overlay.classList.add('open');
  };

  const closeModal = () => overlay.classList.remove('open');

  card?.addEventListener('click', openModal);
  document.getElementById('close-balance-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-balance-btn')?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => { if(e.target === overlay) closeModal(); });

  document.getElementById('adj-50')?.addEventListener('click', () => { input.value = (parseFloat(input.value) || 0) + 50; });
  document.getElementById('adj-100')?.addEventListener('click', () => { input.value = (parseFloat(input.value) || 0) + 100; });
  document.getElementById('adj-500')?.addEventListener('click', () => { input.value = (parseFloat(input.value) || 0) + 500; });
  document.getElementById('set-zero')?.addEventListener('click', () => { input.value = 0; });

  saveBtn?.addEventListener('click', async () => {
    const newVal = parseFloat(input.value);
    if (isNaN(newVal)) return showToast('Insira um valor válido.', 'warning');
    saveBtn.disabled = true;
    const oldHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="ph ph-spinner-gap spin"></i>';
    try {
      await apiCall('/auth/me/balance', 'PUT', { balance: newVal });
      currentUser.balance = newVal;
      updateHeader();
      await refreshHeaderStats();
      showToast('Saldo atualizado com sucesso!');
      closeModal();
    } catch (e) {
      /* Handled by apiService */
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldHtml;
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
  `;

  // Draw other charts
  const cc = getChartColors();
  const ctxBar = document.getElementById('monthly-bar-chart')?.getContext('2d');
  if(ctxBar) {
    charts['monthly'] = new Chart(ctxBar, {
      type:'bar',
      data:{
        labels: last6.map(d=>d.label),
        datasets:[
          { label:'Receita', data:last6.map(d=>d.income), backgroundColor:cc.text+'55', borderRadius:4 },
          { label:'Despesa', data:last6.map(d=>d.expense), backgroundColor:cc.text, borderRadius:4 }
        ]
      },
      options: { scales:{ y:{grid:{color:cc.grid},ticks:{color:cc.text}}, x:{grid:{display:false},ticks:{color:cc.text}} }, plugins:{legend:{display:false}} }
    });
  }
}
async function renderTransactions() {
  const txs = await apiCall('/transactions/');
  const mTxs = monthTxs(txs).sort((a,b)=>new Date(b.date)-new Date(a.date));
  
  pageContent.innerHTML = `
    <div class="section-header mb-4 d-flex justify-between align-center">
      <h2 class="dash-section-title">Histórico de Transações</h2>
      <div class="d-flex gap-2">
        <button class="btn-secondary" id="import-csv-btn"><i class="ph ph-file-arrow-up"></i> Importar</button>
        <button class="btn-secondary" id="export-pdf-btn"><i class="ph ph-file-pdf"></i> PDF</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${mTxs.map(t => `
            <tr>
              <td>${new Date(t.date).toLocaleDateString('pt-BR')}</td>
              <td style="font-weight:600;">${t.description}</td>
              <td><span class="badge" style="background:${categoryColor(t.category_name)}22;color:${categoryColor(t.category_name)};">${t.category_name}</span></td>
              <td class="${t.type==='income'?'text-success':'text-danger'}" style="font-weight:700;">
                ${t.type==='income'?'+':'-'} ${fmtBRL(t.amount)}
              </td>
              <td>
                <button class="icon-btn danger" onclick="deleteTx(${t.id})"><i class="ph ph-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
async function renderCards() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Módulo de Cartões em desenvolvimento...</p></div>'; }
async function renderInvestments() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Módulo de Investimentos em desenvolvimento...</p></div>'; }
async function renderGoals() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Módulo de Metas em desenvolvimento...</p></div>'; }
async function renderBills() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Módulo de Contas em desenvolvimento...</p></div>'; }
async function renderAdvisor() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Caria IA Advisor está processando seus dados...</p></div>'; }
async function renderReports() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Módulo de Relatórios em desenvolvimento...</p></div>'; }
async function renderGamification() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Módulo de Conquistas em desenvolvimento...</p></div>'; }
async function renderProfile() { pageContent.innerHTML = '<div class="card"><p class="text-muted">Módulo de Configurações em desenvolvimento...</p></div>'; }

async function deleteTx(id) {
  if(!confirm('Deseja excluir esta transação?')) return;
  try {
    await apiCall(`/transactions/${id}`, 'DELETE');
    showToast('Transação excluída!');
    const active = document.querySelector('.nav-item.active');
    if (active) loadPage(active.dataset.page);
    refreshHeaderStats();
  } catch(e) {}
}

// Start
init();
