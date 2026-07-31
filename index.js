const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - V68 Ao Vivo Real ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória de antiduplicidade para não repetir jogos
const jogosJaEnviados = new Set();

async function executarRadarV68() {
    let browser = null;
    try {
        console.log("⚡ [Radar V68] Buscando apenas partidas com minutos ativos...");

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
        
        console.log("🌐 Acessando TotalCorner Live...");
        await page.goto('https://www.totalcorner.com/pt/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando carregamento e rolando a página...");
        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extração focada nos blocos que contêm o marcador "Mín" e o cronômetro rodando
        const partidasAoVivo = await page.evaluate(() => {
            const unicasSet = new Set();
            
            // O TotalCorner separa cada jogo em blocos ou linhas de tabela
            const elementos = document.querySelectorAll('div, tr');

            elementos.forEach(el => {
                const textoHtml = el.innerHTML || '';
                const textoInterno = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Verifica se o bloco possui a estrutura visual de um jogo ao vivo (contém "vs" ou " - " e o indicativo de minuto/placar)
                if ((textoInterno.includes('vs') || textoInterno.includes(' - ')) && 
                    textoInterno.length > 15 && textoInterno.length < 500) {
                    
                    const textoLower = textoInterno.toLowerCase();

                    // Critério rigoroso baseado no seu print: Precisa ter indicador de minuto ativo ("mín" ou "min") 
                    // ou marcação de intervalo/tempo real explícita no HTML/texto do bloco.
                    const temMinutoAtivo = /mín|min|\b\d{1,2}\s*['′]\b/i.test(textoLower) || 
                                           textoHtml.includes('match_status') || 
                                           textoHtml.includes('min');

                    // Filtros para barrar Sub-19/20 e Feminino
                    const ehSub = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(textoLower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    // Só aceita se tiver o minuto rodando e não for categoria bloqueada
                    if (temMinutoAtivo && !ehSub && !ehFem) {
                        // Limpa quebras excessivas para padronizar o texto da partida
                        unicasSet.add(textoInterno);
                    }
                }
            });

            return Array.from(unicasSet);
        });

        // Filtra para garantir que NENHUM jogo repetido seja enviado
        const novasPartidas = partidasAoVivo.filter(partida => !jogosJaEnviados.has(partida));

        console.log(`📊 Jogos ao vivo reais encontrados: ${partidasAoVivo.length} | Novos para envio: ${novasPartidas.length}`);

        if (novasPartidas.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - AO VIVO REAL]</b>\n`;
            mensagem += `🔥 Partidas rolando agora: <code>${novasPartidas.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of novasPartidas) {
                // Salva na memória para nunca mais repetir
                jogosJaEnviados.add(partida);

                let linhaJogo = `⏱ <b>#${contador} [AO VIVO]</b>\n<code>${partida}</code>\n\n`;
                
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

            console.log("✅ Jogos ao vivo reais enviados com sucesso ao Telegram!");
        } else {
            console.log("ℹ️ Nenhum jogo novo com minutos ativos encontrado nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro V68:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V68:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV68();
setInterval(executarRadarV68, 180000);
