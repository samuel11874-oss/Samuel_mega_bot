const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Camuflagem Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Cabeçalhos que simulam um navegador real
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.soccerstats.com/results.asp?league=brazil',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

async function monitorarJogos() {
    try {
        console.log("Tentando conexão com SoccerStats...");
        const response = await axios.get('https://www.soccerstats.com/results.asp?league=brazil&pmtype=corners', { 
            headers: HEADERS,
            timeout: 10000 
        });
        
        const $ = cheerio.load(response.data);
        
        // Procurar por qualquer tabela que tenha a classe sortable
        const tabela = $('table.sortable');
        
        if (tabela.length === 0) {
            console.log("⚠️ FALHA: A tabela 'sortable' não foi encontrada. O site bloqueou o acesso.");
            return;
        }

        console.log("✅ SUCESSO: Estrutura da tabela encontrada. Analisando conteúdo...");
        
        tabela.find('tr').each((i, el) => {
            let texto = $(el).text().trim().replace(/\s+/g, ' ');
            // Se encontrar ' v ' ou ' x ', imprime
            if ((texto.includes(' v ') || texto.includes(' x ')) && texto.length > 20) {
                console.log(`LINHA ENCONTRADA: ${texto}`);
            }
        });

    } catch (e) {
        console.error("Erro na requisição:", e.message);
    }
}

setInterval(monitorarJogos, 60000);
monitorarJogos();

const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Debug Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorarJogos() {
    try {
        console.log("Iniciando busca...");
        const { data } = await axios.get('https://www.soccerstats.com/results.asp?league=brazil&pmtype=corners', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let contador = 0;
        
        // Vamos ler qualquer linha de tabela
        $('tr').each((i, el) => {
            let texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Debug: Imprimir as primeiras 10 linhas para vermos o formato
            if (contador < 10) {
                console.log(`LINHA ${contador}: ${texto.substring(0, 100)}`);
            }
            
            // Tenta achar qualquer jogo com "x" ou "v"
            if ((texto.includes(' x ') || texto.includes(' v ')) && texto.length > 10) {
                console.log(`JOGO ENCONTRADO NO DEBUG: ${texto}`);
            }
            
            contador++;
        });

        console.log("Varredura de Debug concluída.");
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 60000); // Roda a cada 1 minuto para testar
monitorarJogos();
