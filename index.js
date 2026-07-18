const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Diagnóstico'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function monitorarJogos() {
    try {
        console.log("--- Iniciando nova varredura ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        let countLinhas = 0;

        // Varrer todas as tabelas
        $('table').each((i, table) => {
            $(table).find('tr').each((j, row) => {
                const linhaTexto = $(row).text().trim().replace(/\s+/g, ' ');
                
                // DEBUG: Isso vai aparecer nos seus Logs do Render
                // Se não aparecer nada aqui, o bot não está acessando a tabela correta
                if (linhaTexto.includes(' x ')) {
                    countLinhas++;
                    console.log(`Linha detectada (${countLinhas}): ${linhaTexto}`);

                    // Regex para pegar qualquer número com ponto ou vírgula
                    const statsMatch = linhaTexto.match(/(\d{1,2}[.,]\d+)/);
                    
                    if (statsMatch) {
                        const media = parseFloat(statsMatch[0].replace(',', '.'));
                        
                        // Critério: Média > 10.5
                        if (media > 10.5) {
                            console.log(`>>> JOGO DENTRO DO FILTRO: ${linhaTexto} (Média: ${media})`);
                            
                            const mensagem = 
`⚽ *OPORTUNIDADE DE CANTO*\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`⚔️ *Partida:* ${linhaTexto.split(' x ')[0].split(' ').pop()} x ${linhaTexto.split(' x ')[1].split(' ')[0]}\n` +
`📈 *Média FT:* ${media.toFixed(1)}\n` +
`📅 *Data:* 17/07\n` +
`━━━━━━━━━━━━━━━━━━`;

                            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        }
                    }
                }
            });
        });
        
        console.log(`Varredura finalizada. Total de linhas com jogos analisadas: ${countLinhas}`);

    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); 
monitorarJogos();
