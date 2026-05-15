/**
 * SendDemoEmails.gs
 *
 * Standalone script — DO NOT add to the add-on project.
 *
 * Usage:
 *   1. Go to https://script.google.com → New Project
 *   2. Paste this entire file
 *   3. Run sendAllDemoEmails() (or run each individually)
 *   4. Authorize when prompted (needs mail-send permission)
 *   5. Three emails land in your inbox with proper HTML formatting
 *   6. Delete the project when done — it's throwaway
 */

// ── Email 1: Obvious phishing (target verdict: PHISHING) ─────────────

function sendPhishingDemo() {
  var subject = 'URGENT: Your Google Account Will Be Suspended in 24 Hours';

  var html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">'

    // Fake Google header
    + '<div style="border-bottom: 3px solid #4285f4; padding-bottom: 15px; margin-bottom: 20px;">'
    + '  <span style="font-size: 24px; font-weight: bold; color: #4285f4;">G</span>'
    + '  <span style="font-size: 24px; font-weight: bold; color: #ea4335;">o</span>'
    + '  <span style="font-size: 24px; font-weight: bold; color: #fbbc05;">o</span>'
    + '  <span style="font-size: 24px; font-weight: bold; color: #4285f4;">g</span>'
    + '  <span style="font-size: 24px; font-weight: bold; color: #34a853;">l</span>'
    + '  <span style="font-size: 24px; font-weight: bold; color: #ea4335;">e</span>'
    + '  <span style="font-size: 14px; color: #666; margin-left: 8px;">Account Security Alert</span>'
    + '</div>'

    + '<p><strong>Dear Valued Customer,</strong></p>'

    + '<p>We have detected <strong>unusual login activity</strong> on your Google Account from an unrecognized device:</p>'

    + '<table style="border-collapse: collapse; margin: 15px 0; width: 100%;">'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9; width: 130px;"><strong>Location</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;">Moscow, Russia</td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9;"><strong>IP Address</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;">185.220.101.47</td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Device</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;">Unknown Windows PC</td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Time</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;">2026-04-15 03:47:22 UTC</td></tr>'
    + '</table>'

    + '<div style="background: #fce8e6; border-left: 4px solid #cc3a21; padding: 12px 16px; margin: 20px 0;">'
    + '  <strong style="color: #cc3a21;">&#9888; WARNING:</strong> '
    + '  <span style="color: #cc3a21;">Your account will be <strong>PERMANENTLY SUSPENDED</strong> within 24 hours unless you verify your identity immediately.</span>'
    + '</div>'

    + '<p>To protect your account and avoid suspension, click the button below to verify your credentials:</p>'

    + '<p style="text-align: center; margin: 25px 0;">'
    + '  <a href="http://google-security-verification.weebly-secure.com/verify?user=tilan&token=7f3a2b1c"'
    + '     style="background: #4285f4; color: white; padding: 14px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">VERIFY MY ACCOUNT NOW</a>'
    + '</p>'

    + '<p style="font-size: 13px; color: #555;">Or copy this secure verification link:<br>'
    + '  <a href="http://google-security-verification.weebly-secure.com/verify" style="color: #1a73e8;">https://accounts.google.com/security/verify</a>'
    + '</p>'

    + '<p><strong>Failure to verify within 24 hours will result in:</strong></p>'
    + '<ul>'
    + '  <li>Permanent deletion of your Gmail mailbox</li>'
    + '  <li>Loss of all Google Drive files and Google Photos</li>'
    + '  <li>Removal of your YouTube channel and subscriptions</li>'
    + '  <li>Termination of Google Pay access</li>'
    + '</ul>'

    + '<p>If you did not attempt this login, please re-enter your credentials immediately at the verification link above to prevent unauthorized access.</p>'

    + '<p style="font-size: 13px; color: #555;">For emergency assistance, contact our Security Response Team:<br>'
    + '  <a href="mailto:google-security-response@account-verify.tk" style="color: #1a73e8;">google-security-response@account-verify.tk</a>'
    + '</p>'

    + '<hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">'

    + '<p style="font-size: 11px; color: #999;">'
    + '  This is an automated security notice. Do not reply to this email.<br><br>'
    + '  Sincerely,<br>'
    + '  <strong>Google Account Security Team</strong><br>'
    + '  Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA<br><br>'
    + '  Reference ID: GSA-4823-URGENT'
    + '</p>'

    + '</div>';

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: subject,
    body: 'Your email client does not support HTML.',
    htmlBody: html
  });

  Logger.log('Phishing demo email sent.');
}


