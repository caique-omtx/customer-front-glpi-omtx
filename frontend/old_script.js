// Script principal do frontend. Gerencia autenticação, tickets e recuperação de senha, interagindo com o backend via API REST.

const API_URL = window.API_URL || 'http://localhost:5000';

// Função utilitária para selecionar elementos do DOM
const $ = s => document.querySelector(s);

// Função para obter o caminho base do frontend
function baseFront() {
    const m = location.pathname.match(/^(.*\/frontend)\//);
    return m ? m[1] : '';
}

// Função para navegação entre páginas
function go(page) {
    location.href = `${baseFront()}/pages/${page}.html`;
}

// Funções utilitárias para manipular localStorage
function get(k) {
    return localStorage.getItem(k);
}
function set(k, v) {
    localStorage.setItem(k, v);
}
function del(k) {
    localStorage.removeItem(k);
}

// Função para fazer requisições à API do backend
async function api(path, opt = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(opt.headers || {})
        },
        ...opt
    });
    if (!res.ok) {
        let m = `${res.status} ${res.statusText}`;
        try {
            const j = await res.json();
            if (j?.error) m = j.error;
        } catch { }
        throw new Error(m);
    }
    return res.json();
}

// Redireciona para login se não estiver autenticado
function guardAuth() {
    if (!get('session_token')) go('index');
}

// Realiza login e salva dados da sessão
async function login() {
    const username = $('#loginUser').value.trim();
    const password = $('#loginPass').value.trim();
    const d = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    set('session_token', d.session_token);
    set('userId', d.userId || '');
    set('name', d.name || '');
    set('email', d.email || '');
    go('mainUI');
}

// Realiza logout e limpa dados da sessão
async function logout() {
    const t = get('session_token');
    try {
        await api('/api/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ session_token: t })
        });
    } catch { }
    ['session_token', 'userId', 'name', 'email'].forEach(del);
    go('index');
}

// Cria um novo chamado/ticket
async function createTicket() {
    const title = $('#ticketTitle').value.trim();
    const content = $('#ticketDesc').value.trim();
    const t = get('session_token');
    await api('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({ name: title, content: content, session_token: t })
    });
    alert('Chamado criado com sucesso!');
    go('listTickets');
}

// Carrega e exibe lista de chamados/tickets do usuário
async function loadTickets() {
    const userId = get('userId');
    const t = get('session_token');
    const data = await api(`/api/tickets/my?userId=${encodeURIComponent(userId)}&session_token=${encodeURIComponent(t)}`);
    const list = $('#ticketsList');
    list.innerHTML = '';
    const rows = data?.data || data?.results || [];
    rows.forEach(item => {
        const id = item[2] || item.id || '';
        const name = item[1] || item.name || '';
        const status = item[12] || item.status || '';
        const date = item[15] || item.date || '';
        const li = document.createElement('li');
        li.textContent = `#${id} • ${name} — status: ${status} — criado: ${date}`;
        list.appendChild(li);
    });
}

// Solicita recuperação de senha
async function forgotPassword() {
    const email = $('#emailForgot').value.trim();
    await api('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
    alert('Se o e-mail existir no GLPI, você receberá o token para redefinição.');
}

// Redefine a senha usando token recebido por e-mail
async function resetPassword() {
    const email = $('#emailReset').value.trim();
    const token = $('#tokenReset').value.trim();
    const password = $('#newPass').value.trim();
    await api('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ email, token, password })
    });
    alert('Senha redefinida com sucesso. Faça login com a nova senha.');
    go('index');
}

// Disponibiliza funções no escopo global para uso nos eventos das páginas
window.login = login;
window.logout = logout;
window.guardAuth = guardAuth;
window.createTicket = createTicket;
window.loadTickets = loadTickets;
window.forgotPassword = forgotPassword;
window.resetPassword = resetPassword;
