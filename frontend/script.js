const API_URL = window.API_URL || 'http://localhost:5000';
const $ = s => document.querySelector(s);

// base helpers
function baseFront() { const m = location.pathname.match(/^(.*\/frontend)\//); return m ? m[1] : ''; }
function go(page) { location.href = `${baseFront()}/pages/${page}.html`; }
function get(k) { return localStorage.getItem(k) }
function set(k, v) { localStorage.setItem(k, v) }
function del(k) { localStorage.removeItem(k) }

// sanitize
function stripHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');
    return doc.body.textContent || "";
}
function parseEmails(str) {
    if (!str) return [];
    return str.split(/[;,\s]+/).map(s => s.trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.toLowerCase()));
}

// alerts
function showError(id, msg) { const el = document.getElementById(id); if (!el) return; el.textContent = msg || 'Ocorreu um erro'; el.classList.add('show'); }
function clearError(id) { const el = document.getElementById(id); if (!el) return; el.textContent = ''; el.classList.remove('show'); }

// api
async function api(path, opt = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) },
        ...opt
    });

    if (res.ok) return res.json();

    let rawText = '';
    try {
        rawText = await res.text();
        try {
            const data = JSON.parse(rawText);
            const msg = data?.error || data?.message;
            if (msg) throw new Error(msg);
        } catch { }
    } catch { }

    const status = res.status;
    if (status === 401) throw new Error('Usuário ou senha inválidos');
    if (status === 403) throw new Error('Acesso negado');
    if (status === 404) throw new Error('Recurso não encontrado');
    if (status >= 500) throw new Error('Erro interno do servidor');
    if (rawText && rawText.trim()) throw new Error(rawText.trim());
    throw new Error(`${res.status} ${res.statusText || 'Erro'}`);
}

// auth
function guardAuth() { if (!get('session_token')) go('index'); }
async function login() {
    clearError('loginError');
    const btn = document.querySelector('button[type=submit]') || document.querySelector('button[onclick="login()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }
    try {
        const username = $('#loginUser').value.trim();
        const password = $('#loginPass').value.trim();
        const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        set('session_token', d.session_token);
        set('userId', d.userId || '');
        set('name', d.name || '');
        set('email', d.email || '');
        go('mainUI');
    } catch (e) {
        let msg = e?.message || '';
        if (!msg || /^401\b/i.test(msg) || /unauthorized/i.test(msg)) msg = 'Usuário ou senha inválidos';
        showError('loginError', msg);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
}
async function logout() { const t = get('session_token'); try { await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ session_token: t }) }) } catch { };['session_token', 'userId', 'name', 'email'].forEach(del); go('index'); }

// tickets
async function createTicket() {
    const title = $('#ticketTitle').value.trim();
    const content = $('#ticketDesc').value.trim();
    const t = get('session_token');
    const urgency = Number(document.getElementById('ticketUrgency').value) || 3;
    const ccEmails = parseEmails(document.getElementById('ticketCC').value);
    await api('/api/tickets', { method: 'POST', body: JSON.stringify({ name: title, content, session_token: t, urgency, ccEmails }) });
    alert('Chamado criado com sucesso!');
    go('mainUI');
}
function statusBadgeHTML(s) {
    const status = Number(s);
    const cal = `<span class="icon-calendar" aria-hidden="true">
    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2"  x2="8"  y2="6"></line>
      <line x1="3"  y1="10" x2="21" y2="10"></line>
    </svg></span>`;
    switch (status) {
        case 1: return `<span class="status-badge"><span class="dot dot-green"></span> Novo</span>`;
        case 2: return `<span class="status-badge"><span class="dot dot-outline-grn"></span> Em atendimento</span>`;
        case 3: return `<span class="status-badge">${cal} Atendimento agendado</span>`;
        case 4: return `<span class="status-badge"><span class="dot dot-red"></span> Pendente</span>`;
        case 5: return `<span class="status-badge"><span class="dot dot-outline-blk"></span> Solucionado</span>`;
        case 6: return `<span class="status-badge"><span class="dot dot-black"></span> Fechado</span>`;
        default: return `<span class="status-badge"><span class="dot dot-outline-blk"></span> Status ${status}</span>`;
    }
}
async function loadTickets() {
    const userId = get('userId');
    const t = get('session_token');
    const data = await api(`/api/tickets/my?userId=${encodeURIComponent(userId)}&session_token=${encodeURIComponent(t)}`);
    const body = document.getElementById('ticketsBody');
    body.innerHTML = '';
    const rows = data?.data || data?.results || [];
    rows.forEach(item => {
        const id = item[2] ?? item.id ?? '';
        const title = item[1] ?? item.name ?? '';
        const st = item[12] ?? item.status ?? '';
        const date = item[15] ?? item.date ?? '';
        const a = document.createElement('a');
        a.href = `${baseFront()}/pages/ticketDetail.html?id=${id}`;
        a.className = 'tickets-row';
        a.setAttribute('data-id', id);
        a.innerHTML = `
      <div class="cell id">#${id}</div>
      <div class="cell title">${title}</div>
      <div class="cell status">${statusBadgeHTML(st)}</div>
      <div class="cell created">${date}</div>`;
        body.appendChild(a);
    });
    if (!body.children.length) {
        const empty = document.createElement('div'); empty.className = 'muted'; empty.style.marginTop = '8px'; empty.textContent = 'Nenhum chamado encontrado.'; body.appendChild(empty);
    }
}

