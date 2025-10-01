import axios from 'axios';
import {GLPI_API_URL,GLPI_APP_TOKEN} from './config.js';

const http = axios.create({ baseURL: GLPI_API_URL, timeout: 15000 });
const headersWith = (t)=>{ const h={'App-Token':GLPI_APP_TOKEN}; if(t) h['Session-Token']=t; return h; };

export async function initSession(username,password){
  try{
    const res = await http.get('/initSession',{ headers: headersWith(), auth:{ username, password } });
    if(!res.data?.session_token) throw new Error('GLPI não retornou session_token');
    return res.data;
  }catch(err){
    const status = err.response?.status || 401;
    const msg = err.response?.data?.message || err.response?.data?.error || 'Usuário ou senha inválidos';
    const e = new Error(msg);
    e.status = status;
    throw e;
  }
}

export async function killSession(t){ try{ await http.get('/killSession',{ headers: headersWith(t) }) }catch(e){} return true; }
export async function getFullSession(t){ const res = await http.get('/getFullSession',{ headers: headersWith(t) }); return res.data; }

export async function login(username,password){
  const s = await initSession(username,password);
  let userId=null,name=null,email=null;
  try{
    const f = await getFullSession(s.session_token);
    userId = f?.session?.glpiID || f?.user?.id || null;
    name   = f?.session?.glpirealname || f?.user?.realname || null;
    email  = f?.session?.glpiemail || f?.user?.email || null;
  }catch{}
  return { session_token: s.session_token, userId, name, email };
}

export async function requestPasswordRecovery(email){
  const res = await http.put('/lostPassword', { email }, { headers: headersWith() });
  return res.data || { ok:true };
}
export async function resetPassword(email, token, password){
  const res = await http.put('/lostPassword', { email, password_forget_token: token, password }, { headers: headersWith() });
  return res.data || { ok:true };
}

export async function createTicket({ name, content, urgency = 3, ccEmails = [] }, sessionToken) {
  const payload = { input: { name, content, type: 1, urgency: Number(urgency)||3 } };
  const res = await http.post('/Ticket', payload, { headers: headersWith(sessionToken) });
  const data = res.data;
  const ticketId = data?.id || data?.[0]?.id || data?.ticket?.id || null;

  // Observadores (CC)
  const added = []; const notFound = [];
  if (ticketId && Array.isArray(ccEmails) && ccEmails.length) {
    for (const email of ccEmails) {
      const uid = await searchUserIdByEmail(email, sessionToken);
      if (uid) {
        try { await addObserver(ticketId, uid, sessionToken); added.push({ email, userId: uid }); }
        catch { notFound.push({ email, reason: 'falha ao adicionar' }); }
      } else {
        notFound.push({ email, reason: 'não encontrado' });
      }
    }
  }

  return { ...data, ticketId, observersAdded: added, observersNotFound: notFound };
}

export async function listTicketsByRequester(userId, sessionToken, {limit=50, offset=0} = {}){
  const params = {
    order: 'DESC',
    range: `${offset}-${offset+limit-1}`,
    'criteria[0][link]':'AND',
    'criteria[0][itemtype]':'Ticket',
    'criteria[0][field]':'4',              // requester
    'criteria[0][searchtype]':'equals',
    'criteria[0][value]': String(userId),
    'forcedisplay[0]':'2',  // id
    'forcedisplay[1]':'1',  // name
    'forcedisplay[2]':'12', // status
    'forcedisplay[3]':'15'  // date
  };
  const res = await http.get('/search/Ticket',{ headers: headersWith(sessionToken), params });
  return res.data;
}

// Followups
export async function getTicketFollowups(ticketId, sessionToken, {limit=50,offset=0} = {}){
  const params = { range: `${offset}-${offset+limit-1}` };
  const res = await http.get(`/Ticket/${ticketId}/TicketFollowup`, { headers: headersWith(sessionToken), params });
  return res.data;
}
export async function addTicketFollowup(ticketId, content, sessionToken){
  try{
    const res = await http.post(`/Ticket/${ticketId}/TicketFollowup`, { input: { tickets_id: Number(ticketId), content } }, { headers: headersWith(sessionToken) });
    return res.data;
  }catch(e){
    const res = await http.post(`/ITILFollowup`, { input: { itemtype: 'Ticket', items_id: Number(ticketId), content } }, { headers: headersWith(sessionToken) });
    return res.data;
  }
}

// Observadores (CC)
async function _searchUserByEmailViaSearch(email, sessionToken){
  const params = {
    'criteria[0][field]':'5', // email (pode variar por versão)
    'criteria[0][searchtype]':'contains',
    'criteria[0][value]': email,
    'forcedisplay[0]':'2',    // id
    'forcedisplay[1]':'5'     // email
  };
  try{
    const res = await http.get('/search/User', { headers: headersWith(sessionToken), params });
    const rows = res.data?.data || res.data?.results || [];
    for(const row of rows){
      const id = row[2] || row.id;
      const mail = row[5] || row.email;
      if(String(mail).toLowerCase() === String(email).toLowerCase()) return Number(id);
    }
  }catch(_){}
  return null;
}
export async function searchUserIdByEmail(email, sessionToken){ return await _searchUserByEmailViaSearch(email, sessionToken); }
export async function addObserver(ticketId, userId, sessionToken){
  const payload = { input: { tickets_id: Number(ticketId), users_id: Number(userId), type: 2, use_notification: 1 } };
  const res = await http.post('/Ticket_User', payload, { headers: headersWith(sessionToken) });
  return res.data;
}

// ---- Estatísticas (dashboard) ----
async function _searchCount(params, sessionToken){
  const res = await http.get('/search/Ticket', {
    headers: headersWith(sessionToken),
    params: { range: '0-0', ...params }
  });
  const d = res.data || {};
  return Number(
    d.totalcount ?? d?.meta?.totalcount ?? res.headers?.['x-total-count'] ??
    (Array.isArray(d.data) ? d.data.length : 0)
  );
}
export async function ticketStatsByRequester(userId, sessionToken){
  if(!userId) throw new Error('userId vazio');

  const base = {
    'criteria[0][link]':'AND',
    'criteria[0][itemtype]':'Ticket',
    'criteria[0][field]':'4',
    'criteria[0][searchtype]':'equals',
    'criteria[0][value]': String(userId),
    'forcedisplay[0]':'2'
  };

  const total = await _searchCount(base, sessionToken);

  const openStatuses   = [1,2,3,4];
  const closedStatuses = [5,6];
  let open = 0, closed = 0;

  for(const s of openStatuses){
    open += await _searchCount({
      ...base,
      'criteria[1][link]':'AND',
      'criteria[1][field]':'12',
      'criteria[1][searchtype]':'equals',
      'criteria[1][value]': String(s)
    }, sessionToken);
  }
  for(const s of closedStatuses){
    closed += await _searchCount({
      ...base,
      'criteria[1][link]':'AND',
      'criteria[1][field]':'12',
      'criteria[1][searchtype]':'equals',
      'criteria[1][value]': String(s)
    }, sessionToken);
  }
  return { total, open, closed };
}
