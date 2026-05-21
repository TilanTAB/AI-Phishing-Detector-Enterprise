/**
 * GmailHelper.gs
 * Extracts structured email data from a Gmail message ID.
 */


/**
 * Extracts all relevant phishing-analysis fields from a Gmail message.
 * Uses GmailApp.getMessageById() with getHeader() for header-only access
 * (compatible with gmail.addons.current.message.metadata sensitive scope —
 * avoids the restricted gmail.readonly scope and its raw-content read).
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
function getEmailData(messageId, accessToken) {
  // When using addon-scoped scopes (without broader gmail.readonly),
  // the current-message access token must be set before GmailApp.getMessageById.
  // Per Google docs: GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken).
  if (accessToken) {
    GmailApp.setCurrentMessageAccessToken(accessToken);
  }
  var message = GmailApp.getMessageById(messageId);
  if (!message) {
    throw new Error('Message not found: ' + messageId);
  }

  // Parse sender
  var from = parseEmailAddress(message.getFrom());

  // Get reply-to and authentication headers via getHeader()
  // — works with addon-scoped scopes for the current message; no raw content read.
  var replyTo = '';
  var spf = 'unknown', dkim = 'unknown', dmarc = 'unknown';
  var authHeader = '';
  try {
    var replyToHeader = message.getHeader('Reply-To');
    if (replyToHeader) {
      var rt = parseEmailAddress(replyToHeader);
      replyTo = rt.email || rt.name;
    }
    authHeader = message.getHeader('Authentication-Results') || '';
    spf  = extractAuthResult(authHeader, 'spf');
    dkim = extractAuthResult(authHeader, 'dkim');
    dmarc = extractAuthResult(authHeader, 'dmarc');
  } catch (e) {
    // getHeader() may fail under tighter scopes; degrade gracefully.
    console.warn('Could not read headers for message ' + messageId + ': ' + sanitizeLogValue(e.message));
  }
  // Diagnostic logging — verify metadata scope exposes Authentication-Results.
  console.log('Header read: replyTo="' + replyTo + '" auth_header_chars=' + authHeader.length +
              ' spf=' + spf + ' dkim=' + dkim + ' dmarc=' + dmarc);

  // Get body — prefer plain text, fall back to HTML-to-text
  var plainBody = '';
  var htmlBody = '';
  try {
    plainBody = message.getPlainBody() || '';
  } catch (e) {
    console.warn('Could not read plain body for message ' + messageId + ': ' + sanitizeLogValue(e.message));
  }
  try {
    htmlBody = message.getBody() || '';
  } catch (e) {
    console.warn('Could not read HTML body for message ' + messageId + ': ' + sanitizeLogValue(e.message));
  }

  var htmlText = htmlToText(htmlBody);
  var body = plainBody && plainBody.trim().length > 0 ? plainBody : htmlText;

  // Extract URLs from body
  var urls = dedupeUrls(
    extractUrls(plainBody)
      .concat(extractUrls(htmlText))
      .concat(extractUrlsFromHtml(htmlBody))
  );

  // Extract attachment names
  var attachments = [];
  try {
    message.getAttachments().forEach(function(att) {
      attachments.push(att.getName());
    });
  } catch (e) {
    console.warn('Could not read attachments: ' + sanitizeLogValue(e.message));
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
