const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Mega Cirúrgico V2 (Lógica Pai-Filho) ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando varredura por Lógica de Texto Pai/Filho...");
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
        
        // Voltando para o desktop padrão para garantir que o menu lateral/oculto não esconda os jogos
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        console.log("⏳ Navegando até o site...");
        
        // domcontentloaded impede que os dados ao vivo do site segurem o carregamento infinitamente
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização do JavaScript...");
        await new Promise(r => setTimeout(r, 12000));

        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        const partidasRaw = await page.evaluate(() => {
            let resultados = [];
            let elementos = document.querySelectorAll('div, tr, li, article');

            elementos.forEach(el => {
                let texto = el.innerText ? el.innerText.trim() : '';

                // Verifica se tem tempo (Regex)
                if (/\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(texto)) {
                    
                    // NOVA REGRA DE DUPLICAÇÃO: Verifica se há um elemento interno (filho) com o mesmo tempo
                    let ehPai = false;
                    let filhos = el.querySelectorAll('div, tr, li');
                    
                    for (let filho of filhos) {
                        let textoFilho = filho.innerText ? filho.innerText.trim() : '';
                        // Se o filho também tem tempo e o texto dele é menor que o texto do pai
                        if (textoFilho.length < texto.length && /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(textoFilho)) {
                            ehPai = true; // Esse elemento 'el' é só a caixa grande externa. Ignorar!
                            break;
                        }
                    }

                    if (!ehPai) {
                        // Achamos a caixa mais funda do DOM (A linha real do jogo!)
                        let linhas = texto.split('\n').map(t => t.trim()).filter(t => t.length > 0);
                        if (linhas.some(l => /^\d+$/.test(l))) {
                            resultados.push(linhas);
                        }
                    }
                }
            });

            // Limpeza final de qualquer card idêntico gerado
            let unicos = [];
            let assinaturas = new Set();
            resultados.forEach(res => {
                let ass = res.join('|');
                if (!assinaturas.has(ass)) {
                    assinaturas.add(ass);
                    unicos.push(res);
                }
            });

            return unicos;
        });

        console.log(`📊 Partidas capturadas por texto profundo: ${partidasRaw.length}`);
        let enviados = 0;

        for (let linhas of partidasRaw) {
            let tempos = linhas.filter(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l));
            let tempo = tempos.length > 0 ? tempos[0] : null;
            if (!tempo) continue;

            let numeros = linhas.filter(l => /^\d+$/.test(l));
            let golsCasa = numeros.length > 0 ? numeros[0] : "0";
            let golsFora = numeros.length > 1 ? numeros[1] : "0";
            let placar = `${golsCasa} x ${golsFora}`;

            // Remove tempos e números para sobrar só Ligas e Times
            let possiveisTextos = linhas.filter(l => {
                let upper = l.toUpperCase();
                return l.length > 2 &&
                       !/^\d+$/.test(l) &&
                       !/\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l) &&
                       !upper.includes('VISÃO') &&
                       !upper.includes('ODDS') &&
                       !upper.includes('LIVE') &&
                       !upper.includes('%');
            });

            if (possiveisTextos.length < 2) continue;

            let timeCasa = "";
            let timeFora = "";
            let liga = "Futebol Ao Vivo";

            // Matemática Reversa que impede Ligas de virarem Times
            if (possiveisTextos.length >= 3) {
                liga = possiveisTextos[0]; 
                timeCasa = possiveisTextos[possiveisTextos.length - 2]; 
                timeFora = possiveisTextos[possiveisTextos.length - 1]; 
            } else {
                timeCasa = possiveisTextos[0];
                timeFora = possiveisTextos[1];
            }

            // Impede cards com nome de time malformado
            if (timeCasa.toUpperCase() === timeFora.toUpperCase() || timeCasa.length < 3 || timeFora.length < 3) continue;

            let confronto = `${timeCasa} x ${timeFora}`;
            
            // Impede duplicados no Telegram
            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');
            if (memoriaJogos.has(chaveConfronto)) continue;
            memoriaJogos.set(chaveConfronto, true);

            let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 CIRÚRGICO ENVIADO | ${confronto} (${placar})`);
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
