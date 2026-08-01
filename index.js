const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Mercado de Escanteios ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando varredura focada em Escanteios...");
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
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando 10s para carregamento...");
        await new Promise(r => setTimeout(r, 10000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 1000));
        }

        // Extração avançada mapeando a estrutura dos cards do SokkerPRO do print
        const partidas = await page.evaluate(() => {
            let lista = [];
            // Cada card de jogo na listagem costuma estar agrupado em containers
            let cards = document.querySelectorAll('div');
            
            cards.forEach(card => {
                let texto = card.innerText ? card.innerText.trim() : '';
                // Procura blocos que contenham minuto ativo (ex: 35', 69', 4') e dados de pressão/odds
                if (/\b\d{1,3}'\b/.test(texto) && (texto.includes('%') || texto.includes('AO VIVO'))) {
                    let linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (linhas.length >= 5 && !lista.includes(linhas)) {
                        lista.push(linhas);
                    }
                }
            });
            return lista;
        });

        console.log(`📊 Jogos capturados: ${partidas.length}`);
        let enviados = 0;

        for (let linhas of partidas) {
            let linhaTempo = linhas.find(l => /\b\d{1,3}'\b/.test(l));
            if (!linhaTempo) continue;

            // Identifica a liga (geralmente vem logo acima do confronto nos prints do SokkerPRO)
            let indexTempo = linhas.indexOf(linhaTempo);
            let liga = indexTempo > 1 ? linhas[indexTempo - 2] : "Futebol Ao Vivo";
            if (liga.length < 3 || liga.includes('%') || /^\d+$/.test(liga)) {
                liga = "Futebol Ao Vivo - Ao Vivo";
            }

            // Filtra os times válidos do bloco
            let times = linhas.filter(l => 
                l.length > 2 && 
                !l.includes('%') && 
                !l.includes('.') && 
                !/^\d+$/.test(l) && 
                !/\b\d{1,3}'\b/.test(l) &&
                !l.toLowerCase().includes('live') &&
                !l.toLowerCase().includes('todos') &&
                !l.toLowerCase().includes('próximos') &&
                !l.toLowerCase().includes('fim')
            );

            if (times.length < 2) continue;

            let timeCasa = times[0];
            let timeFora = times[1];
            let confronto = `${timeCasa} x ${timeFora}`;

            // Extração de placar e estatísticas de escanteios quando disponíveis na visão rápida
            let numeros = linhas.filter(l => /^\d+$/.test(l));
            let golsCasa = numeros.length > 0 ? numeros[0] : "0";
            let golsFora = numeros.length > 1 ? numeros[1] : "0";
            
            // Estimativa/Captura de escanteios baseada na posição dos dados do card
            let escCasa = numeros.length > 3 ? numeros[2] : "0";
            let escFora = numeros.length > 4 ? numeros[3] : "0";

            let placar = `${golsCasa} x ${golsFora}`;
            let escanteios = `${escCasa} x ${escFora}`;

            let chave = confronto.toLowerCase().replace(/\s+/g, '');
            if (memoriaJogos.get(chave) === placar && memoriaJogos.get(chave + '_esc') === escanteios) {
                continue; 
            }
            memoriaJogos.set(chave, placar);
            memoriaJogos.set(chave + '_esc', escanteios);

            // Análise rápida de mercado de escanteios baseada no momento da partida
            let minNum = parseInt(linhaTempo);
            let analiseMercado = "Aguardando pressão ideal para entrada.";
            if (!isNaN(minNum)) {
                if (minNum >= 75) {
                    analiseMercado = "🔥 **Oportunidade de Cantos Limite!** Jogo na reta final com alta tendência de pressão e bolas paradas.";
                } else if (minNum >= 35 && minNum <= 45) {
                    analiseMercado = "⚡ **Fim de 1º Tempo:** Atenção a pressão exercida para mercado de escanteios antes do intervalo.";
                } else {
                    analiseMercado = "📊 Jogo em desenvolvimento, monitorando volume ofensivo e cantos.";
                }
            }

            let card = `🚩 <b>Alerta de Escanteios - SokkerPRO</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(linhaTempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>\n`;
            card += `🚩 <b>Escanteios Atuais:</b> <b>${escanteios}</b>\n\n`;
            card += `💡 <b>Análise de Mercado:</b>\n${analiseMercado}`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 Alerta de Escanteios Enviado | ${confronto} (${linhaTempo}) - Escanteios: ${escanteios}`);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} alertas enviados.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
