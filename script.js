// Variáveis de estado do jogo
let currentQuestionIndex = 0;
let timer = 90;
let timerInterval = null;
let musicOn = false;
let teams = [
    { id: 1, name: "Equipe 1", points: 0 },
    { id: 2, name: "Equipe 2", points: 0 },
    { id: 3, name: "Equipe 3", points: 0 },
    { id: 4, name: "Equipe 4", points: 0 }
];
let audioContext = null;
let oscillator = null;
let gainNode = null;
let isAudioInitialized = false;

// Função para inicializar o áudio Web API
function initAudio() {
    if (isAudioInitialized) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Criar oscilador para gerar som
        oscillator = audioContext.createOscillator();
        oscillator.type = 'sine'; // Ondas suaves

        // Nó de ganho para controlar volume
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.1; // Volume baixo

        // Conectar os nós
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Frequência da melodia (C4 - D4 - E4 - G4 em sequência)
        const frequencies = [261.63, 293.66, 329.63, 392.00]; // C4, D4, E4, G4
        let freqIndex = 0;

        // Função para atualizar a frequência em loop
        function updateFrequency() {
            oscillator.frequency.value = frequencies[freqIndex];
            freqIndex = (freqIndex + 1) % frequencies.length;
        }

        // Iniciar o oscilador
        oscillator.start();

        // Atualizar frequência a cada 0.5 segundos para criar melodia
        setInterval(updateFrequency, 500);

        isAudioInitialized = true;
    } catch (e) {
        console.error("Erro ao inicializar áudio Web API:", e);
    }
}

// Função para ligar/desligar música
function toggleMusic() {
    musicOn = !musicOn;
    const btn = document.getElementById('btnMusic');
    btn.textContent = musicOn ? 'Música: ON' : 'Música: OFF';

    if (musicOn) {
        initAudio(); // Inicializa áudio se necessário
        if (oscillator) {
            gainNode.gain.value = 0.1; // Liga o som
        }
    } else {
        if (gainNode) {
            gainNode.gain.value = 0; // Desliga o som
        }
    }
}

// Função para iniciar o jogo
function startGame() {
    // Obter nomes das equipes dos inputs
    teams[0].name = document.getElementById('team1').value || "Equipe 1";
    teams[1].name = document.getElementById('team2').value || "Equipe 2";
    teams[2].name = document.getElementById('team3').value || "Equipe 3";
    teams[3].name = document.getElementById('team4').value || "Equipe 4";

    // Resetar pontos
    teams.forEach(team => team.points = 0);

    // Resetar estado do jogo
    currentQuestionIndex = 0;
    timer = 90;

    // Mudar telas
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');

    // Carregar primeira questão e iniciar timer
    loadQuestion();
    startTimer();
}

// Função para carregar a questão atual
function loadQuestion() {
    const q = PERGUNTAS[currentQuestionIndex];

    // Atualizar elementos da questão
    document.getElementById('qNum').textContent = `Questão ${q.numero} de ${PERGUNTAS.length}`;
    document.getElementById('qAno').textContent = q.ano;
    document.getElementById('qEnunciado').textContent = q.enunciado;

    // Limpar e preencher alternativas
    const altsDiv = document.getElementById('qAlts');
    altsDiv.innerHTML = '';

    const order = ['A', 'B', 'C', 'D', 'E'];
    order.forEach(letter => {
        const btn = document.createElement('button');
        btn.textContent = `${letter}. ${q.alternativas[letter]}`;
        btn.onclick = () => selectAlternative(btn, letter, q);
        btn.dataset.letter = letter;
        altsDiv.appendChild(btn);
    });

    // Resetar estado visual
    document.getElementById('qResultado').style.display = 'none';
    document.getElementById('qResultado').innerHTML = '';
    document.getElementById('btnAnswer').style.display = 'inline-block';
    document.getElementById('btnNext').style.display = 'none';

    // Resetar timer
    timer = 90;
    updateTimerUI();
}

// Função para selecionar uma alternativa (visual apenas)
function selectAlternative(btn, letter, q) {
    // Remover destaque de todas as alternativas
    document.querySelectorAll('#qAlts button').forEach(b => {
        b.style.background = '#16213e';
        b.style.color = '#eee';
        b.style.borderColor = '#333';
    });

    // Destacar a selecionada
    btn.style.background = '#ffd166';
    btn.style.color = '#111';
    btn.style.borderColor = '#ffd166';
}

