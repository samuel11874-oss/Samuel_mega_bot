const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Linhas'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function monitorarJogos() {
    console.log(`🔍 Iniciando busca direta nas tabelas...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        
        const $ = cheerio.load(data);
        let encontrados = 0;

        // Foca em todas as linhas (tr) da tabela
        $('tr').each((i, el) => {
            const linha = $(el).text();
            
            // Verifica se a linha tem o formato de jogo (Time x Time)
            if (linha.includes(' x ')) {
                const matchConfronto = linha.match(/([A-Za-zÀ-ÿ0-9\s]{4,})\sx\s([A-Za-zÀ-ÿ0-9\s]{4,})/);
                
                if (matchConfronto) {
                    const jogo = matchConfronto[0].trim();
                    const numeros = linha.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        
                        // Envia se estiver dentro da regra
                        if (media > 9.5 && media <= 15.0) {
                            encontrados++;
                            bot.sendMessage(CHAT_ID, `⚽ *Oportunidade*\n\n⚔️ ${jogo}\n📊 Média FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' })
                               .catch(e => console.log("Erro envio:", e.message));
                            
                            console.log(`✅ ENVIADO: ${jogo} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Jogos enviados nesta rodada: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); // Roda a cada 5 minutos
monitorarJogos();
