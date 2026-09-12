import { installDocumentRedirectRules } from './dnr-rules';

void installDocumentRedirectRules();

chrome.runtime.onInstalled.addListener(() => {
  void installDocumentRedirectRules();
});
