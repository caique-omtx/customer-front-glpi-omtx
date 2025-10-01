O codigo vou desenvolvido por Caique Santos e conjunto com a equipe OMTX.
Os codigos foram corrijidos e aperfeiçoados com auxilio de IA.

Esse portal e destinado para clientes para que podem fazer as ações abaixo sem precisar ter contato com GLPI:

--Abrir chamados
--Listar seus chamados
--Redefinir sua senha
--Responder Chamados
--Fechar Chamados

Essas ações todas realizadas via API do GLPI.

Segue a estrutura e organização do codigo:

backend/
  package.json
  .env.keys
  src/
    index.js
    config.js
    glpiService.js
    routes/
      authRoutes.js
      ticketRoutes.js

frontend/
  assets/logo.svg
  style.css
  script.js
  pages/
    index.html
    mainUI.html
    newTicket.html
    listTickets.html
    resetPass.html
