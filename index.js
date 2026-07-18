const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtrando apenas HOJE'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura com Filtro de Data (HOJE)...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let modoCaptura = false; // A chave que diz se estamos no "hoje"
        let encontrados = 0;

        // Itera sobre todos os elementos que podem ser linhas de jogo ou cabeçalhos
        $('tr, div, h2, h3').each((i, el) => {
            const texto = $(el).text().trim();
            const textoLower = texto.toLowerCase();

            // 1. Início da Cerca: Se achar "Hoje", ativa a captura
            if (textoLower.includes('hoje')) {
                modoCaptura = true;
            } 
            // 2. Fim da Cerca: Se achar "Amanhã" ou dias da semana, desativa
            else if (/(amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo)/.test(textoLower)) {
                modoCaptura = false;
            }

            // 3. Processamento (apenas se estiver dentro da cerca "Hoje")
            if (modoCaptura && texto.includes(' x ')) {
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
                
                if (match) {
                    const jogo = match[0].trim();
                    const trechoNumeros = texto.substring(match.index, match.index + 50);
                    const numeros = trechoNumeros.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 1) {
                        // Calcula média (garantindo que estamos pegando a média correta)
                        const media = parseFloat(numeros[0].replace(',', '.'));
                        const chaveUnica = jogo.toLowerCase().replace(/[^a-z]/g, '');
                        
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                            jogosEnviados.add(chaveUnica);
                            encontrados++;
                            
                            const msg = `⚽ *Oportunidade (HOJE)*\n\n` +
                                        `⚔️ *Jogo:* ${jogo}\n` +
                                        `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO (HOJE): ${jogo} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos de HOJE encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de jogos à meia-noite (00:00) para começar o dia limpo
setInterval(() => { 
    const horaAtual = new Date().getHours();
    if (horaAtual === 0) jogosEnviados.clear(); 
}, 3600000); 

setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
