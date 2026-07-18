const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Captura Primeiro'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim();
            
            // 1. Regex simples: Pega o texto que contém " X " (ou " x ")
            const match = linhaTexto.match(/([A-Za-zÀ-ÿ0-9\s]{4,})\s[xX]\s([A-Za-zÀ-ÿ0-9\s]{4,})/);
            
            if (match) {
                const timeA = match[1].trim();
                const timeB = match[2].trim();
                
                // 2. Extrai a média dos números contidos na linha
                const numeros = linhaTexto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // 3. Verificação de data (evita dias futuros)
                    const ehDiaFuturo = /(amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo|2026)/i.test(linhaTexto);
                    
                    // 4. Chave única
                    const chaveUnica = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                    
                    // Condição: Média correta + Não é dia futuro (a menos que a linha esteja confusa) + Jogo novo
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                        
                        // Se for dia futuro, loga, mas não envia (ou envia se preferir, mas aqui bloqueamos)
                        if (ehDiaFuturo) {
                            console.log(`⚠️ Jogo detectado em dia futuro, ignorado: ${timeA} x ${timeB}`);
                            return;
                        }

                        jogosEnviados.add(chaveUnica);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                    `⚔️ *Jogo:* ${timeA} x ${timeB}\n` +
                                    `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta a lista a cada 6 horas
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
