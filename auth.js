// Substitua pelas suas credenciais do Supabase
const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_AQUI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let usuarioAtual = null;
let perfilAtual = null;

// Verifica se já está logado ao abrir a página
window.onload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await carregarPerfil(session.user);
    }
};

async function realizarLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
        alert('Erro ao logar: ' + error.message);
    } else {
        await carregarPerfil(data.user);
    }
}

async function carregarPerfil(user) {
    usuarioAtual = user;
    
    // Busca os dados adicionais na tabela profiles (Turno, Role, etc)
    const { data: perfil, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (perfil) {
        perfilAtual = perfil;
        document.getElementById('user-name').innerText = `Olá, ${perfil.nome}`;
        document.getElementById('user-role').innerText = perfil.role.toUpperCase();
        
        // Esconde login e mostra o App
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        // Se for Admin, mostra a aba Admin
        if (perfil.role === 'admin') {
            document.getElementById('btn-admin').classList.remove('hidden');
        }
        
        // Inicializa dados das abas (chaves, etc)
        carregarSelectChaves();
    }
}

async function fazerLogout() {
    await supabase.auth.signOut();
    window.location.reload();
}
