const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Estrutura Dinâmica'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 25000
        });

        const $ = cheerio.load(response.data);
        
        // Buscamos todos os elementos 'div' que podem conter jogos
        let emSecaoHoje = false;
        const textoDaPagina = $('body').text(); // Pegamos o texto bruto para análise

        // Vamos percorrer os blocos principais
        $('div').each((i, el) => {
            const bloco = $(el).text().trim();
            const texto = bloco.toLowerCase();

            // Identifica se estamos na seção de "Hoje"
            if (texto.includes('hoje')) {
                emSecaoHoje = true;
            } else if (['amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo', 'jan', 'fev'].some(d => texto.includes(d))) {
                emSecaoHoje = false;
            }

            // Se for seção de hoje e tiver um confronto
            if (emSecaoHoje && texto.includes(' x ')) {
                const matchConfronto = bloco.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
                
                if (matchConfronto) {
                    const jogoFinal = matchConfronto[0].trim();
                    // Captura média (dois números com vírgula ou ponto)
                    const numeros = bloco.match(/(\d{1,2}[.,]\d)/g);
                    
                    let media = 0;
                    if (numeros && numeros.length >= 2) {
                        media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    }

                    // Filtro 9.5 a 15.0
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoFinal)) {
                        jogosEnviados.add(jogoFinal);
                        bot.sendMessage(CHAT_ID, `⚽ *Oportunidade Encontrada*\n\n⚔️ ${jogoFinal}\n📊 Média de escanteios FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' });
                        console.log(`✅ ENVIADO: ${jogoFinal} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa cache a cada 2 horas
setInterval(() => { jogosEnviados.clear(); }, 7200000); 

// Roda a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
