const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Login Direto ⚽🚩</h2>'));
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
    console.log("🕒 [LOG] Iniciando novo ciclo de varredura...");
    let browser = null;
    try {
        console.log("🚀 [LOG] Lançando o navegador Puppeteer...");
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

        console.log("📂 [LOG] Criando nova aba no navegador...");
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        console.log("🌐 [LOG] Acessando SokkerPRO...");
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ [LOG] Aguardando 5s para carregamento...");
        await new Promise(r => setTimeout(r, 5000));

        // Tenta preencher os campos de login diretamente
        try {
            console.log("🔑 [LOG] Tentando preencher e-mail e senha...");
            await page.waitForSelector('input', { timeout: 5000 });
            
            await page.evaluate(() => {
                let inputs = document.querySelectorAll('input');
                inputs.forEach(input => {
                    if (input.type === 'email' || input.placeholder.toLowerCase().includes('email') || input.name.toLowerCase().includes('mail')) {
                        input.value = 'Samuel11874@gmail.com';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (input.type === 'password' || input.placeholder.toLowerCase().includes('senha')) {
                        input.value = 'Samuel00';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            });

            console.log("🖱️ [LOG] Clicando no botão de entrar...");
            await page.evaluate(() => {
                let botoes = document.querySelectorAll('button, input[type="submit"], a');
                for (let b of botoes) {
                    let texto = b.innerText ? b.innerText.toLowerCase() : '';
                    if (texto.includes('entrar') || texto.includes('login') || texto.includes('acessar')) {
                        b.click();
                        break;
                    }
                }
            });

            console.log("⏳ [LOG] Aguardando pós-login (8s)...");
            await new Promise(r => setTimeout(r, 8000));
        } catch (e) {
            console.log("ℹ️ [LOG] Campos de login não encontrados ou já logado.");
        }

        console.log("📜 [LOG] Realizando rolagem na página de jogos...");
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log("🔍 [LOG] Extraindo elementos HTML da tela...");
        const partidas = await page.evaluate(() => {
            let lista = [];
            let elementos = document.querySelectorAll('*');

            elementos.forEach(el => {
                let texto = el.innerText ? el.innerText.trim() : '';
                if (/^\d{1,3}'$/.test(texto) && el.innerText.length > 25 && el.innerText.length < 500) {
                    let linhas = el.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (linhas.length >= 3) {
                        lista.push(linhas);
                    }
                }
            });
            return lista;
        });

        console.log(`📊 [LOG] Total de blocos brutos capturados: ${partidas.length}`);
        let enviados = 0;

        for (let linhas of partidas) {
            let tempo = linhas.find(l => /^\d{1,3}'$/.test(l) || l === 'HT' || l === 'Intervalo') || "Ao Vivo";
            
            let possiveisTimes = linhas.filter(l => 
                l.length > 2 && 
                !l.includes('%') && 
                !l.includes('.') && 
                !/^\d+$/.test(l) && 
                !/^\d{1,3}'$/.test(l) &&
                l !== 'HT' && l !== 'Intervalo'
            );

            if (possiveisTimes.length >= 2) {
                let timeCasa = possiveisTimes[0];
                let timeFora = possiveisTimes[1];
                let confronto = `${timeCasa} x ${timeFora}`;

                let numeros = linhas.filter(l => /^\d+$/.test(l));
                let golsCasa = numeros.length > 0 ? numeros[0] : "0";
                let golsFora = numeros.length > 1 ? numeros[1] : "0";
                let escCasa = numeros.length > 2 ? numeros[2] : "0";
                let escFora = numeros.length > 3 ? numeros[3] : "0";

                let placar = `${golsCasa} x ${golsFora}`;
                let escanteios = `${escCasa} x ${escFora}`;

                let chave = confronto.toLowerCase().replace(/\s+/g, '');
                if (memoriaJogos.get(chave) === placar && memoriaJogos.get(chave + '_esc') === escanteios) {
                    continue; 
                }
                memoriaJogos.set(chave, placar);
                memoriaJogos.set(chave + '_esc', escanteios);

                let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
                card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
                card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
                card += `⚽ <b>Placar:</b> <b>${placar}</b>\n`;
                card += `🚩 <b>Escanteios:</b> <b>${escanteios}</b>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(err => {
                    console.log(`❌ [LOG] Erro ao enviar mensagem pro Telegram: ${err.message}`);
                });
                enviados++;
                console.log(`📤 [LOG] Alerta enviado: ${confronto} (${placar})`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        console.log(`✅ [LOG] Ciclo finalizado com sucesso. ${enviados} novos alertas enviados.`);

    } catch (erro) {
        console.error(`❌ [LOG CRÍTICO] Erro na execução: ${erro.message}`);
    } finally {
        if (browser) {
            console.log("🔒 [LOG] Fechando instância do navegador...");
            await browser.close();
        }
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
