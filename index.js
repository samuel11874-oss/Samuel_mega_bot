const express = require('express');
const axios = require('axios');
const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico de Rede'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function diagnosticarRede() {
    console.log(`🚀 [DEBUG] Iniciando tentativa de acesso ao site...`);
    
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 25000 // Aumentei o timeout para 25 segundos
        });
        
        console.log(`✅ [DEBUG] Sucesso! Status da página: ${response.status}`);
        console.log(`✅ [DEBUG] Conteúdo recebido com sucesso.`);
        
        // Verifica se existem tabelas no HTML retornado
        const cheerio = require('cheerio');
        const $ = cheerio.load(response.data);
        const totalTabelas = $('table').length;
        
        console.log(`📊 [DEBUG] Total de tabelas encontradas no HTML: ${totalTabelas}`);
        
        if (totalTabelas > 0) {
            console.log(`📌 [DEBUG] Exemplo da primeira tabela: ` + $('table').first().text().trim().substring(0, 100));
        }

    } catch (e) {
        console.error(`❌ [DEBUG] Erro ao acessar o site: ${e.message}`);
        if (e.response) {
            console.error(`❌ [DEBUG] Detalhes do erro: ${e.response.status}`);
        }
    }
}

diagnosticarRede();
