const express = require('express');
const axios = require('axios');

const app = express();
app.get('/', (req, res) => res.send('Modo Diagnóstico Ativo'));
app.listen(process.env.PORT || 3000);

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/',
};

async function diagnosticarSite() {
    console.log("--------------------------------------------------");
    console.log("[DIAGNÓSTICO] Baixando código fonte do site...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: HEADERS,
            timeout: 15000
        });
        
        // Vamos imprimir os primeiros 4000 caracteres do site no seu log do Render
        console.log("--- INÍCIO DO HTML DO SITE ---");
        console.log(data.substring(0, 4000)); 
        console.log("--- FIM DO HTML (PRIMEIROS 4000 CARACTERES) ---");
        
    } catch (e) {
        console.error("Erro ao acessar site:", e.message);
    }
}

diagnosticarSite();
