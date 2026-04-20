João, percebi um detalhe crítico no código que você enviou: ao colar as funções novas, as funções da tabela de permissões (`carregarTabelaUsuarios`, `alterarNivelAcesso`, etc.) acabaram ficando **presas dentro** da função `adminCriarUsuario`. 

No JavaScript, colocar uma função dentro de outra (nesse contexto) "quebra" o código, fazendo com que os botões não a encontrem.

Eu fiz a limpeza completa, separei tudo nos devidos lugares e garanti que a regra de atualizar a tabela ao abrir o modal esteja lá. 

Pode copiar este bloco com segurança e **substituir 100% do seu arquivo `app.js`**:

```javascript
// ==========================================
// TROCA DE ABAS E MODAIS
// ==========================================
function abrirAba(idAba) {
    document.querySelectorAll('.tab-content').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(idAba).classList.remove('hidden');
    event.currentTarget.classList.add('active');
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
            hora_largou: document.getElementById('p_hora_largou').value,
            emails_resp: document.getElementById('p_emails').value === 'sim',
            motivo_emails: document.getElementById('p_motivo_emails').value,
            chamados_pend: document.getElementById('p_chamados').value === 'sim',
            motivo_chamados: document.getElementById('p_motivo_chamados').value,
            forms_zerado: document.getElementById('p_forms').value === 'sim',
            motivo_forms: document.getElementById('p_motivo_forms').value,
            maquinas_func: document.getElementById('p_maquinas').value === 'sim',
            motivo_maquinas: document.getElementById('p_motivo_maquinas').value,
            cadeiras_lugar: document.getElementById('p_cadeiras').value === 'sim',
            motivo_cadeiras: document.getElementById('p_motivo_cadeiras').value,
            painel_tv: document.getElementById('p_tv').value === 'sim',
            motivo_tv: document.getElementById('p_motivo_tv').value,
            ocorrencias: document.getElementById('p_ocorrencias').value === 'sim',
            motivo_ocorrencias: document.getElementById('p_motivo_ocorrencias').value,
            assinatura_url: urlAssinatura
        };

        // 3. Salva no Supabase
        const { error } = await supabase.from('plantoes').insert([dados]);

        if (error) throw error;

        alert('Plantão registrado com sucesso!');
        document.getElementById('form-plantao').reset();
        limparCanvas('canvas-plantao');

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
        if(selDisp) selDisp.innerHTML = disponiveis.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

        // Carrega chaves retiradas
        const { data: retiradas } = await supabase.from('chaves').select('*').eq('status', 'retirada');
        const selRet = document.getElementById('select-chaves-retiradas');
        if(selRet) selRet.innerHTML = retiradas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    } catch (err) {
        console.log("Aba de chaves não encontrada ou erro no DB:", err);
    }
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
// ABA 4: REGISTRO DE TONER E UPLOAD DE FOTO
// ==========================================
async function registrarToner() {
    const modelo = document.getElementById('t_modelo').value;
    const inputFoto = document.getElementById('t_foto');

    if (!modelo) return alert('Selecione o modelo do toner.');
    if (inputFoto.files.length === 0) return alert('É obrigatório anexar a foto da página de teste.');

    const fotoFile = inputFoto.files[0];
    const nomeArquivo = `toner_${Date.now()}_${fotoFile.name}`;

    try {
        // Upload da foto
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('assinaturas') 
            .upload(nomeArquivo, fotoFile);

        if (uploadError) throw uploadError;

        alert('Troca de toner registrada com sucesso! A foto foi salva.');
        
        document.getElementById('t_modelo').value = '';
        inputFoto.value = '';

    } catch (err) {
        console.error(err);
        alert('Erro ao registrar o toner: ' + err.message);
    }
}

async function marcarChamadoAtendido(chamadoId) {
    const observacao = document.getElementById(`obs_chamado_${chamadoId}`).value;
    alert(`Chamado resolvido!\nObservação salva: ${observacao ? observacao : "Nenhuma"}`);
}

// ==========================================
// ADMIN: FUNÇÕES DE CADASTRO E USUÁRIOS
// ==========================================

// 1. Criar Usuário (Chama uma função segura no servidor via RPC)
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

// 2. Função para carregar a lista de usuários na tabela de permissões
async function carregarTabelaUsuarios() {
    try {
        const { data: usuarios, error } = await supabase
            .from('profiles')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        const tabela = document.getElementById('tabela-usuarios-admin');
        tabela.innerHTML = ''; // Limpa antes de preencher

        usuarios.forEach(user => {
            const tr = document.createElement('tr');
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

// 3. Função para alterar apenas o nível (Admin/Operacional) rápido
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

// 4. Preparar edição completa
function prepararEdicaoCompleta(userId) {
    alert("Iniciando edição completa para o ID: " + userId);
}

// 5. Função para deletar usuário
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

// Cadastrar Chave Base
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
        carregarSelectChaves(); // Atualiza a lista da aba Chaves
    } catch (err) { alert('Erro ao cadastrar chave: ' + err.message); }
}

// Cadastrar Modelo de Toner
async function adminCadastrarToner() {
    const modelo = document.getElementById('cad_toner_modelo').value;
    const impressoras = document.getElementById('cad_toner_imp').value;
    const quantidade = document.getElementById('cad_toner_qtd').value;

    if(!modelo || !impressoras || !quantidade) {
        return alert('Preencha todos os campos, incluindo a quantidade!');
    }

    try {
        const { error } = await supabase.from('cadastro_toner').insert([
            { 
                modelo_toner: modelo, 
                impressora_compativel: impressoras, 
                quantidade_atual: parseInt(quantidade)
            }
        ]);
        
        if (error) throw error;
        
        alert('Toner cadastrado com sucesso no estoque!');
        fecharModal('modal-toner');
    } catch (err) { 
        alert('Erro: ' + err.message); 
    }
}

// Cadastrar Chamado Simpress
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
                setor_localizada: local 
            }
        ]);
        
        if (error) throw error;
        
        alert('Chamado Simpress registrado com sucesso!');
        fecharModal('modal-simpress');

        // Limpa os campos para o próximo cadastro
        document.getElementById('cad_sim_numero').value = '';
        document.getElementById('cad_sim_modelo').value = '';
        document.getElementById('cad_sim_serie').value = '';
        document.getElementById('cad_sim_local').value = '';

    } catch (err) { 
        alert('Erro ao salvar chamado: ' + err.message); 
    }
}

// ==========================================
// ADMIN: EXPORTAR PDF
// ==========================================
async function exportarPDF() {
    const elementoParaExportar = document.getElementById('app-wrapper');
    html2pdf().from(elementoParaExportar).save('Relatorio_Plantao.pdf');
}

// ==========================================
// MÁSCARAS DE FORMATAÇÃO (CPF e TELEFONE)
// ==========================================

function mascaraCPF(cpf) {
    let v = cpf.value.replace(/\D/g, ""); // Remove tudo que não for número
    if (v.length > 11) v = v.slice(0, 11); // Limita a 11 dígitos
    
    // Adiciona os pontos e traços
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    
    cpf.value = v;
}

function mascaraTelefone(tel) {
    let v = tel.value.replace(/\D/g, ""); // Remove tudo que não for número
    if (v.length > 11) v = v.slice(0, 11); // Limita a 11 dígitos
    
    // Adiciona parênteses e traço
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    
    tel.value = v;
}
```
