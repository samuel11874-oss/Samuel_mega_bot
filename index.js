const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.get('/', (req, res) => res.send('Bot Detetive Ativo'));
app.listen(process.env.PORT || 3000);

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function inspecionarElementos() {
    try {
        console.log("--- INICIANDO INSPEÇÃO DE ESTRUTURA ---");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Procura por qualquer elemento que tenha " x " no texto
        $('div, a, span, li, tr').each((i, el) => {
            const texto = $(el).text().trim();
            if (texto.includes(' x ') && texto.length < 100) {
                // Se encontrar um padrão, imprime a classe e a tag
                console.log(`[ALVO ENCONTRADO] Tag: ${el.tagName} | Class: ${$(el).attr('class')} | Texto: ${texto.substring(0, 50)}`);
                encontrados++;
            }
            // Limita a 20 resultados para não poluir o log
            if (encontrados >= 20) return false;
        });
        
        console.log(`--- INSPEÇÃO FINALIZADA. ${encontrados} alvos localizados. ---`);
    } catch (e) {
        console.error("Erro na inspeção:", e.message);
    }
}

setInterval(inspecionarElementos, 300000); 
inspecionarElementos();
