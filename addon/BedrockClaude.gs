/**
 * BedrockClaude.gs
 * Phishing analysis using Amazon Bedrock Claude.
 *
 * Supports TWO authentication methods (BEDROCK_API_KEY takes precedence if both are set):
 *
 *   1. Bedrock API key (recommended — simpler, bearer token):
 *      BEDROCK_API_KEY  — Bedrock API key from AWS Console → Bedrock → API keys
 *
 *   2. IAM access key (legacy — SigV4 signed request):
 *      AWS_ACCESS_KEY_ID     — IAM access key
 *      AWS_SECRET_ACCESS_KEY — IAM secret key
 *
 * Always required:
 *   AWS_REGION       — e.g. "us-east-1"
 *   BEDROCK_MODEL_ID — e.g. "anthropic.claude-3-5-sonnet-20241022-v2:0"
 *
 * AWS Sig V4 implementation validated against:
 * https://docs.aws.amazon.com/general/latest/gr/signature-v4-test-suite.html
 * Bedrock API key reference:
 * https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html
 */

/**
 * Analyzes email data for phishing using Amazon Bedrock Claude.
 *
 * @param {Object} emailData - From GmailHelper.getEmailData()
 * @returns {Object} PhishingResult from Models.parseAnalysis()
 */
function bedrockClaudeAnalyze(emailData) {
  var apiKey  = getProp('BEDROCK_API_KEY');
  var region  = getProp('AWS_REGION') || 'us-east-1';
  var modelId = getProp('BEDROCK_MODEL_ID') || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  var host    = 'bedrock-runtime.' + region + '.amazonaws.com';
  var path    = '/model/' + encodeURIComponent(modelId) + '/invoke';
  var service = 'bedrock';
  var url     = 'https://' + host + path;

  var body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    temperature: 0.1,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(emailData) }
    ]
  });

  // Pick auth method. API key wins if both are configured.
  var headers;
  if (apiKey) {
    console.log('BedrockClaude: using Bedrock API key auth, model=' + modelId + ' for message ' + emailData.messageId);
    headers = {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    };
  } else {
    var accessKeyId     = getProp('AWS_ACCESS_KEY_ID');
    var secretAccessKey = getProp('AWS_SECRET_ACCESS_KEY');
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'BedrockClaude: no auth credentials configured. Set either ' +
        'BEDROCK_API_KEY (recommended) OR ' +
        'AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in Script Properties.'
      );
    }
    console.log('BedrockClaude: using SigV4 IAM auth, model=' + modelId + ' for message ' + emailData.messageId);
    headers = _buildSig4Headers(
      accessKeyId, secretAccessKey, region, service,
      host, path, body
    );
  }

  var result = httpFetch(url, {
    method: 'post',
    headers: headers,
    payload: body,
    muteHttpExceptions: true
  });

  if (!result.ok) {
    console.error('Bedrock full error response: ' + result.text.substring(0, 2000));
    throw new Error('Bedrock Claude error: ' + result.error);
  }

  var response      = JSON.parse(result.text);
  var contentBlocks = response.content || [];
  var textContent   = '';
  for (var i = 0; i < contentBlocks.length; i++) {
    if (contentBlocks[i].type === 'text') {
      textContent = contentBlocks[i].text;
      break;
    }
  }

  if (!textContent) {
    throw new Error('Bedrock Claude returned empty content. Response: ' + result.text.substring(0, 300));
  }

  return parseAnalysis(textContent);
}

// ---------------------------------------------------------------------------
// AWS Signature Version 4 Implementation
// ---------------------------------------------------------------------------

/**
 * Builds the signed headers object for an AWS Sig V4 POST request.
 * All crypto primitives (HMAC-SHA256, SHA-256) come from Utils.gs.
 *
 * @param {string} accessKeyId
 * @param {string} secretAccessKey
 * @param {string} region
 * @param {string} service
 * @param {string} host
 * @param {string} path
 * @param {string} body - Request body string
 * @returns {Object} Headers object including Authorization and x-amz-date
 */
