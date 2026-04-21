/**
 * 邮件 HTML 模板
 * 用简单内联样式，兼容大多数邮件客户端。
 */

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#fdf2f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 4px 20px rgba(244,114,182,0.15);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#f472b6,#ec4899);padding:32px 32px 24px;color:#ffffff;">
          <div style="font-size:22px;font-weight:700;letter-spacing:0.5px;">哄哄模拟器</div>
          <div style="font-size:13px;opacity:0.9;margin-top:4px;">HoHoHo Simulator</div>
        </td></tr>
        <tr><td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.8;">
${body}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
          这是系统自动发送的邮件，请勿直接回复。<br>
          © 哄哄模拟器
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface WelcomeEmailInput {
  username: string;
}

export function renderWelcomeEmail(input: WelcomeEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(input.username);
  const subject = `欢迎来到哄哄模拟器, ${input.username}！`;
  const html = wrap(
    subject,
    `
<p style="font-size:18px;font-weight:600;margin:0 0 16px;">嗨, ${name}！</p>
<p style="margin:0 0 12px;">注册成功 🎉 欢迎加入<strong style="color:#ec4899;">哄哄模拟器</strong>。</p>
<p style="margin:0 0 12px;">在这里你可以练习哄另一半、复盘聊天失误、提升你的恋爱沟通技巧。</p>
<p style="margin:0 0 16px;">接下来你可以：</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#4b5563;">
  <li style="margin-bottom:6px;">挑一个剧本，开始你的第一局</li>
  <li style="margin-bottom:6px;">游戏结束后，点"生成解读报告"看 AI 点评</li>
  <li style="margin-bottom:6px;">在"我的记录"里回看历史对局</li>
</ul>
<p style="margin:16px 0 0;color:#9ca3af;font-size:13px;">祝你早日脱单 / 不再被伴侣生气 🌸</p>
  `,
  );
  const text = `嗨 ${input.username}！\n\n注册成功，欢迎加入哄哄模拟器。\n挑一个剧本，开始你的第一局吧。\n\n—— 哄哄模拟器`;
  return { subject, html, text };
}

export interface DailyLoveLetterInput {
  username: string;
  body: string;
}

export function renderDailyLoveLetter(input: DailyLoveLetterInput): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(input.username);
  const paragraphs = input.body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`,
    )
    .join('\n');
  const subject = '今日情书 💌';
  const html = wrap(
    subject,
    `
<p style="font-size:18px;font-weight:600;margin:0 0 16px;color:#ec4899;">亲爱的 ${name}:</p>
${paragraphs}
<p style="margin:20px 0 0;text-align:right;color:#9ca3af;font-size:13px;">—— 来自哄哄模拟器的每日一信</p>
  `,
  );
  const text = `亲爱的 ${input.username}:\n\n${input.body}\n\n—— 哄哄模拟器 每日一信`;
  return { subject, html, text };
}
