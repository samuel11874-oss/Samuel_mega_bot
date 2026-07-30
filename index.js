        console.log("🌐 Acessando https://www.totalcorner.com/match/live ...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando 10 segundos para carregar o AJAX do ao vivo...");
        // Substituindo o waitForTimeout descontinuado por uma pausa segura
        await new Promise(r => setTimeout(r, 10000));

        // INSPETOR DE SEGURANÇA: Captura o texto cru da página para análise no log do Render
        const diagnosticoTexto = await page.evaluate(() => {
            return {
                titulo: document.title,
                corpoResumo: document.body.innerText.replace(/\s+/g, ' ').substring(0, 800),
                totalTrs: document.querySelectorAll('tr').length,
                totalTds: document.querySelectorAll('td').length
            };
        });

        console.log("🔍 [DIAGNÓSTICO DA PÁGINA NA NUVEM]:");
        console.log(`- Título da Página: ${diagnosticoTexto.titulo}`);
        console.log(`- Total de linhas (tr): ${diagnosticoTexto.totalTrs}`);
        console.log(`- Total de colunas (td): ${diagnosticoTexto.totalTds}`);
        console.log(`- Amostra do Conteúdo: "${diagnosticoTexto.corpoResumo}"`);

        const dadosAoVivo = await page.evaluate(() => {
            const resultados = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                
                if (teamLinks.length >= 2) {
                    resultados.push({
                        timeA: teamLinks[0].innerText.trim(),
                        timeB: teamLinks[1].innerText.trim(),
                        textoLinha: texto
                    });
                }
            });

            return resultados;
        });

        console.log(`⚡ [Bot V45] Total de partidas encontradas: ${dadosAoVivo.length}`);
