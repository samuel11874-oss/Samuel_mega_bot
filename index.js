const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();
const dataHoje = "16 de julho"; // Ajuste conforme o site exibir (ex: 16 Jul)

async function monitorarJogos() {
    try {
        console.log("--- Iniciando Varredura ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        
        // Vamos ler tudo que parecer um bloco de jogo
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Log para você ver o que o bot está lendo
            if (linha.includes(' x ')) {
                console.log(`Lendo linha: ${linha.substring(0, 60)}...`);
                
                // Validação de Data (Flexível)
                const ehHoje = linha.toLowerCase().includes("hoje") || linha.includes("16");
                
                if (!ehHoje) {
                    console.log(`-> Pulado (Data não é hoje): ${linha.substring(0, 30)}`);
                    return;
                }

                // Tenta extrair a média
                const numeros = linha.match(/\d{1,2}\.\d/g);
                if (numeros) {
                    const media = parseFloat(numeros[numeros.length - 1]);
                    if (media > 10.5) {
                        console.log(`-> JOGO ENCONTRADO! Média ${media}`);
                        
                        // Envio simples para testar
                        const msg = `🔥 Oportunidade: ${linha.substring(0, 50)} | Média: ${media}`;
                        bot.sendMessage(CHAT_ID, msg).catch(console.error);
                    } else {
                        console.log(`-> Média muito baixa: ${media}`);
                    }
                }
            }
        });
        console.log("--- Fim da Varredura ---");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
