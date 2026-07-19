const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Linha a Linha Otimizado'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Lista de palavras que devem ser removidas dos nomes
const sujos = ["Noruega", "Brasileirão", "EUA", "China", "Finlândia", "Chil", "Índia", "Suécia", "Brasil", "Hoje", "Partida", "Liga", "TotalPró", "eirã", "e"];

function limparNome(nome) {
    let nomeLimpo = nome;
    sujos.forEach(palavra => {
        const regex = new RegExp(palavra, "gi");
        nomeLimpo = nomeLimpo.replace(regex, "");
    });
    return nomeLimpo.replace(/[\|–\-\.\s]+$/, "").trim();
}

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;

        // Itera sobre cada linha da tabela
        $('tr').each((i, element) => {
            const linha = $(element).text();

            // REGRA DE OURO: Se encontrar "Amanhã" ou "Tomorrow", para a leitura aqui
            if (/amanhã|tomorrow/i.test(linha)) return false;

            // Só processa linhas que contêm o separador de jogo
            if (linha.includes(' x ')) {
                // Tenta extrair nomes antes e depois do 'x'
                const regex = /([A-Za-zÀ-ÿ\s]{3,20})\s?x\s?([A-Za-zÀ-ÿ\s]{3,20})/i;
                const match = linha.match(regex);
                
                if (match) {
                    let timeA = limparNome(match[1]);
                    let timeB = limparNome(match[2]);
                    
                    if (timeA.length < 3 || timeB.length < 3) return;

                    // Busca números na linha
                    const numeros = linha.match(/(\d{1,2}[.,]\d)/g);
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                        
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                            jogosEnviados.add(chave);
                            encontrados++;
                            
                            const msg = `⚽ *Oportunidade*\n` +
                                        `⚔️ *${timeA} x ${timeB}*\n` +
                                        `📊 *Média: ${media.toFixed(1)}*`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos hoje: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache a cada 6h, checa a cada 5 min
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
