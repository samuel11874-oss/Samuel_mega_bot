const express = require('express');
const axios = require('axios');
const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico Ativo'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function diagnosticarSite() {
    try {
        console.log("--- INICIANDO DIAGNÓSTICO PROFUNDO ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { 
            headers: MOBILE_HEADERS,
            timeout: 20000 
        });

        // Imprime os primeiros 5000 caracteres do HTML recebido para eu ver
        console.log("--- INÍCIO DO HTML ---");
        console.log(response.data.substring(0, 5000)); 
        console.log("--- FIM DO HTML ---");
        
        // Verifica se existem tabelas no HTML
        const qtdTr = (response.data.match(/<tr/g) || []).length;
        console.log("Total de linhas <tr> encontradas no HTML cru:", qtdTr);

    } catch (e) {
        console.error("Erro na conexão:", e.message);
    }
}

setInterval(diagnosticarSite, 300000);
diagnosticarSite();
