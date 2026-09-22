import { sendEmail } from '@/lib/email/resend';

function buildLegacyEmailHtml({ nomineeName, accessUrl, note }) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="margin-bottom: 8px;">Mintmind legacy vault access</h2>
      <p>Hello ${nomineeName},</p>
      <p>A financial vault has been released for your access. This may include net worth, accounts, passwords, and important documents.</p>
      <p style="margin: 24px 0;">
        <a href="${accessUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Open vault
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">Or copy this link: ${accessUrl}</p>
      ${note ? `<p style="font-size: 13px; color: #666; margin-top: 16px;">${note}</p>` : ''}
      <p style="font-size: 12px; color: #999; margin-top: 32px;">If you were not expecting this email, you can ignore it.</p>
    </div>
  `;
}

export async function notifyNominee({ nomineeEmail, nomineeName, accessToken, note }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const accessUrl = `${baseUrl}/legacy/${accessToken}`;
  const subject = 'Mintmind — Legacy vault access';
  const text = `Hello ${nomineeName},\n\nA financial vault has been released for your access.\n\nOpen: ${accessUrl}\n\n${note || ''}`;

  const message = { to: nomineeEmail, subject, accessUrl };

  try {
    const result = await sendEmail({
      to: nomineeEmail,
      subject,
      text,
      html: buildLegacyEmailHtml({ nomineeName, accessUrl, note }),
    });

    if (result.sent) {
      return { ...message, emailSent: true, emailId: result.id };
    }
  } catch (err) {
    console.error('[legacy-notify] Resend failed', err);
  }

  // ponytail: webhook fallback when Resend is not configured
  const webhook = process.env.LEGACY_NOTIFY_WEBHOOK;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...message, body: text }),
      });
      return { ...message, emailSent: true, via: 'webhook' };
    } catch (err) {
      console.error('[legacy-notify] webhook failed', err);
    }
  }

  console.info('[legacy-notify]', message);
  return { ...message, emailSent: false };
}
