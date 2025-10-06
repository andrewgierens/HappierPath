import Browser from 'webextension-polyfill';
import { getLinksFromStorage } from './functions/storage';
import { Links } from './types/Link';

const DocumentUrlPatterns = ['http://*/*', 'https://*/*', 'ftp://*/*'];

// Detect if we're running in Firefox by checking for Firefox-specific API
// In Firefox, getBrowserInfo is available; in Chrome it's not
const isFirefox = Browser.runtime.getBrowserInfo !== undefined;

async function createContextMenu() {
  const links = await getLinksFromStorage();

  Browser.contextMenus.removeAll();
  if (!links || !links.links.length) {
    Browser.contextMenus.create({
      id: 'default_root',
      title: 'No paths configured',
      contexts: ['page'],
      enabled: false,
      documentUrlPatterns: DocumentUrlPatterns,
    });

    return;
  }

  links.links.forEach((link, index) => {
    const isHeading = link.pathUrl === '0';

    // Create main menu item
    Browser.contextMenus.create({
      title: link.pathName,
      enabled: !isHeading,
      contexts: ['page'],
      id: index.toString(),
      documentUrlPatterns: DocumentUrlPatterns,
    });

    // In Chrome, also create a "New Tab" version since Chrome doesn't support
    // detecting middle-click or modifier keys in context menus
    if (!isFirefox && !isHeading) {
      Browser.contextMenus.create({
        title: `${link.pathName} (New Tab)`,
        enabled: true,
        contexts: ['page'],
        id: `${index}_newtab`,
        documentUrlPatterns: DocumentUrlPatterns,
      });
    }
  });
}

Browser.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

const onStorageChange = (
  changes: Browser.Storage.StorageAreaOnChangedChangesType
) => {
  const newValue: Links = changes.json.newValue
    ? JSON.parse(changes.json.newValue as string)
    : { links: [] };

  if (!newValue?.links) return;
  createContextMenu();
};

Browser.storage.local.onChanged.addListener(onStorageChange);
Browser.storage.sync.onChanged.addListener(onStorageChange);

Browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  let itemIndex: number;
  let openInNewTab = false;

  const menuItemId = info.menuItemId.toString();

  // Check if this is a "new tab" menu item (Chrome only)
  if (menuItemId.endsWith('_newtab')) {
    const indexStr = menuItemId.replace('_newtab', '');
    const parsed = parseInt(indexStr);
    if (isNaN(parsed)) return;
    itemIndex = parsed;
    openInNewTab = true;
  } else {
    // Regular menu item
    const menuItemIdType = typeof info.menuItemId;
    if (menuItemIdType === 'string') {
      const parsed = parseInt(info.menuItemId as string);
      if (isNaN(parsed)) return;
      itemIndex = parsed;
    } else if (menuItemIdType === 'number') {
      itemIndex = info.menuItemId as number;
    } else {
      return;
    }

    // In Firefox, check if user wants to open in new tab (middle-click or Ctrl/Cmd+click)
    // Note: button and modifiers properties are only available in Firefox, not in Chrome
    if (isFirefox) {
      openInNewTab =
        info.button === 1 || // Middle click
        (info.modifiers && info.modifiers.includes('Ctrl')) || // Ctrl key on Windows/Linux
        (info.modifiers && info.modifiers.includes('Command')); // Cmd key on Mac
    }
  }

  goPath(tab, itemIndex, openInNewTab);
});

async function goPath(
  tab: Browser.Tabs.Tab,
  urlIndex: number,
  openInNewTab = false
) {
  if (!tab.id) return;

  if (tab.id < 0) {
    console.warn(
      'Context Menu navigation from extension popup is unsupported.'
    );
    return;
  }

  const links = await getLinksFromStorage();
  const link = links.links[urlIndex];
  if (!tab.url) return;
  const url = new URL(tab.url);
  const newUrl = `${url.protocol}//${url.hostname}${link.pathUrl}`;

  if (openInNewTab) {
    Browser.tabs.create({ url: newUrl });
  } else {
    Browser.tabs.update(tab.id, { url: newUrl });
  }
}
