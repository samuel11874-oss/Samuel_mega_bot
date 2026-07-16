const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios Limpo Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

// Identifica a data de hoje para filtrar
const hoje = new Date();
const dia = hoje.getDate().toString();
const mes = hoje.toLocaleString('pt-BR', { month: 'long' });
const dataHoje = `${dia} de ${mes}`; // Ex: "16 de julho"

async function monitorarJogos() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        $('div, tr, li').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // FILTRO 1: Data (Só aceita se for hoje ou se não tiver data)
            if (linha.includes(' de ') && !linha.includes(dataHoje)) {
                return; // Pula se tiver data e não for hoje
            }

            // FILTRO 2: Só processa se tiver confronto " x "
            if (linha.includes(' x ')) {
                
                // Extração dos dados numéricos (médias)
                const numeros = linha.match(/\d{1,2}\.\d/g);
                
                // EXTRAÇÃO DO CONFRONTO (A mágica da limpeza)
                // Procura apenas pelo padrão [Time] x [Time] e ignora o resto
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const matchConfronto = linha.match(regexConfronto);

                if (matchConfronto && numeros && numeros.length >= 3) {
                    const mediaTotal = parseFloat(numeros[numeros.length - 1]);
                    
                    if (mediaTotal > 10.5) {
                        const confronto = matchConfronto[0].trim(); // Pega apenas "Time x Time"
                        const liga = linha.split('ESTATÍSTICAS')[0].trim(); // Tenta pegar a liga

                        // Verifica duplicidade
                        if (!jogosEnviados.has(confronto)) {
                            jogosEnviados.add(confronto);
                            
                            const mensagem = `🔥 *Oportunidade de Cantos*\n` +
                                             `🏆 *Liga:* ${liga}\n` +
                                             `⚽ *Confronto:* ${confronto}\n` +
                                             `📊 *Média Total:* ${mediaTotal}`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                            console.log(`[ALERTA ENVIADO] ${confronto} -> ${mediaTotal}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na varredura:", e.message);
    }
}

// Roda a cada 15 minutos
setInterval(monitorarJogos, 900000); 
monitorarJogos();
