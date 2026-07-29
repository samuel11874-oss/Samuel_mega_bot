async function buscarJogosApiSports() {
    const hojeIso = new Date().toISOString().split('T')[0];
    
    if (ultimaDataExecucao === hojeIso) {
        return;
    }

    try {
        console.log(`🔍 [API-Sports] Consultando jogos do dia ${hojeIso} (Economizando créditos)...`);
        
        // URL CORRIGIDA COM O HÍFEN (api-sports)
        const response = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${hojeIso}`, {
            headers: API_HEADERS
        });

        if (!response.data || !response.data.response) return;

        ultimaDataExecucao = hojeIso;
        const matches = response.data.response;
        let encontrados = 0;

        for (const match of matches) {
            const t1 = match.teams.home.name;
            const t2 = match.teams.away.name;
            const competencia = match.league.name;
            
            const horaJogo = new Date(match.fixture.date).toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit'
            });

            const chave = `apisports_${t1}_${t2}_${hojeIso}`.toLowerCase().replace(/\s/g, '');

            if (!jogosEnviados.has(chave)) {
                jogosEnviados.add(chave);
                encontrados++;

                enviarCard('API-Sports', t1, t2, horaJogo, `Partida Monitorada do Dia`, competencia);
                console.log(`✅ [API-Sports] Enviado: ${t1} x ${t2} às ${horaJogo}`);
            }
        }

        console.log(`🔍 [API-Sports] Concluído para ${hojeIso}. Jogos enviados: ${encontrados}`);

    } catch (e) {
        console.error("Erro na API-Sports:", e.message);
    }
}
