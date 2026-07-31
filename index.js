const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Investigador de Escanteios ⚽🚩</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaPlacarJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    t = t.replace('MIN', 'min').replace('+', ' + ');
    return t.trim();
}

async function varrerInteligente() {
    let browser = null;
    try {
        console.log("⚡ [Investigador Array] Conectando ao SokkerPRO...");

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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle2',
            timeout: 120000
        });

        console.log("⏳ Aguardando renderização completa dos dados (12s)...");
        await new Promise(r => setTimeout(r, 12000)); 

        // Scroll suave para revelar jogos mais abaixo
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        const partidasExtraidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('div');

            blocos.forEach(el => {
                let textoOriginal = el.innerText || "";
                
                // Quebra o texto respeitando as quebras de linha reais do HTML
                let linhas = textoOriginal.split('\n').map(t => t.trim()).filter(t => t !== '');
                
                // Verifica se essa div tem estrutura de uma partida ao vivo
                let temTempo = linhas.some(l => /^(\d{1,3}'(?:\+\d+)?|HT|FT|Intervalo)$/i.test(l));
                
                if (
                    temTempo && 
                    linhas.length >= 4 && 
                    linhas.length <= 25 && 
                    !linhas.includes('GAMEPLAY') && 
                    !linhas.includes('ODDSPRE') &&
                    !linhas.includes('Subscribe') &&
                    !linhas.includes('Loading data')
                ) {
                    resultados.push(linhas);
                }
            });

            return resultados;
        });

        console.log(`📊 Blocos analisados encontrados: ${partidasExtraidas.length}`);
        
        let enviadosNoCiclo = 0;
        let jogosProcessados = new Set(); 

        for (let linhas of partidasExtraidas) {
            let tempoJogo = "Ao Vivo";
            let idxTempo = linhas.findIndex(l => /^(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT|Intervalo)$/i.test(l));
            
            if (idxTempo === -1) {
                idxTempo = linhas.findIndex(l => /(\d{1,3}'|HT|FT)/i.test(l));
            }
            
            if (idxTempo === -1) continue;

            tempoJogo = traduzirTempo(linhas[idxTempo]);

            let timesEncontrados = [];
            let numerosEncontrados = [];

            // Separador Cirúrgico: varre as linhas e separa textos de números
            for (let i = 0; i < linhas.length; i++) {
                let linha = linhas[i];
                
                if (i === idxTempo) continue;
                if (linha.toUpperCase().includes('GOAL') || linha.toUpperCase().includes('VAR') || linha.includes('Live')) continue;

                // Captura placares e números puros isolados
                if (/^\d+$/.test(linha)) {
                    numerosEncontrados.push(linha);
                } else if (/^\d+\s*[-–—xX]\s*\d+$/.test(linha)) {
                    let partes = linha.split(/[-–—xX]/).map(p => p.trim());
                    numerosEncontrados.push(partes[0], partes[1]);
                } else if (linha.length > 2) {
                    // Se tem mais de 2 letras e passou nos filtros, é o nome do time/liga (Ex: "12 de Junio VH" entra aqui e não dá conflito)
                    timesEncontrados.push(linha);
                }
            }

            // Remove duplicações de textos geradas pelo layout responsivo invisível
            timesEncontrados = [...new Set(timesEncontrados)];
            
            if (timesEncontrados.length < 2) continue;

            // Define quem é quem
            let liga = timesEncontrados.length >= 3 ? timesEncontrados[0] : "";
            let timeCasa = timesEncontrados.length >= 3 ? timesEncontrados[1] : timesEncontrados[0];
            let timeFora = timesEncontrados.length >= 3 ? timesEncontrados[2] : timesEncontrados[1];

            let confrontoFinal = `${timeCasa} x ${timeFora}`;
            
            if (jogosProcessados.has(confrontoFinal)) continue;
            jogosProcessados.add(confrontoFinal);

            let placarJogo = "0 x 0";
            let escanteiosJogo = "0 x 0";

            // Lógica posicional: Os primeiros 2 números são os Gols, os 2 números seguintes são os Escanteios
            if (numerosEncontrados.length >= 2) placarJogo = `${numerosEncontrados[0]} x ${numerosEncontrados[1]}`;
            if (numerosEncontrados.length >= 4) escanteiosJogo = `${numerosEncontrados[2]} x ${numerosEncontrados[3]}`;

            let chaveJogo = confrontoFinal.toLowerCase().replace(/\s+/g, '');
            if (memoriaPlacarJogos.has(chaveJogo)) {
                let placarAnterior = memoriaPlacarJogos.get(chaveJogo);
                if (placarAnterior === placarJogo) {
                    continue; 
                } else {
                    console.log(`⚽ GOL DETECTADO! ${confrontoFinal} | ${placarAnterior} -> ${placarJogo}`);
                }
            }
            memoriaPlacarJogos.set(chaveJogo, placarJogo);

            let cardTelegram = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            if (liga && !liga.includes("Ao Vivo")) {
                cardTelegram += `🏆 <b>Liga:</b> ${liga}\n`;
            }
            cardTelegram += `⏱ <b>Tempo:</b> ${tempoJogo}\n`;
            cardTelegram += `⚔️ <b>Confronto:</b> <code>${confrontoFinal}</code>\n`;
            cardTelegram += `⚽ <b>Placar:</b> <b>${placarJogo}</b>\n`;
            cardTelegram += `🚩 <b>Escanteios:</b> <b>${escanteiosJogo}</b>`;

            await bot.sendMessage(CHAT_ID, cardTelegram, { parse_mode: 'HTML' }).catch(() => {});
            enviadosNoCiclo++;
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} cards enviados com dados precisos.`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerInteligente();
setInterval(varrerInteligente, 180000);
