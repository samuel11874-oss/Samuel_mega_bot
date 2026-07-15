const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.get('/', (req, res) => res.send('Bot Ativo: Captura Final'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function capturarDados() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        const listaJogos = [];
        $('.statln2').each((i, el) => {
            const texto = $(el).text().trim();
            if (texto) {
                listaJogos.push(texto);
            }
        });

        console.log("--- LISTA DE JOGOS CAPTURADOS ---");
        console.log(listaJogos);
        console.log("--- FIM DA LISTA ---");
    } catch (e) {
        console.error("Erro na captura:", e.message);
    }
}

setInterval(capturarDados, 3600000);
capturarDados();
