const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Apenas Jogos de Hoje'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Lista de palavras proibidas que aparecem no nome do time
const sujos = ["Noruega", "Brasileirão", "EUA", "China", "Finlândia", "Chil", "Índia", "Suécia", "Brasil", "Hoje", "Partida", "Liga", "TotalPró", "Amanhã"];

function limparNome(nome) {
    let nomeLimpo = nome;
    sujos.forEach(palavra => {
        const regex = new RegExp(palavra, "gi");
        nomeLimpo = nomeLimpo.replace(regex, "");
    });
    // Remove espaços extras e caracteres estranhos no final
    return nomeLimpo.replace(/[\|–\-\.\s]+$/, "").trim();
}

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        // LEITURA INTELIGENTE: Pega o texto e corta exatamente onde começa "Amanhã"
        const fullText = $('body').text();
        const textoHoje = fullText.split(/amanhã|tomorrow/i)[0]; 

        // Regex busca por "Time A x Time B" garantindo que não pegue sujeira
        const regexJogo = /([A-Za-zÀ-ÿ\s]{3,20})\s?x\s?([A-Za-zÀ-ÿ\s]{3,20})/gi;
        
        let match;
        let encontrados = 0;

        while ((match = regexJogo.exec(textoHoje)) !== null) {
            let timeA = limparNome(match[1]);
            let timeB = limparNome(match[2]);
            
            // Filtro rigoroso: nomes precisam ter tamanho mínimo
            if (timeA.length < 3 || timeB.length < 3) continue;

            // Busca estatística logo após o nome do jogo
            const trecho = textoHoje.substring(match.index, match.index + 80);
            const numeros = trecho.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                
                // Filtro de Média (seu critério)
                if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    
                    const msg = `⚽ *Oportunidade de Hoje*\n` +
                                `⚔️ *${timeA} x ${timeB}*\n` +
                                `📊 *Média: ${media.toFixed(1)}*`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                }
            }
        }
        console.log(`🔍 Varredura concluída. Novos jogos hoje: ${encontrados}`);
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reset diário (a cada 6 horas) e checagem a cada 5 minutos
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); 
monitorarJogos();
