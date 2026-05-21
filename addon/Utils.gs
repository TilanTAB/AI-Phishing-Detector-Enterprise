/**
 * Utils.gs
 * Shared utility functions used across the add-on.
 * Keeps individual modules focused on their single responsibility.
 */

/**
 * Extracts all HTTP/HTTPS URLs from a plain-text string.
 * Caps at 30 URLs and 200 chars each to prevent prompt explosion.
 *
 * @param {string} text
 * @returns {string[]}
 */
function extractUrls(text) {
  if (!text) return [];
  var urlRegex = /https?:\/\/[^\s<>"'\)\]]+/gi;
  var matches = text.match(urlRegex) || [];
  return dedupeUrls(matches);
}

/**
 * Extracts HTTP/HTTPS URLs from HTML href attributes.
 * @param {string} html
 * @returns {string[]}
 */
function extractUrlsFromHtml(html) {
  if (!html) return [];

  var urls = [];
  var hrefRegex = /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  var match;
  while ((match = hrefRegex.exec(html)) !== null) {
    var href = decodeHtmlEntities(match[1] || match[2] || match[3] || '');
    if (/^https?:\/\//i.test(href)) {
      urls.push(href);
    }
  }

  return dedupeUrls(urls);
}

/**
 * Deduplicates URLs while preserving order and enforcing prompt caps.
 * @param {string[]} urls
 * @returns {string[]}
 */
function dedupeUrls(urls) {
  var seen = {};
  var unique = [];
  (urls || []).forEach(function(url) {
    // Strip trailing punctuation that may have been captured
    url = String(url || '').replace(/[.,;:!?)]+$/, '');
    if (!url) return;
    if (!seen[url]) {
      seen[url] = true;
      unique.push(url.substring(0, 200));
    }
  });
  return unique.slice(0, 30);
}

/**
 * Decodes the limited HTML entities that commonly appear in href attributes.
 * @param {string} text
 * @returns {string}
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  return String(text)
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Parses "Display Name <email@domain.com>" into parts.
 * @param {string} raw - Raw From/Reply-To header value
 * @returns {{name: string, email: string}}
 */
function parseEmailAddress(raw) {
  if (!raw) return { name: '', email: '' };
  var match = raw.match(/<([^>]+)>/);
  if (match) {
    var email = match[1].trim();
    var name  = raw.substring(0, raw.indexOf('<')).trim().replace(/^"|"$/g, '');
    return { name: name, email: email };
  }
  return { name: '', email: raw.trim() };
}

/**
 * Extracts SPF/DKIM/DMARC result from an Authentication-Results header value.
 * Returns 'unknown' if the mechanism is not found.
 *
 * @param {string} authHeader - Raw Authentication-Results header value
 * @param {string} mechanism  - 'spf', 'dkim', or 'dmarc'
 * @returns {string}
 */
function extractAuthResult(authHeader, mechanism) {
  if (!authHeader) return 'unknown';
  var regex = new RegExp(mechanism + '=(\\w+)', 'i');
  var match = authHeader.match(regex);
  return match ? match[1] : 'unknown';
}

/**
 * Converts raw HTML to plain text by stripping tags.
 * Used when an email has no text/plain part.
 *
 * @param {string} html
 * @returns {string}
 */
function htmlToText(html) {
  if (!html) return '';
  // Replace common block elements with newlines first
  var text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')  // Strip all remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
    .trim();
  return text;
}

/**
 * Makes a JSON HTTP request via UrlFetchApp.
 * Always returns {ok: boolean, status: number, text: string, error: string|null}.
 * Never throws — callers check the .ok field.
 *
 * @param {string} url
 * @param {Object} options - UrlFetchApp options (method, headers, payload, etc.)
 * @returns {{ok: boolean, status: number, text: string, error: string|null}}
 */
