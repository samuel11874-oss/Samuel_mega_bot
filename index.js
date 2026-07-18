const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.get('/', (req, res) => res.send('Bot de Mapeamento Ativo'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function mapearSite() {
    try {
        console.log(`🔍 Iniciando Mapeamento de Estrutura...`);
        
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos listar todas as tabelas (onde ficam os jogos) e suas classes
        $('table').each((i, el) => {
            const classe = $(el).attr('class') || "Sem classe";
            const primeiraLinha = $(el).find('tr').first().text().trim().substring(0, 50);
            console.log(`📌 TABELA ${i} | Classe: ${classe}`);
            console.log(`   Conteúdo inicial: ${primeiraLinha}...`);
        });

    } catch (e) {
        console.error("❌ ERRO no mapeamento:", e.message);
    }
}

mapearSite();
