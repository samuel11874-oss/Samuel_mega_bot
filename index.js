const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Seção Estrita'));
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
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Estado da seção: 'aguardando', 'hoje', 'bloqueado'
        let estadoSecao = 'aguardando'; 

        // Vamos percorrer os elementos que contêm os jogos (geralmente linhas de tabela ou divs)
        $('div, tr').each((i, el) => {
            const textoElemento = $(el).text().trim().toLowerCase();
            
            // 1. Identifica se mudamos de seção
            if (textoElemento.includes('hoje')) {
                estadoSecao = 'hoje';
            } else if (['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo', 'amanhã'].some(dia => textoElemento.includes(dia))) {
                estadoSecao = 'bloqueado';
            }

            // 2. Só processa se estivermos na seção 'hoje' E tiver um confronto
            if (estadoSecao === 'hoje' && textoElemento.includes(' x ')) {
                const matchNumero = textoElemento.match(/(\d{2}[.,]\d)/);
                
                if (matchNumero) {
                    const valor = parseFloat(matchNumero[0].replace(',', '.'));

                    // Filtro de Média (10.6 a 15.0)
                    if (valor > 10.5 && valor <= 15.0) {
                        
                        const linhaLimpa = $(el).text().trim();
                        const matchConfronto = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const jogoFinal = matchConfronto[0].trim();
                            
                            if (!jogosEnviados.has(jogoFinal)) {
                                jogosEnviados.add(jogoFinal);

                                const mensagem = `⚽ *JOGO DE HOJE*\n` +
                                                 `⚔️ *Confronto:* ${jogoFinal}\n` +
                                                 `📊 *Média FT:* ${valor.toFixed(1)}\n` +
                                                 `━━━━━━━━━━━━━━`;

                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ ENVIADO HOJE: ${jogoFinal} | Média: ${valor}`);
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 

monitorarJogos();
