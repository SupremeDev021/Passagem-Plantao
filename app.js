// ==========================================
// INICIALIZAÇÃO DA TELA (DASHBOARD)
// ==========================================
// Espera a página inteira carregar antes de puxar os dados
document.addEventListener("DOMContentLoaded", () => {
    // Carrega o dashboard automaticamente após 1.5 segundos
    setTimeout(() => {
        if(typeof carregarResumoDashboard === 'function') {
            carregarResumoDashboard();
        }
        
        // Verifica se o usuário é Operacional para exibir a aba Configurações
        if (typeof usuarioAtual !== 'undefined' && usuarioAtual) {
            if (usuarioAtual.role !== 'admin') {
                const btnConfig = document.getElementById('btn-config');
                if (btnConfig) btnConfig.classList.remove('hidden');
            }
        }
    }, 1500); 
});

// ==========================================
// TROCA DE ABAS E MODAIS
// ==========================================
function abrirAba(idAba) {
    // 1. Esconde todas as abas da tela
    document.querySelectorAll('.tab-content').forEach(aba => aba.classList.add('hidden'));
    
    // 2. Apaga o brilho (active) de todos os botões do menu
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // 3. Mostra a aba que você escolheu
    const abaAlvo = document.getElementById(idAba);
    if (abaAlvo) {
        abaAlvo.classList.remove('hidden');
    }
    
    // 4. Encontra o botão exato no menu e acende ele (Sem usar o 'event' que estava travando)
    const botaoClicado = document.querySelector(`button[onclick*="${idAba}"]`);
    if (botaoClicado) {
        botaoClicado.classList.add('active');
    }

    // AJUSTES ESPECÍFICOS POR ABA
    if (idAba === 'aba-plantao') {
        carregarTecnicosSelect();
    }

    if (idAba === 'aba-toner') {
        carregarListaToners();
        carregarListaChamados();
    }
    
    if (idAba === 'aba-ocorrencias') {
        carregarListaOcorrencias();
    }

    if (idAba === 'aba-chaves') {
        carregarSelectChaves();
    }

    if (idAba === 'aba-config') {
        carregarMeusDados();
    }

    if (idAba === 'aba-admin') {
        carregarPlantoesAdmin();
    }
}

// Controle de Modais (Janelas Flutuantes)
function abrirModal(idModal) {
    document.getElementById(idModal).classList.add('flex');
    
    // Se abrir o modal de permissões, carrega a tabela automaticamente
    if (idModal === 'modal-permissoes') {
        carregarTabelaUsuarios();
    }
}

function fecharModal(idModal) {
    document.getElementById(idModal).classList.remove('flex');
}

// Fechar modal ao clicar do lado de fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('flex');
    }
}

// Lógica de Campos Condicionais (Para selects antigos - mantido por segurança)
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

// NOVA FUNÇÃO: Lógica de Campos Condicionais para Checkboxes
function toggleCondicionalCheckbox(checkboxElement, divId, mostrarQuandoMarcado) {
    const div = document.getElementById(divId);
    const textarea = div.querySelector('textarea');
    
    if ((mostrarQuandoMarcado && checkboxElement.checked) || (!mostrarQuandoMarcado && !checkboxElement.checked)) {
        div.classList.remove('hidden');
        textarea.required = true;
    } else {
        div.classList.add('hidden');
        textarea.required = false;
        textarea.value = ''; // Limpa se o usuário mudar de ideia
    }
}

// ==========================================
// LÓGICA DE MÚLTIPLOS TÉCNICOS NO PLANTÃO
// ==========================================
let tecnicosNoPlantao = []; // Array que guarda os selecionados

async function carregarTecnicosSelect() {
    try {
        const { data, error } = await supabase.from('profiles').select('id, nome').order('nome');
        if (error) throw error;
        
        const select = document.getElementById('select-tecnicos-plantao');
        if (select) {
            select.innerHTML = '<option value="">Selecione um colega...</option>' + 
                               data.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
        }
    } catch (err) { console.error("Erro ao carregar técnicos:", err); }
}

function adicionarTecnico() {
    const select = document.getElementById('select-tecnicos-plantao');
    const id = select.value;
    const nome = select.options[select.selectedIndex]?.text;

    if (!id) return alert("Selecione um técnico na lista.");
    
    // Impede adicionar o mesmo técnico duas vezes
    if (tecnicosNoPlantao.find(t => t.id === id)) {
        return alert("Este colega já foi adicionado ao plantão!");
    }

    tecnicosNoPlantao.push({ id, nome });
    atualizarInterfaceTecnicos();
    select.value = ''; // Reseta o dropdown
}

function removerTecnico(id) {
    tecnicosNoPlantao = tecnicosNoPlantao.filter(t => t.id !== id);
    atualizarInterfaceTecnicos();
}

