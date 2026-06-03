const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM || 'Barbearia SaaS <noreply@barbearia.app>';

export async function sendPasswordResetCode(email: string, code: string, name?: string): Promise<void> {
  const greeting = name ? `Olá, ${name}!` : 'Olá!';
  const text = `${greeting}

Recebemos um pedido para redefinir sua senha.

Seu código de verificação: ${code}

Este código expira em 15 minutos.

Se você não solicitou isso, ignore este e-mail.`;

  if (!RESEND_API_KEY) {
    console.log(`[email] (dev) Código para ${email}: ${code}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Código para redefinir sua senha',
      text
    })
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[email] Falha ao enviar:', body);
    throw new Error('Não foi possível enviar o e-mail');
  }
}
