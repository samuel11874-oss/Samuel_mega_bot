const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.get('/', (req, res) => res.send('Bot Especialista: Extração Estruturada Ativa'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function processarDados() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        const jogosFormatados = [];
        $('.statln2').each((i, el) => {
            let texto = $(el).text().trim();
            // Remove datas (ex: "sábado, 18 de julho de 2026")
            texto = texto.replace(/(.*?)2026/, '').trim();
            
            // Regex para capturar o confronto e a linha (ex: Viking FK x Sandefjord 11)
            const match = texto.match(/(.*?\s?x\s?.*?)([0-9]{1,2})/);
            
            if (match) {
                jogosFormatados.push({
                    confronto: match[1].trim(),
                    linha: parseInt(match[2])
                });
            }
        });

        console.log("--- DADOS ESTRUTURADOS ---");
        console.log(jogosFormatados);
        
        // Exemplo de aplicação do seu filtro:
        const sugestoes = jogosFormatados.filter(j => j.linha >= 10);
        console.log("--- SUGESTÕES PARA ENTRADA (Linha >= 10) ---");
        console.log(sugestoes);
    } catch (e) {
        console.error("Erro no processamento:", e.message);
    }
}

setInterval(processarDados, 3600000);
processarDados();
