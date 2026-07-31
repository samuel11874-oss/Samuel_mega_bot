const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigação V65 ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarInvestigacaoV65() {
    let browser = null;
    try {
        console.log("⚡ [Investigação V65] Lendo o código HTML profundo para achar os 23 jogos perdidos...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        console.log("🌐 Acessando TotalCorner...");
        await page.goto('https://www.totalcorner.com/pt/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Script de extração com Raio-X aprimorado
        const dados = await page.evaluate(() => {
            const logsInvestigacao = [];
            const aoVivoSet = new Set();
            const blocos = document.querySelectorAll('tr');

            let count = 0;

            blocos.forEach(el => {
                const textoRaw = el.innerText || '';
                const texto = textoRaw.replace(/\s+/g, ' ').trim();
                const textoLower = texto.toLowerCase();

                // Verifica se parece ser uma linha de jogo
                if (texto.length > 15 && (texto.includes('vs') || texto.includes(' - '))) {
                    
                    // 1. Lendo as entranhas do HTML (TotalCorner usa classes específicas para tempo ao vivo)
                    const htmlInner = el.innerHTML.toLowerCase();
                    const temTagHtmlAoVivo = htmlInner.includes('match_status_minute') || 
                                             htmlInner.includes('match_status_ht') || 
                                             htmlInner.includes('color:red') || 
                                             htmlInner.includes('color: red') ||
                                             htmlInner.includes('match_time');

                    // 2. Filtro de texto corrigido (Exige a palavra exata 'min' ou 'mín', não aceita feMINino)
                    const temMin = /\b(min|mín)\b/i.test(textoLower);
                    const temCronometro = /(\d{1,3})\s*['′]|ht|1ºt|2ºt|intervalo|live/i.test(textoLower);

                    const ehAoVivo = (temTagHtmlAoVivo || temMin || temCronometro);
                    
                    // 3. Filtros de bloqueio
                    const ehSub = /sub\s*-?(19|20|21|23)|u\s*-?(19|20|21|23)/i.test(textoLower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    // Salva as 25 primeiras linhas para lermos no log do Render
                    if (count < 25) {
                        logsInvestigacao.push(
                            `[JOGO ${count + 1}] "${texto.substring(0, 60)}..." | HTML_AO_VIVO: ${temTagHtmlAoVivo} | TEXTO_TEMPO: ${temMin || temCronometro} | RESULTADO: ${ehAoVivo && !ehSub && !ehFem ? 'APROVADO' : 'BARRADO'}`
                        );
                    }
                    count++;

                    // Se passou nas verificações, vai pra lista final
                    if (ehAoVivo && !ehSub && !ehFem) {
                        aoVivoSet.add(texto);
                    }
                }
            });

            return {
                jogosAoVivo: Array.from(aoVivoSet),
                logs: logsInvestigacao
            };
        });

        // ==========================================
        // IMPRIMINDO O RAIO-X NO RENDER
        // ==========================================
        console.log("\n=========================================");
        console.log("🕵️ RAIO-X V65 (LENDO O CÓDIGO FONTE)");
        console.log("=========================================");
        dados.logs.forEach(log => console.log(log));
        console.log("=========================================\n");

        console.log(`📊 Jogos capturados pela V65: ${dados.jogosAoVivo.length}`);

        if (dados.jogosAoVivo.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - V65]</b>\n`;
            mensagem += `🔥 Partidas rodando agora: <code>${dados.jogosAoVivo.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of dados.jogosAoVivo) {
                let linhaJogo = `⏱ <b>#${contador}</b>\n<code>${partida}</code>\n\n`;
                if ((blocoAtual.length + linhaJogo.length) > 3800) {
                    await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                    blocoAtual = `🔴 <b>[RADAR - CONTINUAÇÃO]</b>\n\n` + linhaJogo;
                } else {
                    blocoAtual += linhaJogo;
                }
                contador++;
            }

            if (blocoAtual.trim().length > 0) {
                await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
            }
            console.log("✅ Lista enviada ao Telegram!");
        } else {
            console.log("ℹ️ Nenhum jogo ao vivo encontrado.");
        }

    } catch (error) {
        console.error("❌ Erro V65:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

executarInvestigacaoV65();
setInterval(executarInvestigacaoV65, 180000);