// Função para iniciar o timer
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timer--;
        updateTimerUI();

        if (timer <= 0) {
            clearInterval(timerInterval);
            showAnswer(); // Mostrar resposta quando tempo acabar
        }
    }, 1000);
}

// Função para atualizar a interface do timer
function updateTimerUI() {
    document.getElementById('timerText').textContent = `${timer}s`;
    const pct = (timer / 90) * 100;
    document.getElementById('timerFill').style.width = `${pct}%`;
}

// Função para mostrar a resposta
function showAnswer() {
    clearInterval(timerInterval);
    const q = PERGUNTAS[currentQuestionIndex];
    const correct = q.resposta;

    // Destacar a alternativa correta em verde
    document.querySelectorAll('#qAlts button').forEach(b => {
        if (b.dataset.letter === correct) {
            b.classList.add('correto');
            b.style.background = '#2ecc71';
            b.style.color = '#fff';
            b.style.borderColor = '#2ecc71';
        }
    });

    // Esconder botão de resposta e mostrar próximo
    document.getElementById('btnAnswer').style.display = 'none';
    document.getElementById('btnNext').style.display = 'inline-block';

    // Mostrar resolução
    const resDiv = document.getElementById('qResultado');
    resDiv.style.display = 'block';
    resDiv.innerHTML = `<strong>Resposta correta: ${correct}</strong><br><br><h4>Explicação:</h4><p>${q.resolucao}</p>`;

    // Mostrar seção de pontos das equipes
    showTeamPoints();
}

// Função para mostrar a seção de pontos das equipes
function showTeamPoints() {
    const container = document.getElementById('teamPointsContainer');
    container.innerHTML = '<h4>Pontuar equipes:</h4>';

    teams.forEach(team => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.background = '#16213e';
        div.style.padding = '12px';
        div.style.margin = '8px 0';
        div.style.borderRadius = '8px';

        const teamInfo = document.createElement('span');
        teamInfo.textContent = `${team.name}: ${team.points} pts`;
        teamInfo.style.fontSize = '18px';
        teamInfo.style.color = '#eee';
        teamInfo.style.flexGrow = '1';

        const pointBtn = document.createElement('button');
        pointBtn.textContent = 'Acertou (+100)';
        pointBtn.onclick = () => toggleTeamPoint(team);
        pointBtn.style.background = '#06d6a0';
        pointBtn.style.color = '#111';
        pointBtn.style.border = 'none';
        pointBtn.style.padding = '8px 16px';
        pointBtn.style.fontSize = '16px';
        pointBtn.style.borderRadius = '6px';
        pointBtn.style.cursor = 'pointer';

        div.appendChild(teamInfo);
        div.appendChild(pointBtn);
        container.appendChild(div);
    });
}

// Função para alternar pontos da equipe (adicionar ou remover 100)
function toggleTeamPoint(team) {
    // Se já tiver pontos desta questão, remove; senão, adiciona
    // Vamos usar uma abordagem simples: sempre adicionar 100, mas permitir desfazer clicando de novo
    if (team.points > 0 &&
        document.querySelector(`button[onclick="toggleTeamPoint(${JSON.stringify(team)})"]`).textContent.includes('-100')) {
        // Se o botão já estiver no modo de remoção, remove os pontos
        team.points -= 100;
        updateTeamButton(team, '+100');
    } else {
        // Adiciona pontos
        team.points += 100;
        updateTeamButton(team, '-100');
    }

    // Atualizar o placar
    updateTeamPointsDisplay();
}

// Função para atualizar o texto do botão da equipe
function updateTeamButton(team, actionText) {
    const btn = document.querySelector(`button[onclick*="team${team.id}"]`);
    if (btn) {
        if (actionText === '-100') {
            btn.textContent = 'Errou (-100)';
        } else {
            btn.textContent = 'Acertou (+100)';
        }
    }
}

