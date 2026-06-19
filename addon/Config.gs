/**
 * Config.gs
 * Reads AI provider selection and credentials from Script Properties.
 * Script Properties act as environment variables — never hardcode secrets.
 *
 * To configure: Apps Script Editor → Project Settings → Script Properties
 */

// Immutable provider list
var VALID_PROVIDERS = Object.freeze(['azure_openai', 'bedrock_claude', 'gemini', 'vertex_ai']);

// Required Script Properties per provider (only non-secret ones surfaced in UI).
// bedrock_claude has dual auth support: either BEDROCK_API_KEY (recommended) OR
// AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (legacy IAM SigV4). Auth-key validation
// is performed in validateConfig() since it's an either/or check, not a strict list.
var PROVIDER_REQUIRED_KEYS = Object.freeze({
  azure_openai:  ['AZURE_ENDPOINT', 'AZURE_API_KEY', 'AZURE_DEPLOYMENT', 'AZURE_API_VERSION'],
  bedrock_claude: ['AWS_REGION', 'BEDROCK_MODEL_ID'],
  gemini:        ['GEMINI_API_KEY', 'GEMINI_MODEL'],
  vertex_ai:     ['VERTEX_PROJECT_ID', 'VERTEX_LOCATION', 'VERTEX_MODEL']
  // Note: vertex_ai uses ScriptApp.getOAuthToken() — no service account key needed
});

// Safe-to-display keys (non-secret) for the Settings card
var PROVIDER_DISPLAY_KEYS = Object.freeze({
  azure_openai:  ['AZURE_ENDPOINT', 'AZURE_DEPLOYMENT', 'AZURE_API_VERSION'],
  bedrock_claude: ['AWS_REGION', 'BEDROCK_MODEL_ID'],
  gemini:        ['GEMINI_MODEL'],
  vertex_ai:     ['VERTEX_PROJECT_ID', 'VERTEX_LOCATION', 'VERTEX_MODEL']
});

/**
 * Returns a single Script Property value.
 * Caches ALL properties on first call within a single execution to avoid
 * repeated RPC calls to PropertiesService.
 * @param {string} key
 * @returns {string|null}
 */
var _propCache = null;
function getProp(key) {
  if (!_propCache) {
    _propCache = PropertiesService.getScriptProperties().getProperties();
  }
  return _propCache[key] || null;
}

/**
 * Returns the configured AI provider name. Defaults to 'gemini'.
 * @returns {string}
 */
function getProvider() {
  var provider = getProp('AI_PROVIDER') || 'gemini';
  if (VALID_PROVIDERS.indexOf(provider) === -1) {
    throw new Error(
      'Invalid AI_PROVIDER: "' + provider + '". Must be one of: ' + VALID_PROVIDERS.join(', ')
    );
  }
  return provider;
}

/**
 * Pure domain-allowlist check. No Session/Properties calls — unit-testable.
 * Matches the email's domain (substring after the LAST '@') against a
 * comma-separated allowlist, case-insensitive, exact match (no subdomain wildcard).
 * Fail-closed: empty/missing inputs return false.
 *
 * @param {string} email
 * @param {string} allowedDomainsCsv  e.g. "acme.com,acme.co.uk"
 * @returns {boolean}
 */
function isDomainAllowed(email, allowedDomainsCsv) {
  if (!email || !allowedDomainsCsv) return false;
  var at = email.lastIndexOf('@');
  if (at === -1) return false;
  var domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain) return false;
  return allowedDomainsCsv.split(',').some(function(d) {
    return d.toLowerCase().trim() === domain;
  });
}

/**
 * Editor-runnable test for isDomainAllowed. No network.
 * Run in the Apps Script editor; expect "test_domainAllowlist: ALL PASSED".
 */
