// Configuração do Supabase (Insira suas chaves aqui)
const supabaseUrl = 'SUA_URL_DO_SUPABASE';
const supabaseKey = 'SUA_CHAVE_ANON_PUBLICA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Função para alternar abas
function abrirAba(idAba) {
    document.querySelectorAll('.tab-content').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(idAba).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

// Lógica de campos condicionais
function verificarCondicional(selectId, divMotivoId, condicaoAtivacao) {
    const valorSelect = document.getElementById(selectId).value;
    const divMotivo = document.getElementById(divMotivoId);
    
    if (valorSelect === condicaoAtivacao) {
        divMotivo.classList.remove('hidden');
        divMotivo.querySelector('textarea').required = true;
    } else {
        divMotivo.classList.add('hidden');
        divMotivo.querySelector('textarea').required = false;
        divMotivo.querySelector('textarea').value = '';
    }
}
