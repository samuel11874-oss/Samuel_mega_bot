const express = require('express');
const axios = require('axios');
const app = express();
app.get('/', (req, res) => res.send('Modo Raio-X Ativo'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function extrairConteudo() {
    console.log(`🔍 Iniciando Raio-X do site...`);
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 25000
        });

        // Pegamos o texto limpo da página
        const textoBruto = response.data;
        
        // Imprimimos uma parte do conteúdo para eu analisar a estrutura
        console.log(`--- INÍCIO DO CONTEÚDO ---`);
        console.log(textoBruto.substring(0, 5000)); 
        console.log(`--- FIM DO CONTEÚDO ---`);

    } catch (e) {
        console.error("Erro no Raio-X:", e.message);
    }
}

extrairConteudo();
