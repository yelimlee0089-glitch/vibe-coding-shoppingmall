import nodemailer from 'nodemailer';

// SMTP 설정 (Gmail·네이버·SendGrid 등 어떤 SMTP 서비스든 사용 가능)
// SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM
export const isMailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * 메일 보내기. SMTP 설정이 없으면
 * - 개발: 메일 내용을 서버 콘솔에 출력 (바로 테스트 가능)
 * - 운영: 에러 (설정 누락을 알 수 있도록)
 */
export async function sendMail({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('메일 설정(SMTP_HOST/SMTP_USER/SMTP_PASS)이 없어 메일을 보낼 수 없습니다.');
    }
    console.log(`\n[메일 미발송 - 개발용 출력]\n받는 사람: ${to}\n제목: ${subject}\n${text}\n`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
