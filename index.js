const express = require('express');
const axios = require('axios');
const app = express();

app.get('/', (req, res) => res.send('Bot Especialista: Testando Fontes...'));
app.listen(process.env.PORT || 3000);

// Configuração simples para não exigir bot de Telegram agora, 
// o foco é ver os logs no console do Render.

async function testarConexoes() {
    console.log("🔍 [SISTEMA] Iniciando teste de conectividade nas 3 fontes...");

    const fontes = [
        { nome: 'WinDrawWin', url: 'https://www.windrawwin.com/br/estatisticas/escanteios/' },
        { nome: 'SoccerStats', url: 'https://www.soccerstats.com/home.asp' },
        { nome: 'FootyStats', url: 'https://footystats.org/br/previsao-de-futebol' }
    ];

    for (const fonte of fontes) {
        try {
            const response = await axios.get(fonte.url, { timeout: 10000 });
            if (response.status === 200) {
                console.log(`✅ [SUCESSO] ${fonte.nome} está respondendo.`);
            }
        } catch (error) {
            console.error(`❌ [ERRO] ${fonte.nome} não respondeu. Motivo: ${error.message}`);
        }
    }
    console.log("🔍 [SISTEMA] Ciclo de teste concluído.");
}

// Executa a cada 1 hora
setInterval(testarConexoes, 3600000);
testarConexoes();