// ── Email 2: Subtle suspicious invoice (target verdict: SUSPICIOUS) ──

function sendSuspiciousDemo() {
  var subject = 'Invoice #INV-48732 - Payment Overdue - Action Required';

  var html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">'

    // Company header
    + '<div style="border-bottom: 2px solid #2d7dd2; padding-bottom: 12px; margin-bottom: 20px;">'
    + '  <span style="font-size: 20px; font-weight: bold; color: #2d7dd2;">Global Business Services</span>'
    + '  <span style="font-size: 12px; color: #888; display: block;">Accounts Receivable Department</span>'
    + '</div>'

    + '<p>Hello,</p>'

    + '<p>This is a reminder that your invoice <strong>#INV-48732</strong> is currently '
    + '<strong style="color: #cc3a21;">OVERDUE</strong> and requires immediate attention.</p>'

    + '<table style="border-collapse: collapse; margin: 20px 0; width: 100%;">'
    + '  <tr style="background: #2d7dd2; color: white;">'
    + '    <td colspan="2" style="padding: 10px 12px; font-weight: bold;">Invoice Details</td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9; width: 160px;"><strong>Invoice Number</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;">INV-48732</td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Amount Due</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;"><strong>USD 2,847.50</strong></td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Original Due Date</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;">April 8, 2026</td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Status</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd; color: #cc3a21;"><strong>OVERDUE &mdash; 7 DAYS</strong></td></tr>'
    + '  <tr><td style="padding: 8px 12px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Service Period</strong></td>'
    + '      <td style="padding: 8px 12px; border: 1px solid #ddd;">March 2026</td></tr>'
    + '</table>'

    + '<p>To review and settle this invoice, please use our secure payment portal:</p>'

    + '<p style="text-align: center; margin: 25px 0;">'
    + '  <a href="https://secure-billing-portal.invoiceshare.online/view?ref=INV48732"'
    + '     style="background: #2d7dd2; color: white; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View Invoice &amp; Pay</a>'
    + '</p>'

    + '<p>If you believe this invoice was sent in error, please reply to this email within '
    + '<strong>48 hours</strong> with your billing contact details and account verification information for our records.</p>'

    + '<div style="background: #fff8e1; border-left: 4px solid #ff9800; padding: 10px 14px; margin: 20px 0; font-size: 13px;">'
    + '  <strong>Late payment notice:</strong> Fees of 5% will be automatically applied to '
    + '  overdue balances after 72 hours of this notice, in accordance with our standard terms.'
    + '</div>'

    + '<p>Thank you for your prompt attention to this matter.</p>'

    + '<p>Best regards,<br>'
    + '<strong>Accounts Receivable Team</strong><br>'
    + 'Global Business Services Ltd.</p>'

    + '<hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">'

    + '<p style="font-size: 11px; color: #999;">'
    + '  This message and any attachments are confidential and intended solely for the '
    + '  addressee. If you received this in error, please notify the sender and delete all copies.<br><br>'
    + '  Reference: INV-48732-2026 | Billing Cycle: Q1-2026<br>'
    + '  Global Business Services Ltd. | 42 Commerce Road, London EC2A 4PQ, UK'
    + '</p>'

    + '</div>';

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: subject,
    body: 'Your email client does not support HTML.',
    htmlBody: html
  });

  Logger.log('Suspicious demo email sent.');
}


