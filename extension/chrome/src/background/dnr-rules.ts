const RULE_ID_START = 10_000;

type DnrRule = chrome.declarativeNetRequest.Rule;

const NOT_ATTACHMENT: chrome.declarativeNetRequest.HeaderInfo = {
  header: 'content-disposition',
  excludedValues: ['*attachment*']
};

export function buildDocumentRedirectRules(viewerUrl: string): DnrRule[] {
  const redirect = {
    regexSubstitution: `${viewerUrl}#\\0`
  };

  return [
    {
      id: RULE_ID_START,
      priority: 1,
      action: { type: 'redirect', redirect },
      condition: {
        regexFilter: '^https?://.*\\.csv([?#].*)?$',
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame'],
        responseHeaders: [NOT_ATTACHMENT]
      }
    },
    {
      id: RULE_ID_START + 1,
      priority: 1,
      action: { type: 'redirect', redirect },
      condition: {
        regexFilter: '^https?://.*\\.tsv([?#].*)?$',
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame'],
        responseHeaders: [NOT_ATTACHMENT]
      }
    },
    {
      id: RULE_ID_START + 2,
      priority: 1,
      action: { type: 'redirect', redirect },
      condition: {
        regexFilter: '^https?://.*',
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame'],
        responseHeaders: [
          NOT_ATTACHMENT,
          { header: 'content-type', values: ['text/csv*', 'application/csv*'] }
        ]
      }
    },
    {
      id: RULE_ID_START + 3,
      priority: 1,
      action: { type: 'redirect', redirect },
      condition: {
        regexFilter: '^https?://.*',
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame'],
        responseHeaders: [
          NOT_ATTACHMENT,
          { header: 'content-type', values: ['text/tab-separated-values*', 'text/tsv*'] }
        ]
      }
    }
  ];
}

export async function installDocumentRedirectRules(): Promise<void> {
  const rules = buildDocumentRedirectRules(chrome.runtime.getURL('viewer.html'));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map((rule) => rule.id),
    addRules: rules
  });
}
