const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Estatísticas SoccerStats Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Identidade para o site não bloquear
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': 'https://www.soccerstats.com/'
};

async function buscarJogosEstatistica() {
    try {
        console.log("Acessando SoccerStats...");
        // URL dos jogos de hoje
        const { data } = await axios.get('https://www.soccerstats.com/matches.asp?matchday=1', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        
        // Estrutura de tabela padrão do SoccerStats
        $('table[id="btable"]').find('tr').each((i, el) => {
            const linha = $(el).text().trim();
            
            // Filtro por média > 9.5 (Logica simplificada baseada na estrutura da tabela)
            // Aqui buscamos o padrão de "Time A x Time B" e os números de escanteios
            if (linha.includes(' x ')) {
                // Se o bot encontrar o jogo, ele extrai a média (assumindo que a coluna de escanteios está presente)
                // Nota: O SoccerStats usa tabelas fixas.
                const t1 = $(el).find('.home').text().trim();
                const t2 = $(el).find('.away').text().trim();
                
                // Extração básica (O código vai evoluir conforme o log)
                console.log(`Analisando: ${t1} x ${t2}`);
                
                // Aqui entraria a regra de negócio (se média > 9.5)
                // Por enquanto, vamos logar para garantir que o bot está lendo a tabela
            }
        });
        
        console.log("Busca concluída.");
        
    } catch (e) {
        console.error("Erro na leitura do SoccerStats:", e.message);
    }
}

// Rodar a cada 30 minutos
setInterval(buscarJogosEstatistica, 1800000);
buscarJogosEstatistica();
