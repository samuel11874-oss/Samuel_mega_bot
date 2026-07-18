const express = require('express');
const axios = require('axios');
const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico de Estrutura'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function inspecionarSite() {
    console.log(`🔍 Buscando estrutura da página...`);
    
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 25000
        });
        
        // Vamos imprimir os primeiros 2000 caracteres do HTML da página
        console.log(`--- INÍCIO DO CÓDIGO HTML ---`);
        console.log(response.data.substring(0, 2000));
        console.log(`--- FIM DO CÓDIGO HTML ---`);

    } catch (e) {
        console.error(`❌ Erro: ${e.message}`);
    }
}

inspecionarSite();
