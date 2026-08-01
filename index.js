const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Mega Cirúrgico V3 (TreeWalker) ⚽🚩</h2>'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`));

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaJogos = new Map();

function traduzirTempo(texto) {
    if (!texto) return 'Desconhecido';
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerPartidasAoVivo() {
    console.log("\n========================================");
    console.log("🕒 [BOT] Iniciando varredura absoluta com TreeWalker (Ignorando renderização do servidor)...");
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        console.log("⏳ Navegando até o site...");
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização do conteúdo...");
        await new Promise(r => setTimeout(r, 12000));

        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        const partidasRaw = await page.evaluate(() => {
            let results = [];
            // Busca todos os blocos possíveis
            let rows = document.querySelectorAll('div, tr, li, article');
            
            for (let row of rows) {
                // O SEGREDO: TreeWalker extrai os textos puros (nós) ignorando como o servidor formata
                let walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null, false);
                let parts = [];
                let node;
                while (node = walker.nextNode()) {
                    let val = node.nodeValue.trim();
                    if (val && val.length > 0) {
                        parts.push(val);
                    }
                }
                
                // Verifica se esse bloco isolado tem as peças fundamentais de um jogo
                let hasTime = parts.some(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l));
                let nums = parts.filter(l => /^\d+$/.test(l));
                let words = parts.filter(l => !/^\d+$/.test(l) && !/\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l) && l.length > 2);
                
                // Se tiver tempo, pelo menos 2 placares e 2 times (e não for a página inteira gigante)
                if (hasTime && nums.length >= 2 && words.length >= 2 && parts.length < 25) {
                    results.push(parts);
                }
            }
            return results;
        });

        console.log(`📊 Blocos brutos encontrados: ${partidasRaw.length}`);
        let enviados = 0;

        // Ordena pelos arrays menores primeiro (garante que vamos processar os filhos perfeitos e ignorar os pais duplicados)
        partidasRaw.sort((a, b) => a.length - b.length);

        let processados = new Set();

        for (let partes of partidasRaw) {
            let tempo = partes.find(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l));
            let numeros = partes.filter(l => /^\d+$/.test(l));
            
            let golsCasa = numeros[0];
            let golsFora = numeros[1];
            let placar = `${golsCasa} x ${golsFora}`;

            // Limpa palavras de sistema
            let textosLimpos = partes.filter(p => {
                let up = p.toUpperCase();
                return p !== tempo && 
                       !/^\d+$/.test(p) && 
                       p.length > 2 &&
                       !up.includes('VISÃO') && 
                       !up.includes('ODDS') && 
                       !up.includes('LIVE') && 
                       !p.includes('%');
            });

            if (textosLimpos.length < 2) continue;

            let timeCasa = "";
            let timeFora = "";
            let liga = "Futebol Ao Vivo";

            // Pegamos SEMPRE os dois últimos textos como sendo as equipes. O que sobrar pra trás assume como Liga.
            timeCasa = textosLimpos[textosLimpos.length - 2];
            timeFora = textosLimpos[textosLimpos.length - 1];
            
            if (textosLimpos.length >= 3) {
                liga = textosLimpos[0]; 
            }

            // TRAVA DE SEGURANÇA ANTI-LIGAS/PAÍSES
            // Impede a criação de cards absurdos como "AUSTRALIA x Uni Azzurri"
            let paisesELigas = ['AUSTRALIA', 'RUSSIA', 'MEXICO', 'PANAMA', 'UNITED STATES', 'COLOMBIA', 'HONDURAS', 'UKRAINE', 'INDONESIA'];
            
            let timeCasaUp = timeCasa.toUpperCase();
            let timeForaUp = timeFora.toUpperCase();
            
            let ehInvalido = false;
            for (let invalido of paisesELigas) {
                if (timeCasaUp === invalido || timeForaUp === invalido) ehInvalido = true;
                // Corta qualquer bloco que tenha 'PREMIER LEAGUE' como um dos times
                if (timeCasaUp.includes('PREMIER LEAGUE') || timeForaUp.includes('PREMIER LEAGUE')) ehInvalido = true;
            }
            
            if (ehInvalido) continue;
            if (timeCasaUp === timeForaUp) continue;

            let confronto = `${timeCasa} x ${timeFora}`;
            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');

            // Bloqueio final de duplicidade no Telegram (Filtro Pai/Filho resolvido aqui)
            if (processados.has(chaveConfronto)) continue;
            if (memoriaJogos.has(chaveConfronto)) continue;

            processados.add(chaveConfronto);
            memoriaJogos.set(chaveConfronto, true);

            let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 CARD PERFEITO ENVIADO | ${confronto} (${placar})`);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} novos cards enviados.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