// ── Email 3: Legitimate newsletter (target verdict: SAFE) ────────────

function sendLegitimateDemo() {
  var subject = 'TechDigest Weekly - The state of AI in 2026';

  var html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">'

    // Newsletter header
    + '<div style="background: #1a1a2e; padding: 20px; border-radius: 6px 6px 0 0; text-align: center;">'
    + '  <span style="font-size: 22px; font-weight: bold; color: #e94560;">Tech</span>'
    + '  <span style="font-size: 22px; font-weight: bold; color: #ffffff;">Digest</span>'
    + '  <span style="display: block; font-size: 12px; color: #aaa; margin-top: 4px;">Weekly &bull; Issue #187 &bull; April 15, 2026</span>'
    + '</div>'

    + '<div style="border: 1px solid #e0e0e0; border-top: none; padding: 25px; border-radius: 0 0 6px 6px;">'

    + '  <h2 style="color: #1a1a2e; margin-top: 0;">The state of AI in 2026</h2>'
    + '  <p>Hi there,</p>'
    + '  <p>This week\'s 5-minute read on what\'s shaping the tech industry:</p>'

    // AI section
    + '  <h3 style="color: #e94560; border-bottom: 2px solid #e94560; padding-bottom: 6px;">&#129504; AI &amp; Machine Learning</h3>'
    + '  <ul style="line-height: 1.8;">'
    + '    <li>Anthropic releases Claude Haiku 4.5 with improved reasoning benchmarks</li>'
    + '    <li>Google DeepMind publishes paper on multimodal agentic systems</li>'
    + '    <li>OpenAI announces updated safety framework for agentic deployments</li>'
    + '  </ul>'

    // Security section
    + '  <h3 style="color: #e94560; border-bottom: 2px solid #e94560; padding-bottom: 6px;">&#128274; Security</h3>'
    + '  <ul style="line-height: 1.8;">'
    + '    <li>Major enterprises adopt passkey authentication at record pace</li>'
    + '    <li>New research on LLM prompt injection defenses published</li>'
    + '    <li>Industry shift toward zero-trust architectures continues</li>'
    + '  </ul>'

    // Dev tools section
    + '  <h3 style="color: #e94560; border-bottom: 2px solid #e94560; padding-bottom: 6px;">&#128187; Developer Tools</h3>'
    + '  <ul style="line-height: 1.8;">'
    + '    <li>GitHub Copilot rolls out improved code review features</li>'
    + '    <li>VS Code releases built-in AI refactoring tools</li>'
    + '    <li>Rust 1.87 improves compile times by 20%</li>'
    + '  </ul>'

    + '  <p style="text-align: center; margin: 25px 0;">'
    + '    <a href="https://techdigest.example.com/weekly/187"'
    + '       style="background: #e94560; color: white; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Read Full Stories</a>'
    + '  </p>'

    + '</div>'

    + '<hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">'

    + '<p style="font-size: 12px; color: #888; text-align: center;">'
    + '  You\'re receiving this because you subscribed to TechDigest Weekly.<br>'
    + '  <a href="https://techdigest.example.com/preferences" style="color: #888;">Manage preferences</a> &bull; '
    + '  <a href="https://techdigest.example.com/unsubscribe?token=abc123" style="color: #888;">Unsubscribe</a>'
    + '</p>'

    + '<p style="font-size: 11px; color: #aaa; text-align: center;">'
    + '  TechDigest Inc., 100 Tech Street, San Francisco, CA 94103, USA'
    + '</p>'

    + '</div>';

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: subject,
    body: 'Your email client does not support HTML.',
    htmlBody: html
  });

  Logger.log('Legitimate demo email sent.');
}


// ── Run all three ────────────────────────────────────────────────────

function sendAllDemoEmails() {
  sendPhishingDemo();
  sendSuspiciousDemo();
  sendLegitimateDemo();
  Logger.log('All 3 demo emails sent to ' + Session.getActiveUser().getEmail());
}
