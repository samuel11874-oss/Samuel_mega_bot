const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Teste: Todos os Critérios Removidos'));
app.listen(process.env.PORT || 3000);

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

async function monitorarJogos() {
    try {
        console.log("--------------------------------------------------");
        console.log("[TESTE ATIVADO] Iniciando varredura sem critérios de liga/cantos...");

        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        // --- DIAGNÓSTICO DETALHADO (RAIO-X) ---
        console.log("=== DIAGNÓSTICO DO HTML ===");
        console.log("Título da página: " + $('title').text().trim());
        console.log("Tamanho do HTML: " + data.length + " caracteres");
        
        // Contagem de elementos para verificar estrutura
        console.log("Total de tabelas (<table>): " + $('table').length);
        console.log("Total de linhas (<tr>): " + $('tr').length);
        console.log("Linhas com classe 'wttr2' (Ligas): " + $('.wttr2').length);
        console.log("Linhas com classe contendo 'statln' (Jogos): " + $('tr[class*="statln"]').length);
        
        // Prévia do texto para identificar bloqueios ocultos (como Cloudflare)
        const bodyPreview = $('body').text().replace(/\s+/g, ' ').substring(0, 500);
        console.log("Início do texto do Body: " + bodyPreview);
        console.log("===========================");

        let totalAnalisados = 0;
        let totalDisparados = 0;
        let ligaAtual = "Liga Não Identificada";

        $('tr').each((i, el) => {
            const classeOriginal = $(el).attr('class') || '';
            const textoLinha = $(el).text().trim().replace(/\s+/g, ' ');

            // Identifica a liga
            if (classeOriginal.includes('wttr2')) {
                ligaAtual = textoLinha;
            } 
            // Identifica o jogo (captura statln, statln1, statln2)
            else if (classeOriginal.includes('statln')) {
                totalAnalisados++;
                
                // CRITÉRIO DE TESTE: Sem travas! Dispara os primeiros 5 jogos para teste de conexão
                if (totalDisparados < 5) {
                    const linkBusca = `https://www.google.com/search?q=bet365+${encodeURIComponent(textoLinha)}`;
                    
                    const mensagem = `
🧪 *TESTE DE FUNCIONAMENTO*
🌍 *Liga:* ${ligaAtual}
⚽ *Confronto:* [${textoLinha}](${linkBusca})
🎯 *Filtro:* Potencial mais de 0.5 Gols (Geral)
🔔 *Status:* Disparado para teste de conexão!
                    `;
                    
                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' })
                       .then(() => console.log(`[SUCESSO] Mensagem enviada para o jogo: ${textoLinha}`))
                       .catch(err => console.error(`[ERRO TELEGRAM] Falha ao enviar:`, err.message));
                    
                    totalDisparados++;
                }
            }
        });

        console.log(`[VARREDURA CONCLUÍDA]`);
        console.log(`>> Total de jogos lidos: ${totalAnalisados}`);
        console.log(`>> Total de jogos disparados para o Telegram: ${totalDisparados}`);
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Erro na varredura de teste:", e.message);
    }
}

// Roda a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
