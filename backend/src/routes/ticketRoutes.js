import { Router } from 'express';
import { createTicket, listTicketsByRequester, ticketStatsByRequester, listITILCategories } from '../glpiService.js';
const router = Router();

router.post('/', async (req, res) => {
  try{
    const { name, content, session_token, urgency, ccEmails, category } = req.body || {};
    if(!name || !content) return res.status(400).json({ error: 'Campos obrigatórios: name e content' });
    const data = await createTicket({ name, content, urgency, ccEmails, category }, session_token);
    res.json(data);
  }catch(err){
    res.status(400).json({ error: err.message || 'Falha ao criar ticket' });
  }
});

router.get('/my', async (req, res) => {
  try{
    const { userId, session_token, limit, offset } = req.query || {};
    const data = await listTicketsByRequester(userId, session_token, { limit: Number(limit)||50, offset: Number(offset)||0 });
    res.json(data);
  }catch(err){
    res.status(400).json({ error: err.message || 'Falha ao listar tickets' });
  }
});

router.get('/stats', async (req, res) => {
  try{
    const { userId, session_token } = req.query || {};
    const data = await ticketStatsByRequester(userId, session_token);
    res.json(data);
  }catch(err){
    res.status(400).json({ error: err.message || 'Falha ao obter estatísticas' });
  }
});

// GET /api/tickets/categories?session_token=
router.get('/categories', async (req, res) => {
  try {
    const { session_token } = req.query || {};
    const data = await listITILCategories(session_token);
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Falha ao listar categorias' });
  }
});


export default router;