function atualizarInterfaceTecnicos() {
    const container = document.getElementById('lista-tecnicos-plantao');
    
    if (tecnicosNoPlantao.length === 0) {
        container.innerHTML = '<span style="font-size: 12px; color: #94a3b8; text-align: center;">Você está sozinho no plantão?</span>';
        return;
    }

    container.innerHTML = tecnicosNoPlantao.map(t => `
        <div class="tecnico-badge">
            <span>${t.nome}</span>
            <button type="button" onclick="removerTecnico('${t.id}')" title="Remover">✕</button>
        </div>
    `).join('');
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
            usuario_id: typeof usuarioAtual !== 'undefined' && usuarioAtual ? usuarioAtual.id : null,
            tecnicos_plantao: tecnicosNoPlantao.map(t => t.nome).join(', '), // Nomes da equipe adicionados
            hora_assumiu: document.getElementById('p_hora_assumiu').value,
            hora_largou: document.getElementById('p_hora_largou').value,
            emails_resp: document.getElementById('p_emails').checked,
            motivo_emails: document.getElementById('p_motivo_emails').value,
            chamados_pend: document.getElementById('p_chamados').checked,
            motivo_chamados: document.getElementById('p_motivo_chamados').value,
            forms_zerado: document.getElementById('p_forms').checked,
            motivo_forms: document.getElementById('p_motivo_forms').value,
            maquinas_func: document.getElementById('p_maquinas').checked,
            motivo_maquinas: document.getElementById('p_motivo_maquinas').value,
            cadeiras_lugar: document.getElementById('p_cadeiras').checked,
            motivo_cadeiras: document.getElementById('p_motivo_cadeiras').value,
            painel_tv: document.getElementById('p_tv').checked,
            motivo_tv: document.getElementById('p_motivo_tv').value,
            ocorrencias: document.getElementById('p_ocorrencias').checked,
            motivo_ocorrencias: document.getElementById('p_motivo_ocorrencias').value,
            assinatura_url: urlAssinatura
        };

        // 3. Salva no Supabase
        const { error } = await supabase.from('plantoes').insert([dados]);

        if (error) throw error;

        alert('Plantão registrado com sucesso!');
        
        // 4. Limpa tudo para o próximo plantão
        document.getElementById('form-plantao').reset();
        limparCanvas('canvas-plantao');
        tecnicosNoPlantao = []; // Esvazia o array de colegas
        atualizarInterfaceTecnicos(); // Limpa a lista visual da tela

    } catch (err) {
        console.error(err);
        alert('Erro ao salvar: Verifique se preencheu os horários e assinou.');
    }
}

// ==========================================
// ABA 2: CHAVES
// ==========================================
async function carregarSelectChaves() {
    try {
        // Carrega chaves disponíveis
        const { data: disponiveis } = await supabase.from('chaves').select('*').eq('status', 'disponivel');
        const selDisp = document.getElementById('select-chaves-disponiveis');
        if(selDisp) {
            selDisp.innerHTML = '<option value="">Selecione a chave...</option>' + 
                                disponiveis.map(c => `<option value="${c.id}">${c.nome} (${c.localizacao})</option>`).join('');
        }

        // Carrega chaves em uso (retiradas)
        const { data: retiradas } = await supabase.from('chaves').select('*').eq('status', 'retirada');
        const selRet = document.getElementById('select-chaves-retiradas');
        if(selRet) {
            selRet.innerHTML = '<option value="">Selecione a chave...</option>' + 
                               retiradas.map(c => `<option value="${c.id}">${c.nome} (${c.localizacao})</option>`).join('');
        }
    } catch (err) {
        console.log("Erro no DB (Chaves):", err);
    }
}

async function registrarChave(tipo) { 
    const selectId = tipo === 'retirada' ? 'select-chaves-disponiveis' : 'select-chaves-retiradas';
    const canvasId = tipo === 'retirada' ? 'canvas-retirada' : 'canvas-devolucao';
    const horaId = tipo === 'retirada' ? 'hora-retirada' : 'hora-devolucao';
    const responsavelId = tipo === 'retirada' ? 'responsavel-retirada' : 'responsavel-devolucao';
    const formId = tipo === 'retirada' ? 'form-retirada-chave' : 'form-devolucao-chave';

    const chaveId = document.getElementById(selectId).value;
    const dataHora = document.getElementById(horaId).value;
    const responsavel = document.getElementById(responsavelId).value;

    if (!chaveId || !dataHora || !responsavel) {
        return alert('Preencha todos os campos antes de prosseguir.');
    }

    try {
        let urlFoto = null;
        
        // NOVO: Lógica de upload de foto exclusiva para DEVOLUÇÃO
        if (tipo === 'devolucao') {
            const inputFoto = document.getElementById('foto-devolucao');
            if (inputFoto.files.length === 0) {
                return alert("Anexe a foto da chave/local para registrar a devolução.");
            }
            
            const fotoFile = inputFoto.files[0];
            const nomeFoto = `devolucao_chave_${Date.now()}_${fotoFile.name}`;
            
            // Usando o mesmo bucket 'assinaturas' que você já tem para armazenar
            const { error: errFoto } = await supabase.storage.from('assinaturas').upload(nomeFoto, fotoFile);
            if (errFoto) throw errFoto;
            
            urlFoto = supabase.storage.from('assinaturas').getPublicUrl(nomeFoto).data.publicUrl;
        }

        const urlAssinatura = await uploadAssinatura(document.getElementById(canvasId), `chave_${tipo}`);

        // 1. Registra o movimento na tabela de histórico
        const payloadMovimento = {
            chave_id: chaveId,
            usuario_id: typeof usuarioAtual !== 'undefined' && usuarioAtual ? usuarioAtual.id : null,
            tipo_movimento: tipo,
            data_hora: dataHora,
            responsavel: responsavel,
            assinatura_url: urlAssinatura
        };
        
        // Se tiver foto (Devolução), adiciona no payload de salvamento
        if (urlFoto) {
            payloadMovimento.foto_url = urlFoto; 
        }

        await supabase.from('movimentacao_chaves').insert([payloadMovimento]);

        // 2. Atualiza o status físico da chave
        const novoStatus = tipo === 'retirada' ? 'retirada' : 'disponivel';
        await supabase.from('chaves').update({ status: novoStatus }).eq('id', chaveId);

        alert(`Sucesso! Chave ${tipo === 'retirada' ? 'retirada' : 'devolvida'}.`);
        
        document.getElementById(formId).reset();
        limparCanvas(canvasId);
        carregarSelectChaves(); // Recarrega os dropdowns na mesma hora

    } catch (err) { 
        alert('Erro ao processar chave: ' + err.message); 
    }
}

