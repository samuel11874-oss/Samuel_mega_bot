const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Sistema Blindado'));
app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor Express iniciado com sucesso.");
});

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

// 1. Ligas de 1ª e 2ª Divisão pelo mundo + 1ª, 2ª e 3ª do Brasil
const LIGAS_PERMITIDAS = [
    'Premier League', 'Championship', // Inglaterra
    'La Liga', 'Segunda Division', // Espanha
    'Serie A', 'Serie B', // Itália
    'Bundesliga', '2. Bundesliga', // Alemanha
    'Ligue 1', 'Ligue 2', // França
    'Eredivisie', 'Eerste Divisie', // Holanda
    'Primeira Liga', 'Segunda Liga', // Portugal
    'Brasileirão Série A', 'Brasileirão Série B', 'Brasileirão Série C', // Brasil
    'Champions League', 'Libertadores', 'Sudamericana' // Copas
];

async function monitorarJogos() {
    // Log para você visualizar no painel do Render que o bot está ativo
    console.log("--------------------------------------------------");
    console.log(`[MONITORANDO JOGOS...] Iniciando nova varredura em busca de oportunidades...`);
    console.log("--------------------------------------------------");

    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        
        $('table tr').each((i, el) => {
            const linha = $(el);
            const nomeLiga = linha.find('.wttr2').text().trim();
            
            // Verifica se a liga faz parte do nosso filtro de elite e divisões permitidas
            const ligaValida = LIGAS_PERMITIDAS.find(liga => nomeLiga.toLowerCase().includes(liga.toLowerCase()));
            
            if (ligaValida) {
                const timeCasa = linha.find('.wtteam1').text().trim();
                const timeFora = linha.find('.wtteam2').text().trim();
                
                // Extrai os valores numéricos das estatísticas do WinDrawWin para FT e HT
                const mediaFT = parseFloat(linha.find('td').eq(3).text().trim()) || 0;
                const mediaHT = parseFloat(linha.find('td').eq(4).text().trim()) || 0;
                
                if (timeCasa && timeFora) {
                    const confronto = `${timeCasa} vs ${timeFora}`;
                    
                    // 2. Critério: Média FT > 10 E 3. Critério: Média HT > 4
                    if (mediaFT > 10 && mediaHT > 4) {
                        encontrados++;
                        const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(confronto)}`;
                        
                        const mensagem = `
🔥 *ALERTA DE OPORTUNIDADE* 🔥

🌍 *Liga:* ${nomeLiga}
⚽ *Confronto:* [${confronto}](${linkBusca})

📈 *Média FT:* \`${mediaFT.toFixed(2)}\` escanteios *(Meta: > 10)*
⏱️ *Média HT:* \`${mediaHT.toFixed(2)}\` escanteios *(Meta: > 4)*

🔔 *Status:* Jogo qualificado dentro de todos os parâmetros!
                        `;
                        
                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
                        console.log(`[ALERTA ENVIADO] Jogo localizado e enviado ao Telegram: ${confronto}`);
                    }
                }
            }
        });
        
        console.log(`[VARREDURA CONCLUÍDA] Processo finalizado. Total de jogos disparados nesta rodada: ${encontrados}`);
    } catch (e) {
        console.error("[ERRO NO MONITORAMENTO]:", e.message);
    }
}

// Roda a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
