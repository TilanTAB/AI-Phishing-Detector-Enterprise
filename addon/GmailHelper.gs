/**
 * GmailHelper.gs
 * Extracts structured email data from a Gmail message ID.
 */


/**
 * Extracts all relevant phishing-analysis fields from a Gmail message.
 * Uses GmailApp.getMessageById() to get full message including raw headers.
 *
 * @param {string} messageId - Gmail message ID from the add-on event
 * @returns {{
 *   messageId: string,
 *   subject: string,
 *   senderName: string,
 *   senderEmail: string,
 *   replyTo: string,
 *   to: string,
 *   date: string,
 *   body: string,
 *   urls: string[],
 *   attachments: string[],
 *   spf: string,
 *   dkim: string,
 *   dmarc: string
 * }}
 */
function getEmailData(messageId) {
  var message = GmailApp.getMessageById(messageId);
  if (!message) {
    throw new Error('Message not found: ' + messageId);
  }

  // Parse sender
  var from = parseEmailAddress(message.getFrom());

  // Get reply-to (GmailApp doesn't expose it directly; fall back to sender)
  var replyTo = '';
  try {
    var rawContent = message.getRawContent();
    var replyToMatch = rawContent.match(/^Reply-To:\s*(.+)$/mi);
    if (replyToMatch) {
      var rt = parseEmailAddress(replyToMatch[1].trim());
      replyTo = rt.email || rt.name;
    }
    // Extract authentication headers from raw content
    var authHeader = '';
    var authMatch = rawContent.match(/^Authentication-Results:[\s\S]*?(?=\n\S|\n\n)/mi);
    if (authMatch) authHeader = authMatch[0];

    var spf  = extractAuthResult(authHeader, 'spf');
    var dkim = extractAuthResult(authHeader, 'dkim');
    var dmarc = extractAuthResult(authHeader, 'dmarc');
  } catch (e) {
    // getRawContent() may fail under some scope configurations — degrade gracefully
    console.warn('Could not read raw content for message ' + messageId + ': ' + e.message);
    var spf = 'unknown', dkim = 'unknown', dmarc = 'unknown';
  }

  // Get body — prefer plain text, fall back to HTML-to-text
  var body = message.getPlainBody();
  if (!body || body.trim().length === 0) {
    body = htmlToText(message.getBody());
  }

  // Extract URLs from body
  var urls = extractUrls(body);

  // Extract attachment names
  var attachments = [];
  try {
    message.getAttachments().forEach(function(att) {
      attachments.push(att.getName());
    });
  } catch (e) {
    console.warn('Could not read attachments: ' + e.message);
  }

  console.log('getEmailData: id=' + messageId + ' from=' + from.email + ' urls=' + urls.length);

  return {
    messageId:   messageId,
    subject:     message.getSubject() || '(no subject)',
    senderName:  from.name,
    senderEmail: from.email,
    replyTo:     replyTo,
    to:          message.getTo() || '',
    date:        message.getDate() ? message.getDate().toUTCString() : '',
    body:        body || '',
    urls:        urls,
    attachments: attachments,
    spf:         spf  || 'unknown',
    dkim:        dkim || 'unknown',
    dmarc:       dmarc || 'unknown'
  };
}

