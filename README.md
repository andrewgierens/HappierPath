Based on [HappyPath](https://github.com/gcLabs/HappyPath)
I've created this fork as Google has begun removing Manifest V2 extensions from Google.
This fork updates HappyPath to be compliant in Manifest V3.

Thank you [gcLabs](https://github.com/gcLabs) for creating the original extension. This has saved me and my company countless hours.

HappierPath
... because everything is relative.

You know what a bookmark manager does, right? HappierPath does the same thing for paths.

Instead of bookmarking www.google.com or www.bbcnews.com, HappierPath lets you bookmark only the path, e.g. /cms/login.html or /api/introspect. This is mostly so that enterprise CMS users and other lazy webadmins can gain access to the same tools across multiple websites, without having to type in the paths repeatedly. My company has about 300 websites, all with the same paths to the same admin tools - so this saves me a lot of time. Maybe it will save you some too.

## Build
* Install NodeJS 23.10.0
* Run `npm install`
* Depending on your browser run one of the following commands
  * Chrome `npm run build-prod-chrome`
  * FireFox `npm run build-prod-firefox`
* Load the /dist folder into your browser. Instructions are dependent on browser, look up documentation for your browser

## Testing
* Open the popup page
* Click 'Open Path Editor'
* Enter a path config such as

```
Google Links>0
Search>/search?q=test
Configure>/search/howsearchworks
```

* Click Write Path List
* Click Close Path Editor
* The path list will update. It should contain 1 heading, and 2 relative links
* Navigate to `https://google.com`
* Clicking either link will take you to the appropriate page without changing the FQDN
* Navigate to `https://google.com.au`
* Clicking the same links will take you to the same routes without changing the FQDN
* This works because google.com and google.com.au share the same route structure. A traditional bookmark will also store the FQDN, which isn't useful when you have many websites that share the same route structure

## Domain-Specific Context Menu (New in 5.2.0)

HappierPath now supports domain-specific filtering for context menu items. You can configure paths to only appear in the context menu when you're on a specific domain or set of domains.

### Syntax

To make a path domain-specific, use the `@` symbol followed by a regex pattern:

```
Link Name>Path URL@Domain Pattern
```

### Examples

**Single domain:**
```
GitHub Issues>/issues@github\.com
```
This link will only appear in the context menu when you're on github.com

**Multiple domains:**
```
Admin Panel>/admin@(google|github)\.com
Dev Tools>/tools@(dev|staging)\.example\.com
```

**Domain with subdomains:**
```
Dashboard>/dashboard@.*\.example\.com
```
This matches any subdomain of example.com (e.g., api.example.com, dev.example.com)

**All domains (default behavior):**
```
Universal Link>/path
```
Links without the `@domain` pattern will appear on all domains, maintaining backward compatibility.

### Context Menu Behavior

* Context menu items are dynamically filtered based on the current tab's domain
* The filtering happens automatically when you switch tabs or navigate to a new page
* If no paths match the current domain, you'll see "No paths for this domain" in the context menu
* Domain patterns are case-insensitive regex patterns
* Invalid regex patterns will be logged to the console and those links will be hidden

## Change Log
CHANGES IN vERSION 5.0.0

Graphical Uplift

Change Requests:
* Use MUI as a component Library
* Theme option to toggle between Light and Dark. Light being the default
* Updated wording on the Read and Write Path List buttons to be simply Save and Reset Config

CHANGES IN VERSION 5.2.0

Domain-Specific Context Menu Filtering

Change Requests:

* Context menu items can now be filtered by domain using regex patterns
* Added support for domain-specific path configuration using `@domain` syntax
* Context menu dynamically updates when switching tabs or navigating
* Maintains backward compatibility - paths without domain patterns appear on all domains
* Examples and documentation added to Path Editor UI

CHANGES IN VERSION 4.3.0

Extension Options menu

Change Requests:

* Option to sync config paths to your browser account.
  * FireFox sync depends on what is configured in FireFox settings. Default sync should be 5 minutes

Bug Fixes:
* Go button overflowing to new line on FireFox

CHANGES IN VERSION 4.2.0

Added support for FireFox

CHANGES IN VERSION 4.1.0

Added Context menu for quick navigation

CHANGES IN VERSION 4.0.0

Migrated code to React/Typescript

CHANGES IN VERSION 3.0:

Bug fixes

Updated for Chrome extension compliance

CHANGES IN VERSION 2.2:

RegEx transformations: You can now add a RegEx transformation in this format:
`{Label}>{RegEx URL match}<<<{Link to generate (with option attributes in this format: $n)}`

For example:
`Edit this page>(\/pages\/?id=)([0-9]{1,9}).*<<</editpage/?id=$2`

If HappierPath finds a RegEx match on the current URL, it will create a link using the transformation path.

## To do (in no particular order):
 - Save domains as well as paths
 - Port field (if enough people think it might be useful)
 - Customise query string variables
 - Keep query string when switching paths
 - Better path management: improved UI, grouping, moving
