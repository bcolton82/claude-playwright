# class: Playwright
* since: v1.8

Playwright module provides a method to launch a browser instance. The following is a typical example of using Playwright
to drive automation:

```js
const { chromium, firefox, webkit } = require('playwright');

(async () => {
  const browser = await chromium.launch();  // Or 'firefox' or 'webkit'.
  const page = await browser.newPage();
  await page.goto('http://example.com');
  // other actions...
  await browser.close();
})();
```

## property: Playwright.chromium
* since: v1.8
- type: <[BrowserType]>

This object can be used to launch or connect to Chromium, returning instances of [Browser].

## property: Playwright.devices
* since: v1.8
- type: <[Object]>

Returns a dictionary of devices to be used with [`method: Browser.newContext`] or [`method: Browser.newPage`].

```js
const { webkit, devices } = require('playwright');
const iPhone = devices['iPhone 6'];

(async () => {
  const browser = await webkit.launch();
  const context = await browser.newContext({
    ...iPhone
  });
  const page = await context.newPage();
  await page.goto('http://example.com');
  // other actions...
  await browser.close();
})();
```

## property: Playwright.errors
* since: v1.8
- type: <[Object]>
  - `TimeoutError` <[function]> A class of [TimeoutError].

Playwright methods might throw errors if they are unable to fulfill a request. For example,
[`method: Locator.waitFor`] might fail if the selector doesn't match any nodes during the given timeframe.

For certain types of errors Playwright uses specific error classes. These classes are available via
[`playwright.errors`](#playwright-errors).

An example of handling a timeout error:

```js
try {
  await page.locator('.foo').waitFor();
} catch (e) {
  if (e instanceof playwright.errors.TimeoutError) {
    // Do something if this is a timeout.
  }
}
```

## property: Playwright.firefox
* since: v1.8
- type: <[BrowserType]>

This object can be used to launch or connect to Firefox, returning instances of [Browser].

## property: Playwright.request
* since: v1.16
  - alias-csharp: APIRequest
- type: <[APIRequest]>

Exposes API that can be used for the Web API testing.

## property: Playwright.selectors
* since: v1.8
- type: <[Selectors]>

Selectors can be used to install custom selector engines. See
[extensibility](../extensibility.md) for more information.

## property: Playwright.webkit
* since: v1.8
- type: <[BrowserType]>

This object can be used to launch or connect to WebKit, returning instances of [Browser].