// forgot/reset
async function forgotPassword() { const email = $('#emailForgot').value.trim(); await api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }); alert('O e-mail foi enviado, você receberá o token para redefinição.'); }
async function resetPassword() { const email = $('#emailReset').value.trim(); const token = $('#tokenReset').value.trim(); const password = $('#newPass').value.trim(); await api('/api/auth/reset', { method: 'POST', body: JSON.stringify({ email, token, password }) }); alert('Senha redefinida com sucesso. Faça login com a nova senha.'); go('index'); }

// detail
function getQuery(name) { const u = new URL(location.href); return u.searchParams.get(name); }
async function loadTicketDetail() {
    const id = getQuery('id'); if (!id) return alert('Ticket inválido');
    document.getElementById('ticketId').textContent = `#${id}`;
    const t = get('session_token');
    const data = await api(`/api/tickets/${id}/followups?session_token=${encodeURIComponent(t)}`);
    const container = document.getElementById('followups'); container.innerHTML = '';
    const rows = data?.data || data || [];
    const items = Array.isArray(rows) ? rows : (rows?.itilfollowups || []);
    (items || []).forEach(fu => {
        const raw = (fu.content || fu[1] || '').replace(/<br\s*\/?>(?=\n|$)/gi, '\n');
        const content = stripHtml(raw);
        const date = fu.date || fu.date_mod || fu[2] || '';
        const who = fu.users_id ? `Usuário #${fu.users_id}` : '';
        const div = document.createElement('div');
        div.className = 'followup';
        div.innerHTML = `<div class="meta">${date} ${who}</div><div class="content">${content}</div>`;
        container.appendChild(div);
    });
    if (!container.children.length) {
        const empty = document.createElement('div'); empty.className = 'muted'; empty.textContent = 'Nenhuma interação ainda.'; container.appendChild(empty);
    }
    container.scrollTop = container.scrollHeight;
}
async function sendFollowup() {
    const id = getQuery('id'); const content = document.getElementById('replyMsg').value.trim(); if (!content) return alert('Digite uma mensagem');
    const t = get('session_token'); await api(`/api/tickets/${id}/followups`, { method: 'POST', body: JSON.stringify({ session_token: t, content }) });
    document.getElementById('replyMsg').value = ''; await loadTicketDetail(); alert('Resposta enviada.');
}

// dashboard
async function loadDashboard() {
    const userId = get('userId'); const t = get('session_token');
    const data = await api(`/api/tickets/stats?userId=${encodeURIComponent(userId)}&session_token=${encodeURIComponent(t)}`);
    const fmt = n => typeof n === 'number' ? n.toLocaleString('pt-BR') : '0';
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = fmt(v); };
    el('kpiTotal', data.total); el('kpiOpen', data.open); el('kpiClosed', data.closed);
}

window.login = login; window.logout = logout; window.guardAuth = guardAuth; window.createTicket = createTicket;
window.loadTickets = loadTickets; window.forgotPassword = forgotPassword; window.resetPassword = resetPassword;
window.loadTicketDetail = loadTicketDetail; window.sendFollowup = sendFollowup; window.loadDashboard = loadDashboard;
