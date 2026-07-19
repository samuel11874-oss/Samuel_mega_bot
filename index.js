const express = require('express');
const axios = require('axios');
const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico'));
app.listen(process.env.PORT || 3000);

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorarJogos() {
    try {
        console.log("--- TENTANDO ACESSAR O SITE ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { 
            headers: HEADERS,
            timeout: 10000 
        });
        
        console.log("--- ACESSO COM SUCESSO! ---");
        console.log("Primeiros 500 caracteres da página:");
        console.log(response.data.substring(0, 500));
        
    } catch (e) {
        console.error("--- ERRO NA CONEXÃO ---");
        if (e.response) {
            console.error("Status do erro:", e.response.status);
            console.error("Conteúdo do erro:", e.response.data ? e.response.data.substring(0, 500) : "Sem conteúdo");
        } else {
            console.error("Mensagem:", e.message);
        }
    }
}

setInterval(monitorarJogos, 300000); 
monitorarJogos();
