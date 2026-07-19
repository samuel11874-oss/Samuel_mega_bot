const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Investigação Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorarJogos() {
    try {
        console.log("--- INICIANDO BUSCA ---");
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let contagem = 0;

        // Vamos inspecionar todas as linhas da tabela (tr)
        $('tr').each((i, el) => {
            const texto = $(el).text().trim();
            
            // LOG DE INVESTIGAÇÃO: O bot vai imprimir no seu log do Render o que ele está vendo
            if (texto.includes(' x ')) {
                console.log(`Linha encontrada: ${texto.substring(0, 50)}...`);
                
                // Tenta extrair qualquer coisa que tenha um " x "
                const partes = texto.split(' x ');
                if (partes.length >= 2) {
                    const timeA = partes[0].trim();
                    const timeB = partes[1].trim();
                    
                    // Procura números na linha (ex: 10.5)
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        
                        // Envio direto para testar se funciona
                        const msg = `⚽ *Teste Bot*\n⚔️ *${timeA} x ${timeB}*\n📊 *Média: ${media.toFixed(1)}*`;
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => console.log("Erro Telegram:", e.message));
                        contagem++;
                    }
                }
            }
        });
        
        console.log(`--- BUSCA FINALIZADA. Jogos encontrados: ${contagem} ---`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Roda a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
