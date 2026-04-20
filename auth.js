const SUPABASE_URL = 'https://ygnphizpnhcsblmwzmzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbnBoaXpwbmhjc2JsbXd6bXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzUyNjAsImV4cCI6MjA5MjAxMTI2MH0.hLhpjB5WUDzZX1MRIPVzPVFgq8mcHmnhkhWreAjEFXI';

if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
var supabase = window.supabaseClient;

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
// Função para detectar a tecla ENTER no campo de senha
function verificarEnter(event) {
    if (event.key === "Enter") {
        realizarLogin();
    }
}

// Dentro da sua função carregarPerfil(user), ache a parte que esconde o login e adicione a troca de background:
async function carregarPerfil(user) {
    usuarioAtual = user;
    const { data: perfil, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (perfil) {
        perfilAtual = perfil;
        document.getElementById('user-name').innerText = `Olá, ${perfil.nome}`;
        document.getElementById('user-role').innerText = perfil.role.toUpperCase();
        
        // MUDANÇA DE BACKGROUND AQUI! Tira a imagem e coloca a cor do app
        document.body.classList.remove('login-bg');
        document.body.classList.add('app-bg');
        
        // Esconde login e mostra o App
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden'); // Note que mudou de app-container para app-wrapper

        if (perfil.role === 'admin') document.getElementById('btn-admin').classList.remove('hidden');
        carregarSelectChaves();
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
