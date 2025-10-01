import { Router } from 'express';
import { getTicketFollowups, addTicketFollowup } from '../glpiService.js';

const router = Router();

/**
 * Rota para obter os followups (acompanhamentos) de um ticket
 * GET /:id/followups
 * Parâmetros:
 *   - id: ID do ticket (na URL)
 *   - session_token, limit, offset: na query string
 */
router.get('/:id/followups', async (req, res) => {
    try {
        const { id } = req.params;
        const { session_token, limit, offset } = req.query || {};
        // Busca os followups do ticket usando o serviço
        const data = await getTicketFollowups(
            id,
            session_token,
            {
                limit: Number(limit) || 50,
                offset: Number(offset) || 0
            }
        );
        res.json(data);
    } catch (err) {
        // Retorna erro caso falhe ao obter os followups
        res.status(400).json({ error: err.message || 'Falha ao obter followups' });
    }
});

/**
 * Rota para adicionar um novo followup (acompanhamento) a um ticket
 * POST /:id/followups
 * Parâmetros:
 *   - id: ID do ticket (na URL)
 *   - session_token, content: no corpo da requisição
 */
router.post('/:id/followups', async (req, res) => {
    try {
        const { id } = req.params;
        const { session_token, content } = req.body || {};
        // Validação do campo obrigatório 'content'
        if (!content)
            return res.status(400).json({ error: 'content é obrigatório' });

        // Adiciona o followup ao ticket usando o serviço
        const out = await addTicketFollowup(id, content, session_token);
        res.json(out);
    } catch (err) {
        // Retorna erro caso falhe ao adicionar o followup
        res.status(400).json({ error: err.message || 'Falha ao adicionar followup' });
    }
});

export default router;