function _buildSig4Headers(accessKeyId, secretAccessKey, region, service, host, path, body) {
  var amzDate  = utcTimestamp();  // e.g. "20260329T120000Z"
  var dateStamp = utcDateStamp(); // e.g. "20260329"

  var payloadHash = sha256Hex(body);

  // --- Step 1: Canonical Request ---
  // Headers must be sorted alphabetically by lowercase header name
  var canonicalHeaders =
    'content-type:application/json\n' +
    'host:' + host + '\n' +
    'x-amz-date:' + amzDate + '\n';

  var signedHeaders = 'content-type;host;x-amz-date';

  // AWS SigV4 requires each path segment to be URI-encoded in the canonical request.
  // Since 'path' is already single-encoded (e.g. %3A), we must re-encode each segment
  // so that % becomes %25 (e.g. %3A -> %253A). The actual HTTP URL stays single-encoded.
  var canonicalURI = path.split('/').map(function(seg) {
    return seg ? encodeURIComponent(seg) : seg;
  }).join('/');

  console.log('SigV4 DEBUG path (URL):      ' + path);
  console.log('SigV4 DEBUG canonicalURI:     ' + canonicalURI);

  var canonicalRequest = [
    'POST',
    canonicalURI,
    '',                  // Empty query string
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  console.log('SigV4 DEBUG canonicalRequest:\n' + canonicalRequest);

  // --- Step 2: String to Sign ---
  var credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request';
  var stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  console.log('SigV4 DEBUG stringToSign:\n' + stringToSign);

  // --- Step 3: Derive Signing Key ---
  // Chain: HMAC(HMAC(HMAC(HMAC("AWS4" + secret, date), region), service), "aws4_request")
  // Each step uses raw bytes output as key for the next step.
  var kDate    = hmacSha256Bytes('AWS4' + secretAccessKey, dateStamp);
  var kRegion  = hmacSha256Bytes(kDate, region);
  var kService = hmacSha256Bytes(kRegion, service);
  var kSigning = hmacSha256Bytes(kService, 'aws4_request');

  console.log('SigV4 DEBUG kDate hex: ' + bytesToHex(kDate));
  console.log('SigV4 DEBUG kSigning hex: ' + bytesToHex(kSigning));

  // --- Step 4: Compute Signature ---
  var signature = hmacSha256Hex(kSigning, stringToSign);
  console.log('SigV4 DEBUG signature: ' + signature);

  // --- Step 5: Build Authorization Header ---
  var authorization =
    'AWS4-HMAC-SHA256 ' +
    'Credential=' + accessKeyId + '/' + credentialScope + ', ' +
    'SignedHeaders=' + signedHeaders + ', ' +
    'Signature=' + signature;

  // Include Content-Type in headers dict (not via contentType option)
  // to prevent GAS from appending '; charset=UTF-8'
  return {
    'Authorization': authorization,
    'Content-Type': 'application/json',
    'x-amz-date':    amzDate,
    'x-amz-content-sha256': payloadHash
  };
}

// ---------------------------------------------------------------------------
// AWS Key Validation (STS GetCallerIdentity)
// ---------------------------------------------------------------------------

/**
 * Validates AWS credentials by calling STS GetCallerIdentity.
 * This is a simple, read-only call that any valid IAM key can make.
 * Run from Apps Script editor: testAwsCredentials()
 *
 * @returns {void} Logs the result or error to console
 */
function testAwsCredentials() {
  var accessKeyId     = getProp('AWS_ACCESS_KEY_ID');
  var secretAccessKey = getProp('AWS_SECRET_ACCESS_KEY');
  var region          = getProp('AWS_REGION') || 'us-east-1';

  var host    = 'sts.' + region + '.amazonaws.com';
  var path    = '/';
  var service = 'sts';
  var body    = 'Action=GetCallerIdentity&Version=2011-06-15';

  var amzDate   = utcTimestamp();
  var dateStamp = utcDateStamp();
  var payloadHash = sha256Hex(body);

  var canonicalHeaders =
    'content-type:application/x-www-form-urlencoded; charset=utf-8\n' +
    'host:' + host + '\n' +
    'x-amz-date:' + amzDate + '\n';
  var signedHeaders = 'content-type;host;x-amz-date';

  var canonicalRequest = [
    'POST', path, '', canonicalHeaders, signedHeaders, payloadHash
  ].join('\n');

  var credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request';
  var stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)
  ].join('\n');

  var kDate    = hmacSha256Bytes('AWS4' + secretAccessKey, dateStamp);
  var kRegion  = hmacSha256Bytes(kDate, region);
  var kService = hmacSha256Bytes(kRegion, service);
  var kSigning = hmacSha256Bytes(kService, 'aws4_request');
  var signature = hmacSha256Hex(kSigning, stringToSign);

  var authorization =
    'AWS4-HMAC-SHA256 ' +
    'Credential=' + accessKeyId + '/' + credentialScope + ', ' +
    'SignedHeaders=' + signedHeaders + ', ' +
    'Signature=' + signature;

  var url = 'https://' + host + path;
  var result = httpFetch(url, {
    method: 'post',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'x-amz-date': amzDate
    },
    payload: body,
    muteHttpExceptions: true
  });

  if (result.ok) {
    console.log('✅ AWS credentials are VALID!\nResponse:\n' + result.text);
  } else {
    console.error('❌ AWS credentials validation FAILED:\n' + result.text);
  }
}


// ---------------------------------------------------------------------------
// Bedrock API Key Validation (Direct Bearer-Auth Smoke Test)
// ---------------------------------------------------------------------------

/**
 * Validates BEDROCK_API_KEY by making a small Bedrock invocation.
 * Run from Apps Script editor: testBedrockApiKey()
 *
 * @returns {void} Logs the result or error to console
 */
function testBedrockApiKey() {
  var apiKey  = getProp('BEDROCK_API_KEY');
  var region  = getProp('AWS_REGION') || 'us-east-1';
  var modelId = getProp('BEDROCK_MODEL_ID') || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  if (!apiKey) {
    console.error('❌ BEDROCK_API_KEY is not set in Script Properties.');
    return;
  }

  var url = 'https://bedrock-runtime.' + region + '.amazonaws.com/model/' +
            encodeURIComponent(modelId) + '/invoke';

  var body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Say only the word OK.' }]
  });

  var result = httpFetch(url, {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    payload: body,
    muteHttpExceptions: true
  });

  if (result.ok) {
    console.log('✅ Bedrock API key is VALID!\nResponse:\n' + result.text.substring(0, 500));
  } else {
    console.error('❌ Bedrock API key validation FAILED (status=' + result.status + '):\n' +
                  result.text.substring(0, 1000));
  }
}
