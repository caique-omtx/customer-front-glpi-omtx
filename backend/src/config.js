// Carrega variáveis de ambiente do arquivo .env
import dotenv from 'dotenv';
dotenv.config();
// Exporta configurações do backend
export const PORT = process.env.PORT || 5000; // Porta do servidor Express
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'; // Origem permitida para CORS
export const GLPI_API_URL = process.env.GLPI_API_URL || 'XXXXXXXXXXXXXXX'; // URL da API GLPI
export const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN || 'XXXXXXXXXXXXXX'; // Token do aplicativo GLPI
