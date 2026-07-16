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

        // No WinDrawWin, cada campeonato geralmente fica dentro de uma div/seção com uma classe de tabela
        // O nome da liga fica dentro de um cabeçalho que antecede ou rotula a tabela de estatísticas.
        $('table').each((indexTabela, tabela) => {
            // Tenta encontrar o título da liga que fica logo antes de cada tabela (geralmente h2, h3, ou uma div .wttr2 anterior)
            let ligaTexto = "";
            
            // Procura nos elementos irmãos anteriores à tabela pelo nome do campeonato
            let elementoAnterior = $(tabela).prev();
            while (elementoAnterior.length > 0 && !ligaTexto) {
                if (elementoAnterior.text().trim() !== "") {
                    ligaTexto = elementoAnterior.text().trim();
                }
                elementoAnterior = elementoAnterior.prev();
            }

            // Se não achou nos irmãos anteriores, procura na linha de cabeçalho interno da tabela
            if (!ligaTexto) {
                ligaTexto = $(tabela).find('thead tr th').first().text().trim() || $(tabela).find('.wttr2').text().trim();
            }

            // Se ainda assim não encontrar, define como Liga Desconhecida para prosseguir
            if (!ligaTexto) {
                ligaTexto = "Liga Alternativa";
            }

            // Valida se a liga atual está na nossa lista de permitidas
            const ligaValida = LIGAS_PERMITIDAS.find(liga => ligaTexto.toLowerCase().includes(liga.toLowerCase()));
            
            if (ligaValida) {
                // Varre as linhas da tabela de dados desse campeonato
                $(tabela).find('tr').each((i, el) => {
                    const colunas = $(el).find('td');
                    
                    // Se a linha tiver pelo menos 4 colunas (Time Casa, Time Fora, Média Total, Média HT)
                    if (colunas.length >= 4) {
                        const timeCasa = colunas.eq(0).text().trim();
                        const timeFora = colunas.eq(1).text().trim();
                        
                        // O WinDrawWin exibe:
                        // Coluna 2 (Índice 2): Média Total do Jogo (FT)
                        // Coluna 3 (Índice 3): Média no 1º Tempo (HT)
                        const textoFT = colunas.eq(2).text().trim().replace(',', '.');
                        const textoHT = colunas.eq(3).text().trim().replace(',', '.');

                        const mediaFT = parseFloat(textoFT) || 0;
                        const mediaHT = parseFloat(textoHT) || 0;

                        // Evita pegar linhas de cabeçalho que possam conter palavras como "Média", "Média Geral" ou "Equipe"
                        if (timeCasa && timeFora && 
                            !timeCasa.toLowerCase().includes('time') && 
                            !timeCasa.toLowerCase().includes('média') &&
                            !timeCasa.toLowerCase().includes('equipe')) {
                            
                            const confronto = `${timeCasa} vs ${timeFora}`;
                            
                            // LOG DE DEPURAÇÃO: Agora você vai ver cada jogo testado no painel do Render!
                            console.log(`[ANALISANDO] ${ligaValida} -> ${confronto} (FT: ${mediaFT} | HT: ${mediaHT})`);

                            // Aplica os filtros: FT > 10 e HT > 4
                            if (mediaFT > 10 && mediaHT > 4) {
                                encontrados++;
                                const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(confronto)}`;
                                
                                const mensagem = `
🔥 *ALERTA DE OPORTUNIDADE* 🔥

🌍 *Liga:* ${ligaTexto}
⚽ *Confronto:* [${confronto}](${linkBusca})

📈 *Média FT:* \`${mediaFT.toFixed(2)}\` escanteios *(Meta: > 10)*
⏱️ *Média HT:* \`${mediaHT.toFixed(2)}\` escanteios *(Meta: > 4)*

🔔 *Status:* Jogo qualificado dentro de todos os parâmetros!
                                `;
                                
                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown', disable_web_page_preview: true });
                                console.log(`[ALERTA ENVIADO] Jogo qualificado enviado ao Telegram: ${confronto}`);
                            }
                        }
                    }
                });
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
