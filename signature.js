// Função genérica para inicializar qualquer canvas na tela
function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    let desenhando = false;

    // Mouse
    canvas.addEventListener('mousedown', iniciar);
    canvas.addEventListener('mousemove', desenhar);
    canvas.addEventListener('mouseup', parar);
    canvas.addEventListener('mouseout', parar);

    // Touch (Mobile/Tablet)
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); iniciar(e.touches[0]); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); desenhar(e.touches[0]); });
    canvas.addEventListener('touchend', parar);

    function iniciar(e) {
        desenhando = true;
        ctx.beginPath();
        ctx.moveTo(getPosX(e), getPosY(e));
    }

    function desenhar(e) {
        if (!desenhando) return;
        ctx.lineTo(getPosX(e), getPosY(e));
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }

    function parar() { desenhando = false; }
    
    function getPosX(e) { return e.clientX - canvas.getBoundingClientRect().left; }
    function getPosY(e) { return e.clientY - canvas.getBoundingClientRect().top; }

    return canvas;
}

// Inicializa os canvas das abas
const canvasPlantao = setupCanvas('canvas-plantao');
const canvasRetirada = setupCanvas('canvas-retirada');
const canvasDevolucao = setupCanvas('canvas-devolucao');
const canvasOcorrencia = setupCanvas('canvas-ocorrencia');

function limparCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Função centralizada para fazer Upload da assinatura para o Supabase Storage
async function uploadAssinatura(canvasElement, prefixo = 'sig') {
    return new Promise((resolve, reject) => {
        canvasElement.toBlob(async (blob) => {
            if (!blob) return reject("Canvas vazio");

            const nomeArquivo = `${prefixo}_${Date.now()}.png`;
            
            const { data, error } = await supabase.storage
                .from('assinaturas')
                .upload(nomeArquivo, blob);

            if (error) reject(error);

            const { data: publicData } = supabase.storage.from('assinaturas').getPublicUrl(nomeArquivo);
            resolve(publicData.publicUrl);
        }, 'image/png');
    });
}
