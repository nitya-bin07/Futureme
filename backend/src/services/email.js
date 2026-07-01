const nodemailer = require('nodemailer');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;
  
  // Check if real SMTP creds provided
  if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your-ethereal-user') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Use Ethereal for testing (auto-creates test account)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal test email. Preview at: https://ethereal.email');
    console.log('📧 Test account:', testAccount.user);
  }
  
  return transporter;
}

async function sendLetterEmail(letter, senderName) {
  const t = await getTransporter();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Letter From The Past</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400&display=swap');
    body { margin: 0; padding: 0; background: #0d0d14; font-family: 'Lato', sans-serif; }
    .wrapper { max-width: 640px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; padding: 40px 0 30px; border-bottom: 1px solid #2a2a3e; }
    .logo { font-family: 'Playfair Display', serif; font-size: 28px; color: #c9a96e; letter-spacing: 0.1em; }
    .tagline { color: #666; font-size: 13px; margin-top: 8px; letter-spacing: 0.15em; text-transform: uppercase; }
    .letter-box { background: #16161f; border: 1px solid #2a2a3e; border-radius: 12px; padding: 48px; margin: 40px 0; }
    .letter-date { color: #c9a96e; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 32px; }
    .letter-title { font-family: 'Playfair Display', serif; font-size: 32px; color: #f5f0e8; margin-bottom: 24px; font-weight: 400; }
    .letter-content { color: #b8b4ae; font-size: 16px; line-height: 1.9; white-space: pre-wrap; }
    .signature { margin-top: 40px; padding-top: 24px; border-top: 1px solid #2a2a3e; color: #888; font-style: italic; font-family: 'Playfair Display', serif; }
    .footer { text-align: center; padding: 32px 0; color: #444; font-size: 12px; line-height: 1.8; }
    .footer a { color: #c9a96e; text-decoration: none; }
    .seal { text-align: center; margin: 24px 0; font-size: 48px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">FutureMe</div>
      <div class="tagline">A message from your past</div>
    </div>
    
    <div class="seal">📜</div>
    
    <div class="letter-box">
      <div class="letter-date">Written on your behalf — delivered today</div>
      <div class="letter-title">${letter.title}</div>
      <div class="letter-content">${letter.content}</div>
      <div class="signature">
        With love from the past,<br>
        <strong style="color: #c9a96e;">${senderName}</strong>
      </div>
    </div>
    
    <div class="footer">
      This letter was sealed and scheduled for delivery on ${new Date(letter.delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.<br>
      Sent via <a href="http://localhost:3000">FutureMe</a> — Letters to the future.<br><br>
      <span style="color: #333;">© ${new Date().getFullYear()} FutureMe. All rights reserved.</span>
    </div>
  </div>
</body>
</html>
  `;
  
  const info = await t.sendMail({
    from: `"FutureMe" <${process.env.EMAIL_FROM || 'noreply@futureme.app'}>`,
    to: letter.recipient_email,
    subject: `📜 A Letter From The Past: "${letter.title}"`,
    html,
    text: `A letter from ${senderName}:\n\n${letter.title}\n\n${letter.content}`,
  });
  
  console.log('📧 Email sent:', info.messageId);
  
  // Log preview URL for Ethereal
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('📧 Preview URL:', previewUrl);
  }
  
  return info;
}

async function sendWelcomeEmail(user) {
  const t = await getTransporter();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #0d0d14; font-family: 'Lato', sans-serif; }
    .wrapper { max-width: 580px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; padding: 40px 0; }
    .logo { font-size: 28px; color: #c9a96e; letter-spacing: 0.1em; }
    .body { background: #16161f; border: 1px solid #2a2a3e; border-radius: 12px; padding: 40px; margin: 24px 0; color: #b8b4ae; line-height: 1.8; }
    .btn { display: inline-block; background: #c9a96e; color: #0d0d14; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 24px 0; letter-spacing: 0.05em; }
    .footer { text-align: center; color: #444; font-size: 12px; padding-top: 24px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><div class="logo">FutureMe</div></div>
    <div class="body">
      <h2 style="color: #f5f0e8; font-size: 24px; margin-top: 0;">Welcome, ${user.name} 👋</h2>
      <p>You've just joined a timeless tradition — writing letters to the future.</p>
      <p>Your words will be sealed, encrypted, and delivered exactly when you choose. Whether it's 1 year or 10 years from now, your message will arrive like a whisper from the past.</p>
      <p style="text-align: center;">
        <a href="http://localhost:3000/compose" class="btn">Write Your First Letter →</a>
      </p>
      <p style="color: #666; font-size: 14px;">Every great journey begins with a single word. What will yours be?</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} FutureMe. Letters to the future.</div>
  </div>
</body>
</html>
  `;
  
  await t.sendMail({
    from: `"FutureMe" <${process.env.EMAIL_FROM || 'noreply@futureme.app'}>`,
    to: user.email,
    subject: '✉️ Welcome to FutureMe — Your journey begins',
    html,
  });
}



async function sendCollaborationInvite(toEmail, inviterName, letterTitle, token) {
  const t = await getTransporter();
  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collaborate/accept/${token}`;
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#0d0d14;font-family:sans-serif;}
.w{max-width:580px;margin:0 auto;padding:40px 20px;}
.logo{font-size:24px;color:#c9a96e;text-align:center;padding:30px 0;}
.box{background:#16161f;border:1px solid #2a2a3e;border-radius:12px;padding:40px;margin:20px 0;}
.title{color:#f5f0e8;font-size:22px;margin-bottom:16px;}
.body{color:#b8b4ae;font-size:15px;line-height:1.8;}
.btn{display:inline-block;background:#c9a96e;color:#0d0d14;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:24px 0;}
.footer{text-align:center;color:#444;font-size:12px;padding:20px 0;}
</style></head><body>
<div class="w">
  <div class="logo">✉ FutureMe</div>
  <div class="box">
    <div class="title">You've been invited to co-write a letter 📜</div>
    <div class="body">
      <strong style="color:#c9a96e">${inviterName}</strong> has invited you to contribute to their letter:
      <br><br>
      <em style="color:#f5f0e8;font-size:18px;">"${letterTitle}"</em>
      <br><br>
      This letter will be sealed and delivered in the future. Your contribution will become part of a message that travels through time.
    </div>
    <div style="text-align:center">
      <a href="${inviteUrl}" class="btn">Accept Invitation →</a>
    </div>
    <div class="body" style="font-size:13px;color:#666;">
      If you don't have a FutureMe account, you'll be asked to create one first — it's free.
    </div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} FutureMe. Letters to the future.</div>
</div>
</body></html>`;

  const info = await t.sendMail({
    from: `"FutureMe" <${process.env.EMAIL_FROM || 'noreply@futureme.app'}>`,
    to: toEmail,
    subject: `✉️ ${inviterName} invited you to co-write a letter on FutureMe`,
    html,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('📧 Collab invite preview:', previewUrl);
  return info;
}

async function sendPasswordResetEmail(user, token) {
  const t = await getTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password/${token}`;

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body{margin:0;padding:0;background:#0d0d14;font-family:'Lato',sans-serif;}
  .w{max-width:580px;margin:0 auto;padding:40px 20px;}
  .logo{font-size:24px;color:#c9a96e;text-align:center;padding:30px 0;letter-spacing:0.1em;}
  .box{background:#16161f;border:1px solid #2a2a3e;border-radius:12px;padding:40px;margin:20px 0;}
  .title{color:#f5f0e8;font-size:22px;margin-bottom:16px;font-weight:400;}
  .body{color:#b8b4ae;font-size:15px;line-height:1.8;}
  .btn{display:inline-block;background:#c9a96e;color:#0d0d14;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:24px 0;letter-spacing:0.02em;}
  .link{color:#c9a96e;word-break:break-all;font-size:13px;}
  .footer{text-align:center;color:#444;font-size:12px;padding:20px 0;line-height:1.8;}
</style></head><body>
<div class="w">
  <div class="logo">✉ FutureMe</div>
  <div class="box">
    <div class="title">Reset your password</div>
    <div class="body">
      Hi <strong style="color:#c9a96e;">${user.name}</strong>,<br><br>
      We received a request to reset the password for your FutureMe account
      (<strong>${user.email}</strong>). Click the button below to choose a new one.
      <br><br>
      This link expires in <strong style="color:#f5f0e8;">1 hour</strong>. If you didn't
      request this, you can safely ignore this email — your password will stay unchanged.
    </div>
    <div style="text-align:center">
      <a href="${resetUrl}" class="btn">Reset Password →</a>
    </div>
    <div class="body" style="font-size:13px;color:#666;">
      Or copy this link into your browser:<br>
      <span class="link">${resetUrl}</span>
    </div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} FutureMe. Letters to the future.</div>
</div>
</body></html>`;

  const info = await t.sendMail({
    from: `"FutureMe" <${process.env.EMAIL_FROM || 'noreply@futureme.app'}>`,
    to: user.email,
    subject: '🔑 Reset your FutureMe password',
    html,
    text: `Reset your FutureMe password: ${resetUrl} (expires in 1 hour)`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('📧 Password reset preview:', previewUrl);
  return info;
}

module.exports = { sendLetterEmail, sendWelcomeEmail, sendCollaborationInvite, sendPasswordResetEmail };