// Função para atualizar o display dos pontos das equipes
function updateTeamPointsDisplay() {
    const container = document.getElementById('teamPointsContainer');
    // Recria a seção para refletir os pontos atuais
    container.innerHTML = '<h4>Pontuar equipes:</h4>';

    teams.forEach(team => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.background = '#16213e';
        div.style.padding = '12px';
        div.style.margin = '8px 0';
        div.style.borderRadius = '8px';

        const teamInfo = document.createElement('span');
        teamInfo.textContent = `${team.name}: ${team.points} pts`;
        teamInfo.style.fontSize = '18px';
        teamInfo.style.color = '#eee';
        teamInfo.style.flexGrow = '1';

        const pointBtn = document.createElement('button');
        // Se a equipe tem pontos desta questão, mostra opção de remover
        const hasRecentPoints = team.points > 0 &&
            (currentQuestionIndex === 0 || teams.reduce((sum, t) => sum + t.points, 0) > 0);
        pointBtn.textContent = hasRecentPoints ? 'Errou (-100)' : 'Acertou (+100)';
        pointBtn.onclick = () => toggleTeamPoint(team);
        pointBtn.style.background = '#06d6a0';
        pointBtn.style.color = '#111';
        pointBtn.style.border = 'none';
        pointBtn.style.padding = '8px 16px';
        pointBtn.style.fontSize = '16px';
        pointBtn.style.borderRadius = '6px';
        pointBtn.style.cursor = 'pointer';

        div.appendChild(teamInfo);
        div.appendChild(pointBtn);
        container.appendChild(div);
    });
}

// Função para ir para a próxima questão
function nextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex >= PERGUNTAS.length) {
        showFinalRanking();
        return;
    }

    loadQuestion();
    startTimer();
}

// Função para mostrar o ranking final
function showFinalRanking() {
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('endScreen').classList.add('active');

    // Ordenar equipes por pontos (decrescente)
    const sortedTeams = [...teams].sort((a, b) => b.points - a.points);

    const list = document.getElementById('finalRankingList');
    list.innerHTML = '';

    sortedTeams.forEach((team, index) => {
        const li = document.createElement('li');
        li.style.padding = '12px';
        li.style.margin = '8px 0';
        li.style.background = '#16213e';
        li.style.borderRadius = '8px';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';

        const position = document.createElement('span');
        position.textContent = `${index + 1}º`;
        position.style.fontSize = '20px';
        position.style.fontWeight = 'bold';
        position.style.color = index === 0 ? '#ffd166' : '#eee';

        const teamName = document.createElement('span');
        teamName.textContent = team.name;
        teamName.style.fontSize = '18px';
        teamName.style.color = '#eee';
        teamName.style.flexGrow = '1';

        const points = document.createElement('span');
        points.textContent = `${team.points} pts`;
        points.style.fontSize = '18px';
        points.style.fontWeight = 'bold';
        points.style.color = '#06d6a0';

        li.appendChild(position);
        li.appendChild(teamName);
        li.appendChild(points);
        list.appendChild(li);
    });
}

// Função para resetar o jogo
function resetGame() {
    // Resetar todos os estados
    currentQuestionIndex = 0;
    timer = 90;
    teams.forEach(team => {
        team.points = 0;
        team.name = document.getElementById(`team${team.id}`).value || `Equipe ${team.id}`;
    });

    // Voltar para tela inicial
    document.getElementById('endScreen').classList.remove('active');
    document.getElementById('startScreen').classList.add('active');

    // Resetar música se estiver tocando
    if (musicOn) {
        toggleMusic(); // Desliga
        toggleMusic(); // Liga novamente (reinicia)
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar evento de toque para iniciar áudio (necessário para políticas de autoplay)
    document.addEventListener('touchstart', () => {
        if (musicOn && !isAudioInitialized) {
            initAudio();
        }
    }, { once: true });

    // Também permitir clique para iniciar áudio
    document.addEventListener('click', () => {
        if (musicOn && !isAudioInitialized) {
            initAudio();
        }
    }, { once: true });
});
(function(){var t=document.getElementById('timerText');if(!t)return;
new MutationObserver(function(){var n=parseInt(t.textContent,10);t.classList.toggle('low',n<=10)}).observe(t,{childList:true,characterData:true,subtree:true});})();
