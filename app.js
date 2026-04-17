// Troca de Abas
function abrirAba(idAba) {
    document.querySelectorAll('.tab-content').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(idAba).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

// Lógica de Campos Condicionais (Sim/Não)
function toggleCondicional(selectId, divId, condicaoShow) {
    const valor = document.getElementById(selectId).value;
    const div = document.getElementById(divId);
    const textarea = div.querySelector('textarea');
    
    if (valor === condicaoShow) {
        div.classList.remove('hidden');
        textarea.required = true;
    } else {
        div.classList.add('hidden');
        textarea.required = false;
        textarea.value = ''; // Limpa se o usuário mudar de ideia
    }
}

// ==========================================
// ABA 1: SALVAR PLANTÃO
// ==========================================
async function salvarPlantao() {
    try {
        // 1. Faz upload da assinatura
        const urlAssinatura = await uploadAssinatura(document.getElementById('canvas-plantao'), 'plantao');

        // 2. Coleta os dados
        const dados = {
            usuario_id: usuarioAtual.id,
            hora_assumiu: document.getElementById('p_hora_assumiu').value,
            emails_resp: document.getElementById('p_emails').value === 'sim',
            motivo_emails: document.getElementById('p_motivo_emails').value,
            chamados_pend: document.getElementById('p_chamados').value === 'sim',
            motivo_chamados: document.getElementById('p_motivo_chamados').value,
            // (Adicione aqui a coleta das outras condicionais: maquinas, cadeiras, etc)
            assinatura_url: urlAssinatura
        };

        // 3. Salva no Supabase
        const { error } = await supabase.from('plantoes').insert([dados]);

        if (error) throw error;

        alert('Plantão registrado com sucesso! A supervisão foi notificada.');
        document.getElementById('form-plantao').reset();
        limparCanvas('canvas-plantao');

    } catch (err) {
        alert('Erro ao salvar plantão: Verifique se assinou o documento.');
        console.error(err);
    }
}

// ==========================================
// ABA 2: CHAVES
// ==========================================
async function carregarSelectChaves() {
    // Carrega chaves disponíveis
    const { data: disponiveis } = await supabase.from('chaves').select('*').eq('status', 'disponivel');
    const selDisp = document.getElementById('select-chaves-disponiveis');
    selDisp.innerHTML = disponiveis.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

    // Carrega chaves retiradas
    const { data: retiradas } = await supabase.from('chaves').select('*').eq('status', 'retirada');
    const selRet = document.getElementById('select-chaves-retiradas');
    selRet.innerHTML = retiradas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

async function registrarChave(tipo) { // tipo = 'retirada' ou 'devolucao'
    const selectId = tipo === 'retirada' ? 'select-chaves-disponiveis' : 'select-chaves-retiradas';
    const canvasId = tipo === 'retirada' ? 'canvas-retirada' : 'canvas-devolucao';
    const chaveId = document.getElementById(selectId).value;

    if (!chaveId) return alert('Selecione uma chave.');

    try {
        const urlAssinatura = await uploadAssinatura(document.getElementById(canvasId), `chave_${tipo}`);

        // 1. Registra o movimento
        await supabase.from('movimentacao_chaves').insert([{
            chave_id: chaveId,
            usuario_id: usuarioAtual.id,
            tipo_movimento: tipo,
            assinatura_url: urlAssinatura
        }]);

        // 2. Atualiza o status da chave
        const novoStatus = tipo === 'retirada' ? 'retirada' : 'disponivel';
        await supabase.from('chaves').update({ status: novoStatus }).eq('id', chaveId);

        alert(`Chave ${tipo} registrada com sucesso!`);
        limparCanvas(canvasId);
        carregarSelectChaves(); // Recarrega as listas

    } catch (err) { alert('Erro: ' + err); }
}

// ==========================================
// ADMIN: EXPORTAR PDF
// ==========================================
async function exportarPDF() {
    // Busca dados no Supabase e usa a biblioteca html2pdf
    // Exemplo simplificado de trigger:
    const elementoParaExportar = document.getElementById('app-container');
    html2pdf().from(elementoParaExportar).save('Relatorio_Plantao.pdf');
}
