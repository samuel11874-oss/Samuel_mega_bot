const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Processamento Seguro'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        // Pega o conteúdo da página e divide linha por linha
        const linhas = $('body').text().split('\n');
        let encontrados = 0;

        for (let linha of linhas) {
            // Apenas analisa linhas que contenham " x "
            if (!linha.includes(' x ')) continue;

            // Divide a linha pelo " x "
            const partes = linha.split(' x ');
            if (partes.length < 2) continue;

            const timeA = partes[0].trim();
            // Pega o time B e limpa qualquer "sujeira" que vier depois dele (como nome do campeonato)
            // Para quando encontra um número (estatística)
            const timeBCompleto = partes[1].trim();
            const timeB = timeBCompleto.split(/[0-9]/)[0].trim(); 

            // Validação simples: nomes precisam ter tamanho mínimo
            if (timeA.length < 3 || timeB.length < 3) continue;

            // Busca os números na linha original
            const numeros = linha.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                
                if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    
                    const msg = `⚽ *Oportunidade*\n` +
                                `⚔️ *${timeA} x ${timeB}*\n` +
                                `📊 *Média: ${media.toFixed(1)}*`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                }
            }
        }
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 7200000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