function sanitizeLogValue(value) {
  if (value === null || value === undefined) return '';

  var text = String(value);
  text = text.replace(/([?&](?:key|api_key|token|access_token|code|signature|sig)=)[^&\s]+/gi, '$1[REDACTED]');
  text = text.replace(/(Authorization:\s*(?:Bearer|AWS4-HMAC-SHA256)\s+)[^\s,]+/gi, '$1[REDACTED]');
  text = text.replace(/((?:api-key|x-api-key|Authorization)\s*[:=]\s*)[^\s,;}]+/gi, '$1[REDACTED]');
  text = text.replace(/(Credential=)[^,\s]+/gi, '$1[REDACTED]');
  text = text.replace(/(Signature=)[^,\s]+/gi, '$1[REDACTED]');
  text = text.replace(/(AWS_SECRET_ACCESS_KEY|BEDROCK_API_KEY|GEMINI_API_KEY|AZURE_API_KEY)(["'\s:=]+)[^"'\s,;}]+/gi, '$1$2[REDACTED]');

  return text;
}

function sanitizeUrlForLog(url) {
  if (!url) return '';
  return sanitizeLogValue(String(url).replace(/\?.*$/, '?[REDACTED]'));
}

function httpFetch(url, options) {
  options = options || {};
  options.muteHttpExceptions = true; // Never throw on HTTP errors

  var response;
  try {
    response = UrlFetchApp.fetch(url, options);
  } catch (e) {
    // Network-level error (DNS failure, connection refused, timeout)
    var networkError = sanitizeLogValue(e.message);
    console.error('UrlFetchApp error for ' + sanitizeUrlForLog(url) + ': ' + networkError);
    return { ok: false, status: 0, text: '', error: networkError };
  }

  var status = response.getResponseCode();
  var text   = response.getContentText();

  if (status < 200 || status >= 300) {
    var safeBody = sanitizeLogValue(text).substring(0, 160);
    console.error('HTTP ' + status + ' from ' + sanitizeUrlForLog(url) + ': ' + safeBody);
    return { ok: false, status: status, text: text, error: 'HTTP ' + status + ': ' + safeBody };
  }

  return { ok: true, status: status, text: text, error: null };
}

/**
 * Returns the current UTC datetime in AWS/ISO format: YYYYMMDDTHHMMSSZ
 * @returns {string}
 */
function utcTimestamp() {
  return Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Returns the current UTC date in YYYYMMDD format.
 * @returns {string}
 */
function utcDateStamp() {
  return Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd');
}

/**
 * Converts a byte array (signed Java bytes) to a lowercase hex string.
 * Required for AWS Sig V4 where computeHmacSha256Signature returns signed bytes.
 *
 * @param {number[]} bytes - Array of signed bytes (-128 to 127)
 * @returns {string} Lowercase hex string
 */
function bytesToHex(bytes) {
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Computes SHA-256 hash of a string and returns lowercase hex.
 * @param {string} str
 * @returns {string}
 */
function sha256Hex(str) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    str,
    Utilities.Charset.UTF_8
  );
  return bytesToHex(bytes);
}
/**
 * Converts a byte array (signed Java bytes) to a string where each byte
 * maps to its corresponding character code (0-255).
 * This preserves raw byte values when passed to GAS crypto functions.
 *
 * @param {number[]} bytes - Signed byte array from GAS
 * @returns {string}
 */
function _bytesToString(bytes) {
  var str = '';
  for (var i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i] < 0 ? bytes[i] + 256 : bytes[i]);
  }
  return str;
}

/**
 * Computes HMAC-SHA256 and returns the raw byte array.
 * Key can be a string or byte array (for chained AWS SigV4 key derivation).
 *
 * Uses Utilities.computeHmacSignature() with MacAlgorithm enum and raw byte
 * arrays to avoid UTF-8 re-encoding that corrupts bytes > 127 (e.g. 0xA6
 * becomes 0xC2 0xA6 in UTF-8, breaking SigV4 key derivation).
 *
 * @param {string|number[]} key
 * @param {string} message
 * @returns {number[]} Signed byte array
 */
function hmacSha256Bytes(key, message) {
  var keyBytes;
  if (typeof key === 'string') {
    keyBytes = Utilities.newBlob(key).getBytes();
  } else {
    keyBytes = key; // Already a byte array from previous HMAC round
  }
  var messageBytes = Utilities.newBlob(message).getBytes();
  return Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_256,
    messageBytes,
    keyBytes
  );
}

/**
 * Computes HMAC-SHA256 and returns lowercase hex string.
 * @param {string|number[]} key
 * @param {string} message
 * @returns {string}
 */
function hmacSha256Hex(key, message) {
  return bytesToHex(hmacSha256Bytes(key, message));
}
