import { Router } from 'express';
import { login, killSession, requestPasswordRecovery, resetPassword } from '../glpiService.js';
const router = Router();

router.post('/login', async (req, res) => {
  try{
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username e password são obrigatórios' });
    const data = await login(username, password);
    res.json(data);
  }catch(err){
    const status = err.status || err.response?.status || 401;
    let message  = err.message || err.response?.data?.message || 'Falha na autenticação';
    if (status === 401) message = 'Usuário ou senha inválidos';
    res.status(status).json({ error: message });
  }
});

router.post('/logout', async (req, res) => {
  const { session_token } = req.body || {};
  await killSession(session_token);
  res.json({ ok:true });
});

router.post('/forgot', async (req, res) => {
  try{
    const { email } = req.body || {};
    if(!email) return res.status(400).json({ error:'email é obrigatório' });
    const out = await requestPasswordRecovery(email);
    res.json(out);
  }catch(err){
    res.status(400).json({ error: err.message || 'Falha ao solicitar redefinição' });
  }
});

router.post('/reset', async (req, res) => {
  try{
    const { email, token, password } = req.body || {};
    if(!email || !token || !password) return res.status(400).json({ error:'email, token e password são obrigatórios' });
    const out = await resetPassword(email, token, password);
    res.json(out);
  }catch(err){
    res.status(400).json({ error: err.message || 'Falha ao redefinir senha' });
  }
});

export default router;
