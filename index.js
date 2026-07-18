// ... (mantenha o início do código igual até o loop element.each)

        elementos.each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            if (linha.includes(' x ')) {
                // Regex para capturar o confronto e remover o "Hoje" se existir
                const regexConfronto = /([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/;
                const matchConfronto = linha.match(regexConfronto);
                let confronto = matchConfronto ? matchConfronto[0].trim() : null;
                
                if (confronto) {
                    confronto = confronto.replace('Hoje', '').trim();
                }

                // Captura a média
                const numeros = linha.match(/\d{1,2}\.\d/g);
                const valorString = numeros ? numeros[0] : "0";
                const valorFloat = parseFloat(valorString);

                // --- FILTROS DE INTELIGÊNCIA ---
                // 1. A média deve ser > 10.5
                // 2. A média deve ser <= 15.0 (impede de pegar números errados como 56.2)
                const ehValido = valorFloat > 10.5 && valorFloat <= 15.0;

                if (confronto && ehValido && !jogosEnviados.has(confronto)) {
                    jogosEnviados.add(confronto);

                    const mensagem = `⚽ *OPORTUNIDADE DE CANTO*\n` +
                                     `━━━━━━━━━━━━━━\n` +
                                     `⚔️ *Confronto:* ${confronto}\n` +
                                     `📊 *Média FT:* ${valorFloat.toFixed(1)}\n` +
                                     `━━━━━━━━━━━━━━`;

                    bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                    console.log(`✅ Enviado: ${confronto} | Média Real: ${valorFloat}`);
                }
            }
        });
// ... (resto do código)
