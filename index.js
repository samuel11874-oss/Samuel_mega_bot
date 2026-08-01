const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Mega Cirúrgico ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando MEGA INVESTIGAÇÃO e extração cirúrgica...");
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

        console.log("⏳ Aguardando carregamento e renderização...");
        await new Promise(r => setTimeout(r, 8000));

        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 600));
            await new Promise(r => setTimeout(r, 1000));
        }

        // O SEGREDO CIRÚRGICO: Extração usando propriedades físicas de tela.
        // Garante que só vai pegar a exata "faixa" do jogo e não a página ou menu inteiro.
        const partidasRaw = await page.evaluate(() => {
            let resultados = [];
            let elementos = document.querySelectorAll('div, tr, li');

            elementos.forEach(el => {
                let rect = el.getBoundingClientRect();
                // Regra física: A linha de uma partida de celular tem entre 20 e 180 pixels de altura
                if (rect.height > 15 && rect.height < 180 && rect.width > 50) {
                    let texto = el.innerText ? el.innerText.trim() : '';

                    // Confirmação de tempo (HT, Minutos, etc)
                    if (/\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(texto)) {

                        // REGRA ANTI-DUPLICAÇÃO (Pai/Filho)
                        // Checa se o elemento não tem nenhum filho validado. Queremos a 'folha' final do DOM.
                        let isLeaf = true;
                        let filhos = el.querySelectorAll('div, tr, li');
                        for (let filho of filhos) {
                            let fRect = filho.getBoundingClientRect();
                            if (fRect.height > 15 && fRect.height < 180) {
                                if (/\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(filho.innerText || '')) {
                                    isLeaf = false;
                                    break;
                                }
                            }
                        }

                        if (isLeaf) {
                            let linhas = texto.split('\n').map(t => t.trim()).filter(t => t.length > 0);
                            // Se a linha isolada tem números (é o placar!), ela é válida
                            if (linhas.some(l => /^\d+$/.test(l))) {
                                resultados.push(linhas);
                            }
                        }
                    }
                }
            });

            // Limpa as duplicatas que o site repete no layout
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

        console.log(`📊 Partidas filtradas fisicamente: ${partidasRaw.length}`);
        let enviados = 0;

        for (let linhas of partidasRaw) {
            // 1. Extrai o TEMPO
            let tempos = linhas.filter(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l));
            let tempo = tempos.length > 0 ? tempos[0] : null;
            if (!tempo) continue;

            // 2. Extrai o PLACAR
            let numeros = linhas.filter(l => /^\d+$/.test(l));
            let golsCasa = numeros.length > 0 ? numeros[0] : "0";
            let golsFora = numeros.length > 1 ? numeros[1] : "0";
            let placar = `${golsCasa} x ${golsFora}`;

            // 3. Limpa os LIXOS para encontrar os TIMES
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

            // MATEMÁTICA REVERSA (RESOLVE O BUG DO "AUSTRALIA x Uni Azzurri")
            // Se vieram 3 nomes (Ex: País, Time 1, Time 2), separamos o país para a Liga e pegamos os 2 times puros.
            if (possiveisTextos.length >= 3) {
                liga = possiveisTextos[0]; // Pega o cabeçalho vazado e joga no campo Liga
                timeCasa = possiveisTextos[possiveisTextos.length - 2]; // O penúltimo é sempre a casa
                timeFora = possiveisTextos[possiveisTextos.length - 1]; // O último é sempre o visitante
            } else {
                timeCasa = possiveisTextos[0];
                timeFora = possiveisTextos[1];
            }

            // Proteção final: Impede de montar confronto bizarro
            if (timeCasa === timeFora || timeCasa.length < 3 || timeFora.length < 3) continue;

            let confronto = `${timeCasa} x ${timeFora}`;
            
            // Controle final de Não Duplicidade no Telegram
            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');
            if (memoriaJogos.has(chaveConfronto)) continue;
            memoriaJogos.set(chaveConfronto, true);

            // MONTA O CARD PERFEITO
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

        console.log(`✅ Ciclo investigativo finalizado. ${enviados} novos cards únicos.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
