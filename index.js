const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Estável'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Usaremos um Set para rastrear chaves únicas dos jogos
let jogosEnviados = new Set();

// Limpa o nome do jogo para virar uma chave única e sem erros
function gerarChave(texto) {
    return texto.toLowerCase().replace(/[^a-z]/g, '');
}

async function monitorarJogos() {
    console.log(`🔍 Varredura iniciada...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Procura por todas as linhas de tabela (tr), onde os jogos ficam listados
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text();
            
            // Procura o padrão "Time X Time"
            const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
            
            if (match) {
                const jogoOriginal = match[0].trim();
                const chaveUnica = gerarChave(jogoOriginal);
                
                // Extrai números de média
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Verifica se a média é válida e se a CHAVE única ainda não foi enviada
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                        jogosEnviados.add(chaveUnica);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade (FT)*\n\n` +
                                    `⚔️ *Jogo:* ${jogoOriginal}\n` +
                                    `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${jogoOriginal} | Chave: ${chaveUnica} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache a cada 24 horas para garantir que o bot não fique pesado
setInterval(() => { jogosEnviados.clear(); }, 86400000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