// ==========================================
// ABA 3: GESTÃO DE OCORRÊNCIAS 
// ==========================================
async function salvarOcorrencia() {
    const descricao = document.getElementById('o_descricao').value;
    const proposta = document.getElementById('o_proposta').value;
    const prazo = document.getElementById('o_prazo').value;
    const responsavel = document.getElementById('o_responsavel').value;
    const observacao = document.getElementById('o_observacao').value;

    if (!descricao || !proposta || !prazo || !responsavel) {
        return alert("Preencha todos os campos obrigatórios da ocorrência.");
    }

    try {
        const sigUrl = await uploadAssinatura(document.getElementById('canvas-nova-ocorrencia'), 'abertura_ocorrencia');

        const { error } = await supabase.from('ocorrencias').insert([{
            descricao: descricao,
            solucao_proposta: proposta,
            prazo: prazo,
            observacao: observacao,
            responsavel_abertura: responsavel,
            assinatura_abertura_url: sigUrl,
            status: 'Pendente' 
        }]);

        if (error) throw error;

        alert("Ocorrência registrada com sucesso!");
        document.getElementById('form-nova-ocorrencia').reset();
        limparCanvas('canvas-nova-ocorrencia');
        carregarListaOcorrencias();

    } catch (err) {
        alert("Erro ao salvar ocorrência: " + err.message);
    }
}

