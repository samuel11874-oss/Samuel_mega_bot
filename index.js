const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Seletor Preciso ⚽🚩</h2>'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`));

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerPartidasAoVivo() {
    console.log("\n========================================");
    console.log("🕒 [BOT] Varredura com extração precisa de cards...");
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

        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando carregamento...");
        await new Promise(r => setTimeout(r, 10000));

        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 600));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extração cirúrgica focada nas linhas de jogos do SokkerPRO
        const partidas = await page.evaluate(() => {
            let listaJogos = [];
            
            // O site agrupa cada jogo ou bloco de partida. Vamos varrer elementos que contêm minutos de jogo.
            let elementos = document.querySelectorAll('div');
            
            elementos.forEach(el => {
                let texto = el.innerText ? el.innerText.trim() : '';
                // Verifica se o bloco contém o formato padrão de tempo (ex: 45', 76', 90', etc) e tamanho ideal
                if (/\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(texto) && !texto.includes('TODOS') && !texto.includes('PRÓXIMOS')) {
                    let linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    // Valida se o bloco tem linhas suficientes para formar um jogo real
                    let temTempo = linhas.some(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l));
                    let temPlacarNums = linhas.filter(l => /^\d+$/.test(l));

                    if (temTempo && temPlacarNums.length >= 2 && linhas.length >= 4 && linhas.length <= 25) {
                        // Evita duplicatas exatas de blocos aninhados
                        let assinatura = linhas.join(' | ');
                        if (!listaJogos.some(j => j.assinatura === assinatura)) {
                            listaJogos.push({ assinatura, linhas });
                        }
                    }
                }
            });

            return listaJogos.map(j => j.linhas);
        });

        console.log(`📊 Partidas válidas encontradas: ${partidas.length}`);
        let enviados = 0;

        for (let linhas of partidas) {
            let linhaTempo = linhas.find(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l));
            if (!linhaTempo) continue;

            // Limpa e valida as linhas de texto para isolar os nomes dos times
            let linhasLimpas = linhas.filter(l => 
                l.length > 2 && 
                !l.includes('%') && 
                !l.includes('.') && 
                !/^\d+$/.test(l) && 
                !/\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l) &&
                !l.toLowerCase().includes('min') &&
                !l.toLowerCase().includes('+') &&
                !l.toLowerCase().includes('live') &&
                !l.toLowerCase().includes('visão') &&
                !l.toLowerCase().includes('odds')
            );

            if (linhasLimpas.length < 2) continue;

            // Os dois primeiros textos limpos após os filtros são estritamente os times
            let timeCasa = linhasLimpas[0];
            let timeFora = linhasLimpas[1];
            let confronto = `${timeCasa} x ${timeFora}`;

            // Tenta achar a liga (geralmente as primeiras linhas antes dos times)
            let indexTempo = linhas.indexOf(linhaTempo);
            let liga = "Futebol Ao Vivo";
            for (let i = 0; i < indexTempo; i++) {
                let l = linhas[i];
                if (l.length > 3 && !/^\d+$/.test(l) && !l.includes('%') && !l.toLowerCase().includes('vião')) {
                    liga = l;
                    break;
                }
            }

            // Extração correta dos gols/placar
            let numeros = linhas.filter(l => /^\d+$/.test(l));
            let golsCasa = numeros.length > 0 ? numeros[0] : "0";
            let golsFora = numeros.length > 1 ? numeros[1] : "0";
            let placar = `${golsCasa} x ${golsFora}`;

            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');
            if (memoriaJogos.has(chaveConfronto)) continue;
            memoriaJogos.set(chaveConfronto, true);

            let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(linhaTempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 Enviado com Sucesso | ${liga} | ${confronto} (${placar})`);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} cards enviados.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
