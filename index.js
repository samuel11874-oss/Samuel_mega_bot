const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.get('/', (req, res) => res.send('Bot Debug: Busca de Classes'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function buscarClasses() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log("--- BUSCANDO ESTRUTURA ---");
        // Procura divs que contenham "x" (geralmente usado entre times)
        $('div').each((i, el) => {
            const texto = $(el).text();
            if (texto.includes(' x ')) {
                console.log(`Classe encontrada: ${$(el).attr('class')} | Conteúdo: ${texto.substring(0, 50).trim()}`);
            }
        });
        console.log("--- FIM DA BUSCA ---");
    } catch (e) { console.error("Erro:", e.message); }
}

setInterval(buscarClasses, 3600000);
buscarClasses();