async function carregarListaOcorrencias() {
    try {
        const { data, error } = await supabase.from('ocorrencias').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        const tbody = document.getElementById('lista-ocorrencias-aba');
        if (tbody) {
            tbody.innerHTML = data.map(o => {
                const prazoFormatado = o.prazo ? o.prazo.split('-').reverse().join('/') : '-';
                
                let corStatus = '#e74c3c'; 
                if (o.status === 'Solucionada') corStatus = '#2ecc71'; 
                else if (o.status === 'Em andamento') corStatus = '#f39c12'; 

                return `
                    <tr>
                        <td>${o.descricao}</td>
                        <td>${prazoFormatado}</td>
                        <td>${o.responsavel_abertura}</td>
                        <td><span style="background-color: ${corStatus}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${o.status}</span></td>
                        <td>
                            ${o.status !== 'Solucionada' ? `<button class="btn-success btn-sm" onclick="abrirModalFinalizarOcorrencia('${o.id}')">Marcar como Solucionada</button>` : '<em>Finalizada</em>'}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) { console.error("Erro ao carregar ocorrências:", err.message); }
}

function abrirModalFinalizarOcorrencia(id) {
    document.getElementById('f_ocorrencia_id').value = id;
    limparCanvas('canvas-finalizar-ocorrencia');
    abrirModal('modal-finalizar-ocorrencia');
}

async function finalizarOcorrencia() {
    const id = document.getElementById('f_ocorrencia_id').value;
    const solucao = document.getElementById('f_solucao').value;
    const solucionador = document.getElementById('f_quem_solucionou').value;
    const acompanhante = document.getElementById('f_quem_acompanhou').value;

    if (!solucao || !solucionador || !acompanhante) {
        return alert("Preencha todos os campos do formulário.");
    }

    try {
        const sigUrl = await uploadAssinatura(document.getElementById('canvas-finalizar-ocorrencia'), 'fechamento_ocorrencia');

        const { error } = await supabase.from('ocorrencias').update({
            status: 'Solucionada',
            solucao_aplicada: solucao,
            quem_solucionou: solucionador,
            quem_acompanhou: acompanhante,
            assinatura_fechamento_url: sigUrl,
            data_finalizacao: new Date().toISOString() 
        }).eq('id', id);

        if (error) throw error;

        alert("Ocorrência solucionada com sucesso!");
        document.getElementById('form-finalizar-ocorrencia').reset();
        fecharModal('modal-finalizar-ocorrencia');
        carregarListaOcorrencias(); 

    } catch (err) {
        alert("Erro ao finalizar ocorrência: " + err.message);
    }
}

// ==========================================
// ABA 4: CONTROLE DE TONERS E IMPRESSORAS
// ==========================================
async function carregarListaToners() {
    try {
        const { data, error } = await supabase.from('cadastro_toner').select('*').order('modelo_toner');
        if (error) throw error;
        
        const tbody = document.getElementById('lista-toners-aba');
        if(tbody) {
            tbody.innerHTML = data.map(t => `
                <tr>
                    <td>${t.modelo_toner}</td>
                    <td><strong>${t.quantidade_atual}</strong></td>
                    <td>
                        <button class="btn-primary btn-sm" onclick="abrirModalTrocaToner('${t.id}')" ${t.quantidade_atual <= 0 ? 'disabled' : ''}>Trocar Toner</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error("Erro ao carregar toners:", err.message); }
}

async function carregarListaChamados() {
    try {
        const { data, error } = await supabase.from('chamado_simpress').select('*').eq('status', 'Aberto');
        if (error) throw error;

        const tbody = document.getElementById('lista-chamados-aba');
        if(tbody) {
            tbody.innerHTML = data.map(c => `
                <tr>
                    <td>${c.numero_chamado}</td>
                    <td>${c.modelo_impressora} <br><small>Série: ${c.numero_serie}</small></td>
                    <td>${c.setor_localizada}</td>
                    <td>
                        <button class="btn-success btn-sm" onclick="abrirModalAtenderChamado('${c.id}')">Atendido</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error("Erro ao carregar chamados:", err.message); }
}

function abrirModalTrocaToner(idToner) {
    document.getElementById('tt_toner_id').value = idToner;
    limparCanvas('canvas-troca-toner');
    abrirModal('modal-troca-toner');
}

function abrirModalAtenderChamado(idChamado) {
    document.getElementById('ac_chamado_id').value = idChamado;
    limparCanvas('canvas-atender-chamado');
    abrirModal('modal-atender-chamado');
}

async function salvarTrocaToner() {
    const tonerId = document.getElementById('tt_toner_id').value;
    const inputFoto = document.getElementById('tt_foto');
    const setor = document.getElementById('tt_setor').value;
    const andar = document.getElementById('tt_andar').value;
    const predio = document.getElementById('tt_predio').value;

    if (!setor || !andar || !predio || inputFoto.files.length === 0) {
        return alert("Preencha todos os campos e anexe a foto da página de teste.");
    }

    try {
        const fotoFile = inputFoto.files[0];
        const nomeFoto = `teste_${Date.now()}_${fotoFile.name}`;
        const { error: errFoto } = await supabase.storage.from('assinaturas').upload(nomeFoto, fotoFile);
        if (errFoto) throw errFoto;
        const fotoUrl = supabase.storage.from('assinaturas').getPublicUrl(nomeFoto).data.publicUrl;

        const sigUrl = await uploadAssinatura(document.getElementById('canvas-troca-toner'), 'troca_toner');

        await supabase.from('registro_troca_toner').insert([{
            toner_id: tonerId,
            usuario_id: typeof usuarioAtual !== 'undefined' && usuarioAtual ? usuarioAtual.id : null,
            foto_teste_url: fotoUrl,
            setor: setor,
            andar: andar,
            predio: predio,
            assinatura_tecnico_url: sigUrl
        }]);

        const { data: tonerAtual } = await supabase.from('cadastro_toner').select('quantidade_atual').eq('id', tonerId).single();
        await supabase.from('cadastro_toner').update({ quantidade_atual: tonerAtual.quantidade_atual - 1 }).eq('id', tonerId);

        alert("Troca registrada com sucesso! Estoque atualizado.");
        document.getElementById('form-troca-toner').reset();
        fecharModal('modal-troca-toner');
        carregarListaToners(); 

    } catch (e) { alert("Erro ao salvar troca: " + e.message); }
}

async function salvarAtendimentoChamado() {
    const chamadoId = document.getElementById('ac_chamado_id').value;
    const solucao = document.getElementById('ac_solucao').value;
    // Puxando do Checkbox atualizado no HTML
    const temObs = document.getElementById('ac_tem_obs').checked;
    const obs = temObs ? document.getElementById('ac_obs_texto').value : '';
    const tecnico = document.getElementById('ac_tecnico').value;

    if (!solucao || !tecnico) return alert("Preencha a Solução e o Técnico responsável.");

    try {
        const sigUrl = await uploadAssinatura(document.getElementById('canvas-atender-chamado'), 'atend_simpress');

        const { error } = await supabase.from('chamado_simpress').update({
            status: 'Atendido',
            solucao_aplicada: solucao,
            observacao: obs,
            tecnico_acompanhante: tecnico,
            assinatura_tecnico_url: sigUrl
        }).eq('id', chamadoId);

        if (error) throw error;

        alert("Atendimento registrado! O chamado foi movido para os concluídos.");
        document.getElementById('form-atender-chamado').reset();
        fecharModal('modal-atender-chamado');
        carregarListaChamados(); 

    } catch (e) { alert("Erro ao salvar atendimento: " + e.message); }
}

// ==========================================
// ABA CONFIGURAÇÕES (SOMENTE OPERACIONAL)
// ==========================================

function carregarMeusDados() {
    if (typeof usuarioAtual !== 'undefined' && usuarioAtual) {
        document.getElementById('meu_nome').value = usuarioAtual.nome || '';
        document.getElementById('meu_celular').value = usuarioAtual.celular || '';
        document.getElementById('meu_cpf').value = usuarioAtual.cpf || '';
    }
}

async function salvarMeusDados() {
    const nome = document.getElementById('meu_nome').value;
    const celular = document.getElementById('meu_celular').value;
    const cpf = document.getElementById('meu_cpf').value;

    if (!nome) return alert("O nome completo não pode ficar em branco.");

    try {
        const { error } = await supabase.from('profiles').update({
            nome: nome,
            celular: celular,
            cpf: cpf
        }).eq('id', usuarioAtual.id);

        if (error) throw error;

        alert("Seus dados foram atualizados com sucesso!");
        
        // Atualiza a memória local
        usuarioAtual.nome = nome;
        usuarioAtual.celular = celular;
        usuarioAtual.cpf = cpf;
        
        // Atualiza o nome exibido no Header ali no topo da tela
        const userNameHeader = document.getElementById('user-name');
        if (userNameHeader) {
            // Pega só o primeiro nome para ficar elegante no cabeçalho
            userNameHeader.innerText = `Olá, ${nome.split(' ')[0]}`; 
        }
        
    } catch (err) {
        alert("Erro ao salvar seus dados: " + err.message);
    }
}

async function salvarMinhaSenha() {
    const senha1 = document.getElementById('minha_nova_senha').value;
    const senha2 = document.getElementById('minha_nova_senha_conf').value;

    if (!senha1 || !senha2) return alert("Por favor, preencha os dois campos de senha.");
    if (senha1 !== senha2) return alert("Atenção: As senhas digitadas não são iguais!");
    if (senha1.length < 6) return alert("A nova senha deve ter pelo menos 6 caracteres.");

    try {
        // A função de mudar a própria senha usa o modulo auth do supabase
        const { error } = await supabase.auth.updateUser({ password: senha1 });
        
        if (error) throw error;

        alert("Senha alterada com segurança! Na próxima vez, use a nova senha.");
        document.getElementById('form-minha-senha').reset();
        
    } catch (err) {
        alert("Erro ao alterar a senha: " + err.message);
    }
}

// ==========================================
// ADMIN: FUNÇÕES DE CADASTRO E USUÁRIOS
// ==========================================

async function adminCriarUsuario() {
    const nome = document.getElementById('cad_nome').value;
    const turno = document.getElementById('cad_turno').value;
    const celular = document.getElementById('cad_celular').value;
    const cpf = document.getElementById('cad_cpf').value;
    const email = document.getElementById('cad_email').value;
    const senha = document.getElementById('cad_senha').value;

    if (!nome || !email || !senha || !turno) {
        return alert('Por favor, preencha Nome, E-mail, Senha e Turno.');
    }

    try {
        const { error } = await supabase.rpc('admin_criar_usuario', {
            p_email: email,
            p_senha: senha,
            p_nome: nome,
            p_turno: turno,
            p_celular: celular,
            p_cpf: cpf
        });

        if (error) throw error;

        alert(`Sucesso! O usuário ${nome} foi criado.`);
        document.getElementById('form-novo-usuario').reset();
        fecharModal('modal-usuario');
        
    } catch (err) {
        console.error('Erro completo:', err);
        alert('Erro ao criar usuário: ' + (err.message || 'Verifique se o e-mail já existe.'));
    }
}

async function carregarTabelaUsuarios() {
    try {
        const { data: usuarios, error } = await supabase
            .from('profiles')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        const tabela = document.getElementById('tabela-usuarios-admin');
        tabela.innerHTML = ''; 

        usuarios.forEach(user => {
            const tr = document.createElement('tr');
            const cpfUser = user.cpf ? `'${user.cpf}'` : `null`;
            
            tr.innerHTML = `
                <td>${user.nome}</td>
                <td>${user.email}</td>
                <td>
                    <select id="role-${user.id}" class="btn-sm" style="margin-bottom: 0;">
                        <option value="operacional" ${user.role === 'operacional' ? 'selected' : ''}>Operacional</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="btn-primary btn-sm" onclick="salvarNivelAcesso('${user.id}')">Salvar Edição</button>
                        <button class="btn-primary btn-sm" style="background: #8e44ad;" onclick="prepararEdicaoCompleta('${user.id}')">Alterar Dados</button>
                        <button class="btn-primary btn-sm" style="background: #f39c12;" onclick="redefinirSenhaUsuario('${user.id}', ${cpfUser})">Redefinir Senha</button>
                        <button class="btn-danger btn-sm" onclick="deletarUsuario('${user.id}')">Excluir</button>
                    </div>
                </td>
            `;
            tabela.appendChild(tr);
        });
    } catch (err) {
        console.error("Erro ao carregar tabela:", err.message);
    }
}

async function salvarNivelAcesso(userId) {
    const novoRole = document.getElementById(`role-${userId}`).value;

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: novoRole })
            .eq('id', userId);

        if (error) throw error;
        alert("Nível de acesso atualizado com sucesso!");
    } catch (err) {
        alert("Erro ao atualizar nível: " + err.message);
    }
}

async function prepararEdicaoCompleta(userId) {
    try {
        const { data: user, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) throw error;

        fecharModal('modal-permissoes');

        document.getElementById('edit_id').value = user.id;
        document.getElementById('edit_nome').value = user.nome || '';
        document.getElementById('edit_turno').value = user.turno || '';
        document.getElementById('edit_celular').value = user.celular || '';
        document.getElementById('edit_cpf').value = user.cpf || '';
        document.getElementById('edit_email').value = user.email || '';

        abrirModal('modal-editar-usuario');
    } catch (err) {
        alert("Erro ao buscar dados: " + err.message);
    }
}

async function salvarEdicaoUsuario() {
    const userId = document.getElementById('edit_id').value;
    const nome = document.getElementById('edit_nome').value;
    const turno = document.getElementById('edit_turno').value;
    const celular = document.getElementById('edit_celular').value;
    const cpf = document.getElementById('edit_cpf').value;
    const email = document.getElementById('edit_email').value;

    try {
        const { error } = await supabase.from('profiles').update({
            nome: nome,
            turno: turno,
            celular: celular,
            cpf: cpf,
            email: email
        }).eq('id', userId);

        if (error) throw error;

        alert("Dados alterados com sucesso no Perfil!");
        fecharModal('modal-editar-usuario');
        abrirModal('modal-permissoes'); 
        
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }
}

async function redefinirSenhaUsuario(userId, cpfUsuario) {
    if (!cpfUsuario || cpfUsuario.length < 4) {
        return alert("Erro: O usuário não possui um CPF cadastrado ou válido para gerar a senha.");
    }

    const cpfNumeros = cpfUsuario.replace(/\D/g, ""); 
    const novaSenha = cpfNumeros.substring(0, 4);

    if (!confirm(`A nova senha deste usuário será os 4 primeiros dígitos do CPF (${novaSenha}). Confirmar operação?`)) {
        return;
    }
    
    try {
        const { error } = await supabase.rpc('admin_redefinir_senha', { 
            p_user_id: userId, 
            p_nova_senha: novaSenha 
        });

        if (error) throw error;
        
        alert(`Sucesso! A senha foi redefinida para: ${novaSenha}`);
    } catch (err) {
        alert("Erro ao redefinir senha: " + err.message);
    }
}

async function deletarUsuario(userId) {
    if (!confirm("Tem certeza que deseja excluir este usuário permanentemente?")) return;

    try {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        
        alert("Usuário removido!");
        carregarTabelaUsuarios();
    } catch (err) {
        alert("Erro ao excluir: " + err.message);
    }
}

// ==========================================
// ADMIN: FUNÇÕES DE CADASTRO BASE
// ==========================================

async function adminCadastrarChave() {
    const nome = document.getElementById('cad_chave_nome').value;
    const cor = document.getElementById('cad_chave_cor').value;
    const local = document.getElementById('cad_chave_local').value;

    if(!nome || !cor || !local) return alert('Preencha todos os campos!');

    try {
        const { error } = await supabase.from('chaves').insert([
            { nome: nome, cor: cor, localizacao: local, status: 'disponivel' }
        ]);
        
        if (error) throw error;
        alert('Chave cadastrada com sucesso!');
        fecharModal('modal-chave');
        carregarSelectChaves(); 
    } catch (err) { alert('Erro: ' + err.message); }
}

async function adminCadastrarToner() {
    const modelo = document.getElementById('cad_toner_modelo').value;
    const impressoras = document.getElementById('cad_toner_imp').value;
    const quantidade = document.getElementById('cad_toner_qtd').value;

    if(!modelo || !impressoras || !quantidade) {
        return alert('Preencha todos os campos!');
    }

    try {
        const { error } = await supabase.from('cadastro_toner').insert([
            { modelo_toner: modelo, impressora_compativel: impressoras, quantidade_atual: parseInt(quantidade) }
        ]);
        
        if (error) throw error;
        
        alert('Toner cadastrado com sucesso no estoque!');
        fecharModal('modal-toner');
    } catch (err) { alert('Erro: ' + err.message); }
}

async function adminCadastrarSimpress() {
    const numero = document.getElementById('cad_sim_numero').value;
    const modelo = document.getElementById('cad_sim_modelo').value;
    const serie = document.getElementById('cad_sim_serie').value;
    const local = document.getElementById('cad_sim_local').value;

    if(!numero || !modelo || !serie || !local) return alert('Preencha todos os campos!');

    try {
        const { error } = await supabase.from('chamado_simpress').insert([
            { 
                numero_chamado: numero, 
                modelo_impressora: modelo, 
                numero_serie: serie, 
                setor_localizada: local,
                status: 'Aberto' 
            }
        ]);
        
        if (error) throw error;
        
        alert('Chamado Simpress registrado com sucesso!');
        fecharModal('modal-simpress');
        
        document.getElementById('cad_sim_numero').value = '';
        document.getElementById('cad_sim_modelo').value = '';
        document.getElementById('cad_sim_serie').value = '';
        document.getElementById('cad_sim_local').value = '';

        carregarListaChamados();

    } catch (err) { alert('Erro ao salvar chamado: ' + err.message); }
}

// ==========================================
// TELA INICIAL E AUDITORIA DE PLANTÕES (ADMIN)
// ==========================================

async function carregarResumoDashboard() {
    try {
        const { data: toners } = await supabase.from('cadastro_toner').select('*').order('modelo_toner');
        const dashToners = document.getElementById('dash-toners');
        if (dashToners) {
            dashToners.innerHTML = toners && toners.length 
                ? toners.map(t => `<li>📦 ${t.modelo_toner}: <strong style="color: ${t.quantidade_atual <= 1 ? 'red' : 'green'}">${t.quantidade_atual} un.</strong></li>`).join('') 
                : '<li>Nenhum toner cadastrado.</li>';
        }

        const { data: chaves } = await supabase.from('chaves').select('*').eq('status', 'retirada');
        const dashChaves = document.getElementById('dash-chaves');
        if (dashChaves) {
            dashChaves.innerHTML = chaves && chaves.length 
                ? chaves.map(c => `<li>🔑 ${c.nome} - <span style="color: red; font-weight: bold;">Em uso</span></li>`).join('') 
                : '<li>✅ Todas as chaves na base.</li>';
        }

        const { data: chamados } = await supabase.from('chamado_simpress').select('*').eq('status', 'Aberto');
        const dashChamados = document.getElementById('dash-chamados');
        if (dashChamados) {
            dashChamados.innerHTML = chamados && chamados.length 
                ? chamados.map(c => `<li>🖨️ N ${c.numero_chamado} (${c.setor_localizada})</li>`).join('') 
                : '<li>✅ Nenhum chamado aberto.</li>';
        }

        const { data: ocorrencias } = await supabase.from('ocorrencias').select('*').neq('status', 'Solucionada');
        const dashOcorrencias = document.getElementById('dash-ocorrencias');
        if (dashOcorrencias) {
            dashOcorrencias.innerHTML = ocorrencias && ocorrencias.length 
                ? ocorrencias.map(o => `<li>⚠️ ${o.descricao} <br><small style="color: #666;">Prazo: ${o.prazo ? o.prazo.split('-').reverse().join('/') : '-'} | ${o.status}</small></li>`).join('') 
                : '<li>✅ Nenhuma ocorrência pendente.</li>';
        }

        const { data: plantoes } = await supabase.from('plantoes').select('*').eq('visto_supervisao', false).order('created_at', { ascending: false });
        const dashPlantoes = document.getElementById('dash-plantoes');
        if (dashPlantoes) {
            dashPlantoes.innerHTML = plantoes && plantoes.length 
                ? plantoes.map(p => `
                    <tr>
                        <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>Das ${p.hora_assumiu} às ${p.hora_largou}</td>
                        <td style="color: #f39c12; font-weight: bold;">⏳ Pendente</td>
                    </tr>
                `).join('') 
                : '<tr><td colspan="3" style="text-align: center;">✅ Todos os plantões estão com visto da supervisão.</td></tr>';
        }

    } catch (err) {
        console.error("Erro ao carregar Dashboard:", err.message);
    }
}

async function carregarPlantoesAdmin() {
    try {
        const { data: plantoes } = await supabase.from('plantoes').select('*').eq('visto_supervisao', false).order('created_at', { ascending: false });
        const adminPlantoes = document.getElementById('admin-plantoes-lista');
        if (adminPlantoes) {
            adminPlantoes.innerHTML = plantoes && plantoes.length 
                ? plantoes.map(p => `
                    <tr>
                        <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>Das ${p.hora_assumiu} às ${p.hora_largou}</td>
                        <td><button class="btn-primary btn-sm" style="background: #3498db;" onclick="visualizarPlantao('${p.id}')">👁️ Abrir Ficha de Visto</button></td>
                    </tr>
                `).join('') 
                : '<tr><td colspan="3" style="text-align: center;">✅ Nada para auditar.</td></tr>';
        }
    } catch (err) {
        console.error("Erro ao carregar Plantões no Admin:", err.message);
    }
}

async function visualizarPlantao(idPlantao) {
    try {
        const { data: p, error } = await supabase.from('plantoes').select('*').eq('id', idPlantao).single();
        if (error) throw error;

        const conteudo = document.getElementById('detalhes-plantao-conteudo');
        
        // Incluí a visualização dos Técnicos da Equipe caso existam
        conteudo.innerHTML = `
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <strong>Data de Registro:</strong> ${new Date(p.created_at).toLocaleDateString('pt-BR')} às ${new Date(p.created_at).toLocaleTimeString('pt-BR')}<br>
                <strong>Turno do Técnico:</strong> ${p.hora_assumiu} às ${p.hora_largou}<br>
                <strong>Técnicos na Equipe:</strong> ${p.tecnicos_plantao || 'Nenhum / Plantão Sozinho'}
            </div>
            
            <p>📧 <strong>E-mails todos respondidos?</strong> <span style="color: ${p.emails_resp ? 'green' : 'red'}; font-weight: bold;">${p.emails_resp ? 'Sim' : 'Não'}</span> <br> 
            <span style="color: #555;">${p.motivo_emails ? `↳ Obs: ${p.motivo_emails}` : ''}</span></p>

            <p>🖨️ <strong>Há chamados pendentes?</strong> <span style="color: ${p.chamados_pend ? 'red' : 'green'}; font-weight: bold;">${p.chamados_pend ? 'Sim' : 'Não'}</span> <br> 
            <span style="color: #555;">${p.motivo_chamados ? `↳ Obs: ${p.motivo_chamados}` : ''}</span></p>

            <p>📝 <strong>MS Forms zerado?</strong> <span style="color: ${p.forms_zerado ? 'green' : 'red'}; font-weight: bold;">${p.forms_zerado ? 'Sim' : 'Não'}</span> <br> 
            <span style="color: #555;">${p.motivo_forms ? `↳ Obs: ${p.motivo_forms}` : ''}</span></p>

            <p>💻 <strong>Todas as máquinas funcionando?</strong> <span style="color: ${p.maquinas_func ? 'green' : 'red'}; font-weight: bold;">${p.maquinas_func ? 'Sim' : 'Não'}</span> <br> 
            <span style="color: #555;">${p.motivo_maquinas ? `↳ Obs: ${p.motivo_maquinas}` : ''}</span></p>

            <p>🪑 <strong>Cadeiras nos lugares?</strong> <span style="color: ${p.cadeiras_lugar ? 'green' : 'red'}; font-weight: bold;">${p.cadeiras_lugar ? 'Sim' : 'Não'}</span> <br> 
            <span style="color: #555;">${p.motivo_cadeiras ? `↳ Obs: ${p.motivo_cadeiras}` : ''}</span></p>

            <p>📺 <strong>Painel de TV em operação?</strong> <span style="color: ${p.painel_tv ? 'green' : 'red'}; font-weight: bold;">${p.painel_tv ? 'Sim' : 'Não'}</span> <br> 
            <span style="color: #555;">${p.motivo_tv ? `↳ Obs: ${p.motivo_tv}` : ''}</span></p>

            <p>⚠️ <strong>Houve ocorrências no plantão?</strong> <span style="color: ${p.ocorrencias ? 'red' : 'green'}; font-weight: bold;">${p.ocorrencias ? 'Sim' : 'Não'}</span> <br> 
            <span style="color: #555;">${p.motivo_ocorrencias ? `↳ Obs: ${p.motivo_ocorrencias}` : ''}</span></p>

            <div style="margin-top: 15px;">
                <strong>✍️ Assinatura do Técnico:</strong><br>
                <img src="${p.assinatura_url}" style="max-width: 250px; height: auto; border: 1px solid #ccc; border-radius: 4px; background: #fff; margin-top: 5px;">
            </div>
        `;

        document.getElementById('visto_plantao_id').value = idPlantao;
        abrirModal('modal-ver-plantao');

    } catch (err) {
        alert("Erro ao buscar detalhes do plantão: " + err.message);
    }
}

async function confirmarVistoPlantao() {
    const idPlantao = document.getElementById('visto_plantao_id').value;
    
    if (!confirm("Tem certeza que deseja aplicar o visto da supervisão? Este plantão será arquivado e sairá do painel pendente.")) return;
    
    try {
        const { error } = await supabase.from('plantoes').update({ visto_supervisao: true }).eq('id', idPlantao);
        if (error) throw error;
        
        alert("Visto registrado com sucesso!");
        fecharModal('modal-ver-plantao');
        
        carregarResumoDashboard(); 
        if(typeof carregarPlantoesAdmin === 'function') carregarPlantoesAdmin();
        
    } catch (err) {
        alert("Erro ao dar visto: " + err.message);
    }
}

// ==========================================
// ADMIN: EXPORTAR PDF E MÁSCARAS
// ==========================================
async function exportarPDF() {
    const elementoParaExportar = document.getElementById('app-wrapper');
    html2pdf().from(elementoParaExportar).save('Relatorio_Plantao.pdf');
}

function mascaraCPF(cpf) {
    let v = cpf.value.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 
    
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    
    cpf.value = v;
}

function mascaraTelefone(tel) {
    let v = tel.value.replace(/\D/g, ""); 
    if (v.length > 11) v = v.slice(0, 11); 
    
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    
    tel.value = v;
}
