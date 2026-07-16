const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional: Sistema de Filtro Avançado'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// ==========================================
// CONFIGURAÇÃO DE OPERAÇÃO (Mude aqui quando quiser)
// ==========================================
const MODO_TESTE = false; // Mude para true para testar com QUALQUER jogo do site
const LIMITE_MENSAGENS_TESTE = 5; // Evita spam se o modo teste estiver ativo
// ==========================================

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

const LIGAS_ELITE = [
    'Premier League', 'Championship', 'La Liga', 'Serie A', 'Bundesliga', 
    'Ligue 1', 'Brasileirão Série A', 'Brasileirão Série B', 'Champions League', 
    'Libertadores', 'Eredivisie', 'Primeira Liga'
];

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log(`[MONITORANDO JOGOS] Modo: ${MODO_TESTE ? 'TESTE (Sem Filtros)' : 'OPERAÇÃO REAL (Elite + Cantos)'}`);

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        $('.wttr2, [class*="statln"]').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoOriginal = $(el).text().trim();
            const textoLimpo = textoOriginal.replace(/\s+/g, ' ');

            // 1. Identifica e atualiza a liga atual do bloco
            if (classeOriginal.includes('wttr2')) {
                ligaAtual = textoLimpo;
            } 
            // 2. Identifica se é uma linha de jogo
            else if (classeOriginal.includes('statln')) {
                
                // FILTRO DE SEGURANÇA: Só aceita se for jogo real (contém " x ") e não for cabeçalho de estatística
                const ehJogoReal = textoLimpo.includes(' x ');
                const ehCabecalho = textoLimpo.includes('ESTATÍSTICAS') || textoLimpo.includes('Menos/Mais') || textoLimpo.includes('Handicap');

                if (ehJogoReal && !ehCabecalho) {
                    totalAnalisados++;

                    // Se estiver em modo teste, dispara direto respeitando o limite
                    if (MODO_TESTE) {
                        if (totalDisparados < LIMITE_MENSAGENS_TESTE) {
                            enviarAlerta(ligaAtual, textoLimpo, "Modo Teste (Livre)");
                            totalDisparados++;
                        }
                    } 
                    // Se estiver em modo operacional, aplica suas regras rígidas
                    else {
                        const passaLiga = LIGAS_ELITE.some(liga => ligaAtual.includes(liga));
                        // Busca se na linha constam médias altas de escanteio (>10)
                        const passaCantos = textoLimpo.includes('10') || textoLimpo.includes('11') || textoLimpo.includes('12') || textoLimpo.includes('13') || textoLimpo.includes('14');

                        if (passaLiga && passaCantos) {
                            enviarAlerta(ligaAtual, textoLimpo, "Média >10 Cantos | Potencial Gols");
                            totalDisparados++;
                        }
                    }
                }
            }
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos REAIS analisados: ${totalAnalisados}`);
        console.log(`>> Total de alertas disparados: ${totalDisparados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro no monitoramento:", e.message);
    }
}

function enviarAlerta(liga, confronto, criterio) {
    const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(confronto)}`;
    
    const mensagem = `
🏆 *Oportunidade Identificada*
🌍 *Liga:* ${liga}
⚽ *Confronto:* [${confronto}](${linkBusca})
🎯 *Critério:* ${criterio}
🔔 *Status:* Monitorar entrada de valor!
    `;
    
    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' })
       .then(() => console.log(`[SUCESSO] Alerta enviado: ${confronto}`))
       .catch(err => console.error(`[ERRO TELEGRAM] Falha ao enviar:`, err.message));
}

// Executa a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
