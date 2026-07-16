const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Sistema Blindado'));
app.listen(process.env.PORT || 3000, () => {
    console.log(`[SERVIDO] Servidor rodando na porta ${process.env.PORT || 3000}`);
});

// Configuração de segurança das chaves (Cadastre no Render em "Environment Variables")
const TOKEN = process.env.TELEGRAM_TOKEN || '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive'
};

// 1. Filtro de Ligas (1ª e 2ª Divisão Mundial + Brasileirão Série A, B e C)
const LIGAS_PERMITIDAS = [
    'Premier League', 'Championship', // Inglaterra 1 e 2
    'La Liga', 'Segunda Division', // Espanha 1 e 2
    'Serie A', 'Serie B', // Itália 1 e 2
    'Bundesliga', '2. Bundesliga', // Alemanha 1 e 2
    'Ligue 1', 'Ligue 2', // França 1 e 2
    'Eredivisie', 'Eerste Divisie', // Holanda 1 e 2
    'Primeira Liga', 'Segunda Liga', // Portugal 1 e 2
    'Brasileirão Série A', 'Brasileirão Série B', 'Brasileirão Série C', // Brasil 1, 2 e 3
    'Champions League', 'Libertadores', 'Sudamericana' // Copas Continentais
];

async function monitorarJogos() {
    console.log("\n==================================================");
    console.log(`[MONITORANDO] Iniciando varredura de jogos - ${new Date().toLocaleTimeString()}`);
    console.log("==================================================");

    try {
        // Faz a busca na página de estatísticas de escanteios do WinDrawWin
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 20000 });
        const $ = cheerio.load(data);
        
        let jogosEncontrados = 0;

        // Itera sobre as linhas de dados do site (geralmente tabelas com classe .wttr ou estruturas tr)
        $('table tr').each((i, el) => {
            const linha = $(el);
            const ligaTexto = linha.find('.wttr2').text().trim();
            
            // Verifica se a liga faz parte do nosso filtro de elite
            const ligaValida = LIGAS_PERMITIDAS.find(liga => ligaTexto.toLowerCase().includes(liga.toLowerCase()));

            if (ligaValida) {
                // Captura os dados do jogo, média total de escanteios (FT) e média no primeiro tempo (HT)
                const timeCasa = linha.find('.wtteam1').text().trim();
                const timeFora = linha.find('.wtteam2').text().trim();
                
                // Extração dos valores numéricos das estatísticas do site
                // Nota: Ajuste os seletores se o layout do site mudar. Geralmente o WinDrawWin usa tds específicos para as médias.
                const mediaTotalFT = parseFloat(linha.find('td').eq(3).text().trim()) || 0; // Exemplo de coluna para FT
                const mediaTotalHT = parseFloat(linha.find('td').eq(4).text().trim()) || 0; // Exemplo de coluna para HT

                const confronto = `${timeCasa} vs ${timeFora}`;

                if (timeCasa && timeFora) {
                    console.log(`[ANALISANDO] Liga: ${ligaValida} | Jogo: ${confronto} | FT: ${mediaTotalFT} | HT: ${mediaTotalHT}`);

                    // 2. Critério FT > 10 escanteios E 3. Critério HT > 4 escanteios
                    if (mediaTotalFT > 10 && mediaTotalHT > 4) {
                        jogosEncontrados++;
                        const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(confronto)}`;
                        
                        const mensagem = `
🔥 *OPORTUNIDADE DE OURO ENCONTRADA* 🔥

🌍 *Liga:* ${ligaValida}
⚽ *Confronto:* [${confronto}](${linkBusca})

📊 *Estatísticas Identificadas:*
📈 *Média de Escanteios FT:* \`${mediaTotalFT.toFixed(2)}\` *(Meta: >10.0)*
⏱️ *Média de Escanteios HT:* \`${mediaTotalHT.toFixed(2)}\` *(Meta: >4.0)*

🔔 *Status:* Jogo altamente favorável para o mercado de escanteios!
`;
                        
                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
                        console.log(`[ALERTA ENVIADO] ${confronto} atingiu os critérios!`);
                    }
                }
            }
        });

        if (jogosEncontrados === 0) {
            console.log("[STATUS] Varredura finalizada. Nenhum jogo atendeu aos critérios nesta rodada.");
        } else {
            console.log(`[STATUS] Varredura finalizada. ${jogosEncontrados} alertas disparados!`);
        }

    } catch (e) {
        console.error("[ERRO NA ANÁLISE]:", e.message);
    }
}

// Roda o monitoramento a cada 60 minutos
setInterval(monitorarJogos, 3600000);

// Executa imediatamente ao iniciar o servidor
monitorarJogos();
