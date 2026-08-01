const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Seletor Estruturado ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Varredura com extração de itens únicos...");
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

        // Abordagem refinada: busca elementos menores que representam estritamente o card do jogo
        const partidas = await page.evaluate(() => {
            let listaJogos = [];
            
            // Procura elementos que costumam isolar cada partida individualmente
            let elementos = document.querySelectorAll('tr, .match-item, .game-row, div');

            elementos.forEach(el => {
                let texto = el.innerText ? el.innerText.trim() : '';
                
                // Valida se o bloco possui o tempo de jogo e se não é um container gigantesco (evita duplicação pai/filho)
                if (/\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(texto) && texto.length < 300) {
                    let linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    let temTempo = linhas.some(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l));
                    let numeros = linhas.filter(l => /^\d+$/.test(l));

                    // Garante que tem os dois times e o placar estruturado
                    if (temTempo && numeros.length >= 2 && linhas.length >= 3 && linhas.length <= 12) {
                        let assinatura = linhas.join(' | ');
                        if (!listaJogos.some(j => j.assinatura === assinatura)) {
                            listaJogos.push({ assinatura, linhas });
                        }
                    }
                }
            });

            return listaJogos.map(j => j.linhas);
        });

        console.log(`📊 Partidas estruturadas capturadas: ${partidas.length}`);
        let enviados = 0;

        for (let linhas of partidas) {
            let linhaTempo = linhas.find(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l));
            if (!linhaTempo) continue;

            // Filtro rígido para ignorar nomes de países, ligas genéricas e lixos de layout
            let linhasLimpas = linhas.filter(l => {
                let upper = l.toUpperCase();
                return l.length > 2 && 
                    !l.includes('%') && 
                    !l.includes('.') && 
                    !/^\d+$/.test(l) && 
                    !/\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l) &&
                    !upper.includes('MIN') &&
                    !upper.includes('+') &&
                    !upper.includes('LIVE') &&
                    !upper.includes('VISÃO') &&
                    !upper.includes('ODDS') &&
                    !upper.includes('LIGA') &&
                    !upper.includes('PREMIER LEAGUE') &&
                    !upper.includes('RUSSIA') &&
                    !upper.includes('UKRAINE') &&
                    !upper.includes('MEXICO') &&
                    !upper.includes('COLOMBIA') &&
                    !upper.includes('HONDURAS') &&
                    !upper.includes('PANAMA') &&
                    !upper.includes('UNITED STATES');
            });

            if (linhasLimpas.length < 2) continue;

            let timeCasa = linhasLimpas[0];
            let timeFora = linhasLimpas[1];

            // Validações de segurança para evitar que o país seja colocado como time (ex: RUSSIA x Premier League)
            if (timeCasa.toUpperCase() === timeFora.toUpperCase() || timeCasa.length < 3 || timeFora.length < 3) continue;
            if (timeFora.toUpperCase().includes('PREMIER') || timeFora.toUpperCase().includes('LEAGUE') || timeFora.toUpperCase().includes('WOMEN')) continue;
            if (/^\d/.test(timeCasa) || /^\d/.test(timeFora)) continue;

            let confronto = `${timeCasa} x ${timeFora}`;

            // Tenta resgatar a liga corretamente das linhas acima do tempo
            let indexTempo = linhas.indexOf(linhaTempo);
            let liga = "Futebol Ao Vivo";
            for (let i = 0; i < indexTempo; i++) {
                let l = linhas[i];
                let upperL = l.toUpperCase();
                if (l.length > 3 && !/^\d+$/.test(l) && !l.includes('%') && !upperL.includes('VISÃO')) {
                    liga = l;
                    break;
                }
            }

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
            console.log(`📤 Card Único Enviado | ${liga} | ${confronto} (${placar})`);
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
