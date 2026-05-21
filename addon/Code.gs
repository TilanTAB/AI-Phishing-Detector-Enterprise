/**
 * Code.gs
 * Entry points for the Gmail Add-on.
 *
 * Functions referenced in appsscript.json or triggered by card actions:
 *   onGmailMessage(e)      — contextual trigger when email is opened
 *   buildAddOn(e)          — homepage trigger (no email context)
 *   analyzeEmailAction(e)  — card action: run AI analysis
 *   buildSettingsCard(e)   — universal action: show settings
 */

/**
 * Gmail contextual trigger — fires when user opens an email.
 * Builds and returns the home card showing email summary + Analyze button.
 *
 * @param {Object} e - Add-on event object
 * @returns {Card|Card[]}
 */
function onGmailMessage(e) {
  if (!isAllowedUser()) return buildAccessDeniedCard();

  try {
    var messageId = e && e.gmail && e.gmail.messageId;
    if (!messageId) {
      return buildErrorCard('No message context found. Please open an email first.');
    }

    var accessToken = e && e.gmail && e.gmail.accessToken;
    var emailData = getEmailData(messageId, accessToken);
    return buildHomeCard(emailData, messageId);

  } catch (err) {
    console.error('onGmailMessage error: ' + sanitizeLogValue(err.message));
    return buildErrorCard('Failed to load email: ' + sanitizeLogValue(err.message));
  }
}

/**
 * Homepage trigger — fires when user opens the add-on outside of an email.
 * Shows a welcome card with instructions.
 *
 * @param {Object} e - Add-on event object
 * @returns {Card}
 */
function buildAddOn(e) {
  if (!isAllowedUser()) return buildAccessDeniedCard();

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🔍 Phishing Checker')
      .setSubtitle('AI-powered email security'));

  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText(
            'Open any email in Gmail to analyze it for phishing indicators.\n\n' +
            'The add-on will check:\n' +
            '• Sender legitimacy & domain spoofing\n' +
            '• Suspicious URLs & shortened links\n' +
            '• Urgency & pressure tactics\n' +
            '• Grammar anomalies\n' +
            '• Impersonation attempts\n' +
            '• Dangerous attachment types\n\n' +
            'Results are shown instantly in this sidebar.'
          )
      )
  );

  return card.build();
}

/**
 * Card action — triggered when user clicks "Analyze for Phishing".
 * Fetches full email data, runs AI analysis, and pushes the results card.
 *
 * NOTE: This must complete within Apps Script's card action runtime budget.
 * AI analysis is one-shot with no retries to stay within that budget.
 *
 * @param {Object} e - Action event with e.parameters.messageId
 * @returns {ActionResponse}
 */
function analyzeEmailAction(e) {
  if (!isAllowedUser()) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Access denied.'))
      .build();
  }

  var messageId = e.parameters && e.parameters.messageId;

  if (!messageId) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: No message ID found.'))
      .build();
  }

  try {
    // Fetch email data — pass access token for addon-scoped getMessageById
    var accessToken = e && e.gmail && e.gmail.accessToken;
    var emailData = getEmailData(messageId, accessToken);

    // Run AI analysis (one-shot, no retry).
    var result = analyzeWithAI(emailData);

    console.log(
      'Analysis complete | id=' + messageId +
      ' | verdict=' + result.verdict +
      ' | score=' + result.score +
      ' | provider=' + (isTestMode() ? 'TEST_MODE' : _safeGetProviderName())
    );

    // Push results card onto the navigation stack
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().pushCard(buildResultsCard(result, messageId))
      )
      .build();

  } catch (err) {
    console.error('analyzeEmailAction error for ' + messageId + ': ' + sanitizeLogValue(err.message));
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().pushCard(buildErrorCard('Analysis failed: ' + sanitizeLogValue(err.message), messageId))
      )
      .build();
  }
}


/**
 * Helper to safely get provider name for logging without throwing.
 * @returns {string}
 */
function _safeGetProviderName() {
  try { return getProvider(); } catch (e) { return 'unknown'; }
}
