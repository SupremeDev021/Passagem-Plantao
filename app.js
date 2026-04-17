const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Nodemailer (Substitua pelos dados SMTP reais do seu provedor)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Rota para notificar supervisão
app.post('/api/notificar-supervisao', async (req, res) => {
    const { plantaoId, usuarioNome, linkVisualizacao } = req.body;

    try {
        await transporter.sendMail({
            from: '"Sistema de Plantão" <noreply@seusistema.com>',
            to: 'suporteandarai@prefeitura.rio', // Email da supervisão definido na regra
            subject: `Novo Plantão Registrado - ${usuarioNome}`,
            html: `
                <h3>Passagem de Plantão Registrada</h3>
                <p>O profissional <b>${usuarioNome}</b> finalizou e assinou o plantão.</p>
                <p>ID do Registro: ${plantaoId}</p>
                <br>
                <a href="${linkVisualizacao}">Clique aqui para dar o Visto da Supervisão</a>
            `
        });
        res.status(200).json({ message: 'E-mail enviado com sucesso para suporteandarai@prefeitura.rio' });
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).json({ error: 'Falha no envio do e-mail' });
    }
});

// Endpoint base para gerar PDF (Pode integrar PDFKit aqui)
app.get('/api/exportar-pdf', (req, res) => {
    // Lógica de exportação SQL -> PDF
    res.send('Endpoint de PDF rodando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
