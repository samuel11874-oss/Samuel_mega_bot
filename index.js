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
    'Connection': 'keep-alive'
};

// Ligas de 1ª e 2ª Divisão pelo mundo + 1ª, 2ª e 3ª do Brasil
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
    console.log("--------------------------------------------------");
    console.log(`[MONITORANDO JOGOS...] Iniciando nova varredura em busca de oportunidades...`);
    console.log("--------------------------------------------------");

    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 20000 });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        let ligaAtual = "";

        // No WinDrawWin, a estrutura de tabelas de estatísticas usa divs com classes específicas ou tabelas sequenciais.
        // Varremos o container principal de estatísticas para não perder nenhuma linha de jogo.
        $('tr').each((i, el) => {
            const elemento = $(el);

            // Verifica se a linha atual define uma Liga/Cabeçalho
            if (elemento.hasClass('wttr2') || elemento.find('.wttr2').length > 0) {
                ligaAtual = elemento.text().trim();
                return; // Pula para a próxima linha para ler os jogos dessa liga
            }

            // Se já temos uma liga definida, vamos checar os dados das partidas dela
            if (ligaAtual) {
                // Valida se a liga atual está na nossa lista de permitidas
                const ligaValida = LIGAS_PERMITIDAS.find(liga => ligaAtual.toLowerCase().includes(liga.toLowerCase()));
                
                if (ligaValida) {
                    // Seleciona as colunas de dados da linha atual
                    const colunas = elemento.find('td');
                    
                    if (colunas.length >= 5) {
                        // O WinDrawWin costuma organizar: Time Casa | Time Fora | Média Casa | Média Fora | Média Geral (FT) | Média HT
                        // Pegamos os times de forma segura limpando o texto
                        const timeCasa = colunas.eq(0).text().trim();
                        const timeFora = colunas.eq(1).text().trim();
                        
                        // Captura as estatísticas com base na posição padrão das colunas do WinDrawWin para cantos
                        // FT (Geralmente coluna 4 ou 5) e HT (Geralmente a coluna subsequente)
                        const textoFT = colunas.eq(4).text().trim().replace(',', '.');
                        const textoHT = colunas.eq(5).text().trim().replace(',', '.');

                        const mediaFT = parseFloat(textoFT) || 0;
                        const mediaHT = parseFloat(textoHT) || 0;

                        if (timeCasa && timeFora && !timeCasa.toLowerCase().includes('time') && !timeCasa.toLowerCase().includes('média')) {
                            const confronto = `${timeCasa} vs ${timeFora}`;
                            
                            // Log de depuração interna no Render para você ver o bot trabalhando
                            console.log(`[ANALISANDO] ${ligaValida} -> ${confronto} (FT: ${mediaFT} | HT: ${mediaHT})`);

                            // Filtros atualizados de forma restrita: FT > 10 e HT > 4
                            if (mediaFT > 10 && mediaHT > 4) {
                                encontrados++;
                                const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(confronto)}`;
                                
                                const mensagem = `
🔥 *ALERTA DE OPORTUNIDADE* 🔥

🌍 *Liga:* ${ligaAtual}
⚽ *Confronto:* [${confronto}](${linkBusca})

📈 *Média FT:* \`${mediaFT.toFixed(2)}\` escanteios *(Meta: > 10)*
⏱️ *Média HT:* \`${mediaHT.toFixed(2)}\` escanteios *(Meta: > 4)*

🔔 *Status:* Jogo qualificado dentro de todos os parâmetros!
                                `;
                                
                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
                                console.log(`[ALERTA ENVIADO] Jogo qualificado enviado: ${confronto}`);
                            }
                        }
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
