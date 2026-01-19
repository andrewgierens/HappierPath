import Browser from 'webextension-polyfill';
import { getLinksFromStorage } from './functions/storage';
import { Link, Links } from './types/Link';

const DocumentUrlPatterns = ['http://*/*', 'https://*/*', 'ftp://*/*'];

// Helper function to check if a link matches the current domain
function linkMatchesDomain(link: Link, hostname: string): boolean {
  // If no domain pattern is specified, the link is available on all domains
  if (!link.domainPattern) {
    return true;
  }

  try {
    const regex = new RegExp(link.domainPattern, 'i');
    return regex.test(hostname);
  } catch (e) {
    console.error('Invalid domain pattern:', link.domainPattern, e);
    return false;
  }
}

async function createContextMenuForTab(_tabId: number, hostname: string) {
  const links = await getLinksFromStorage();

  await Browser.contextMenus.removeAll();

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

  // Filter links based on domain pattern
  const matchingLinks: Array<{ link: Link; originalIndex: number }> = [];
  links.links.forEach((link, index) => {
    if (linkMatchesDomain(link, hostname)) {
      matchingLinks.push({ link, originalIndex: index });
    }
  });

  if (matchingLinks.length === 0) {
    Browser.contextMenus.create({
      id: 'no_matching_paths',
      title: 'No paths for this domain',
      contexts: ['page'],
      enabled: false,
      documentUrlPatterns: DocumentUrlPatterns,
    });
    return;
  }

  matchingLinks.forEach(({ link, originalIndex }) => {
    const isHeading = link.pathUrl === '0';
    Browser.contextMenus.create({
      title: link.pathName,
      enabled: !isHeading,
      contexts: ['page'],
      id: originalIndex.toString(),
      documentUrlPatterns: DocumentUrlPatterns,
    });
  });
}

Browser.runtime.onInstalled.addListener(async () => {
  // Create a default context menu
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
  } else {
    // Create all links initially (will be filtered on tab change)
    links.links.forEach((link, index) => {
      const isHeading = link.pathUrl === '0';
      Browser.contextMenus.create({
        title: link.pathName,
        enabled: !isHeading,
        contexts: ['page'],
        id: index.toString(),
        documentUrlPatterns: DocumentUrlPatterns,
      });
    });
  }
});

// Update context menu when tab is activated or updated
Browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await Browser.tabs.get(activeInfo.tabId);
  if (tab.url) {
    try {
      const url = new URL(tab.url);
      await createContextMenuForTab(activeInfo.tabId, url.hostname);
    } catch {
      // Invalid URL, ignore
    }
  }
});

Browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      await createContextMenuForTab(tabId, url.hostname);
    } catch {
      // Invalid URL, ignore
    }
  }
});

const onStorageChange = async (
  changes: Browser.Storage.StorageAreaOnChangedChangesType
) => {
  const newValue: Links = changes.json.newValue
    ? JSON.parse(changes.json.newValue as string)
    : { links: [] };

  if (!newValue?.links) return;

  // Get current active tab and update context menu
  const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.url) {
    try {
      const url = new URL(tabs[0].url);
      await createContextMenuForTab(tabs[0].id!, url.hostname);
    } catch {
      // Invalid URL, recreate default menu
      Browser.contextMenus.removeAll();
      if (!newValue.links.length) {
        Browser.contextMenus.create({
          id: 'default_root',
          title: 'No paths configured',
          contexts: ['page'],
          enabled: false,
          documentUrlPatterns: DocumentUrlPatterns,
        });
      }
    }
  }
};

Browser.storage.local.onChanged.addListener(onStorageChange);
Browser.storage.sync.onChanged.addListener(onStorageChange);

Browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  let itemIndex: number;
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

  // Check if user wants to open in new tab (middle-click or Ctrl/Cmd+click)
  const openInNewTab =
    info.button === 1 || // Middle click
    info.modifiers?.includes('Ctrl') || // Ctrl key on Windows/Linux
    info.modifiers?.includes('Command'); // Cmd key on Mac

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