function test_domainAllowlist() {
  var cases = [
    ['alice@acme.com',     'acme.com',            true],
    ['alice@acme.com',     'acme.com,acme.co.uk', true],
    ['bob@acme.co.uk',     'acme.com,acme.co.uk', true],
    ['ALICE@ACME.COM',     'acme.com',            true],   // case-insensitive
    ['alice@acme.com',     ' acme.com ',          true],   // trims config entry
    ['alice@sub.acme.com', 'acme.com',            false],  // exact match only
    ['alice@evil.com',     'acme.com',            false],
    ['alice@acme.com',     '',                    false],  // fail-closed: empty
    ['alice@acme.com',     null,                  false],  // fail-closed: unset
    ['',                   'acme.com',            false],  // no email
    ['notanemail',         'acme.com',            false]   // no '@'
  ];
  var failed = 0;
  cases.forEach(function(c, i) {
    var got = isDomainAllowed(c[0], c[1]);
    if (got !== c[2]) {
      failed++;
      console.error('Case ' + i + ' FAILED: isDomainAllowed(' +
        JSON.stringify(c[0]) + ', ' + JSON.stringify(c[1]) + ') = ' + got +
        ', expected ' + c[2]);
    }
  });
  if (failed === 0) console.log('test_domainAllowlist: ALL PASSED (' + cases.length + ' cases)');
  else console.error('test_domainAllowlist: ' + failed + ' case(s) FAILED');
}

/**
 * Returns true if the current user's email domain is in ALLOWED_DOMAINS.
 *
 * Reads ALLOWED_DOMAINS from Script Properties (comma-separated domains,
 * e.g. "acme.com,acme.co.uk"). Fail-closed: if unset/empty, denies all users.
 *
 * NOTE: never set ALLOWED_DOMAINS to a public domain (gmail.com, outlook.com) —
 * that would allow every consumer account that can reach the add-on.
 *
 * @returns {boolean}
 */
function isAllowedUser() {
  var currentUser = getCurrentUserEmail();
  if (!currentUser) return false;
  return isDomainAllowed(currentUser, getProp('ALLOWED_DOMAINS'));
}

/**
 * Returns the active user's email address, or an empty string if unavailable.
 * @returns {string}
 */
function getCurrentUserEmail() {
  try {
    return (Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  } catch (e) {
    console.warn('Could not determine active user: ' + sanitizeLogValue(e.message));
    return '';
  }
}

/**
 * Returns true if TEST_MODE=true is set in Script Properties.
 * In test mode, AI providers return a hardcoded result without making real API calls.
 * Useful for Card.gs UI development without burning API credits.
 * @returns {boolean}
 */
function isTestMode() {
  return getProp('TEST_MODE') === 'true';
}

/**
 * Validates that all required properties exist for the given provider.
 * Throws a descriptive error listing exactly which properties are missing.
 * @param {string} provider
 */
function validateConfig(provider) {
  var allProps = PropertiesService.getScriptProperties().getProperties();
  var keys = PROVIDER_REQUIRED_KEYS[provider] || [];
  var missing = keys.filter(function(key) { return !allProps[key]; });

  if (missing.length > 0) {
    throw new Error(
      'Missing Script Properties for provider "' + provider + '":\n  ' +
      missing.join('\n  ') +
      '\n\nGo to: Apps Script Editor → Project Settings → Script Properties'
    );
  }

  // bedrock_claude: either BEDROCK_API_KEY (recommended) OR AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (legacy IAM).
  if (provider === 'bedrock_claude') {
    var hasApiKey = !!allProps['BEDROCK_API_KEY'];
    var hasIamPair = !!allProps['AWS_ACCESS_KEY_ID'] && !!allProps['AWS_SECRET_ACCESS_KEY'];
    if (!hasApiKey && !hasIamPair) {
      throw new Error(
        'BedrockClaude: no auth credentials configured. Set either:\n' +
        '  • BEDROCK_API_KEY (recommended — simpler bearer token), OR\n' +
        '  • AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (legacy IAM SigV4)\n\n' +
        'Go to: Apps Script Editor → Project Settings → Script Properties'
      );
    }
  }
}

/**
 * Returns only the safe-to-display (non-secret) config values for the Settings card.
 * Never returns API keys or secrets.
 * @returns {Object}
 */
function getSafeDisplayConfig() {
  var provider = getProvider();
  var safeKeys = PROVIDER_DISPLAY_KEYS[provider] || [];
  var result = { AI_PROVIDER: provider };
  safeKeys.forEach(function(key) {
    result[key] = getProp(key) || '(not set)';
  });
  // Org-deployment settings (non-secret)
  result.ALLOWED_DOMAINS = getProp('ALLOWED_DOMAINS') || '(not set — add-on denies everyone)';
  result.RATE_LIMIT_PER_HOUR = String(getRateLimitPerHour());
  return result;
}
