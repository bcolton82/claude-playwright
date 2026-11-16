# class: Page
* since: v1.8

Page provides methods to interact with a single tab in a [Browser], or an
[extension background page](https://developer.chrome.com/extensions/background_pages) in Chromium. One [Browser]
instance might have multiple [Page] instances.

This example creates a page, navigates it to a URL, and then saves a screenshot:

```js
const { webkit } = require('playwright');  // Or 'chromium' or 'firefox'.

(async () => {
  const browser = await webkit.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
```

The Page class emits various events (described below) which can be handled using any of Node's native
[`EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter) methods, such as `on`, `once` or
`removeListener`.

This example logs a message for a single page `load` event:

```js
page.once('load', () => console.log('Page loaded!'));
```

To unsubscribe from events use the `removeListener` method:

```js
function logRequest(interceptedRequest) {
  console.log('A request was made:', interceptedRequest.url());
}
page.on('request', logRequest);
// Sometime later...
page.removeListener('request', logRequest);
```

## property: Page.clock
* since: v1.45
- type: <[Clock]>

Playwright has ability to mock clock and passage of time.

## event: Page.close
* since: v1.8
- argument: <[Page]>

Emitted when the page closes.

## event: Page.console
* since: v1.8
  - alias-java: consoleMessage
- argument: <[ConsoleMessage]>

Emitted when JavaScript within the page calls one of console API methods, e.g. `console.log` or `console.dir`.

The arguments passed into `console.log` are available on the [ConsoleMessage] event handler argument.

**Usage**

```js
page.on('console', async msg => {
  const values = [];
  for (const arg of msg.args())
    values.push(await arg.jsonValue());
  console.log(...values);
});
await page.evaluate(() => console.log('hello', 5, { foo: 'bar' }));
```

## event: Page.crash
* since: v1.8
- argument: <[Page]>

Emitted when the page crashes. Browser pages might crash if they try to allocate too much memory. When the page crashes,
ongoing and subsequent operations will throw.

The most common way to deal with crashes is to catch an exception:

```js
try {
  // Crash might happen during a click.
  await page.click('button');
  // Or while waiting for an event.
  await page.waitForEvent('popup');
} catch (e) {
  // When the page crashes, exception message contains 'crash'.
}
```

## event: Page.dialog
* since: v1.8
- argument: <[Dialog]>

Emitted when a JavaScript dialog appears, such as `alert`, `prompt`, `confirm` or `beforeunload`. Listener **must** either [`method: Dialog.accept`] or [`method: Dialog.dismiss`] the dialog - otherwise the page will [freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop#never_blocking) waiting for the dialog, and actions like click will never finish.

**Usage**

```js
page.on('dialog', dialog => dialog.accept());
```

:::note
When no [`event: Page.dialog`] or [`event: BrowserContext.dialog`] listeners are present, all dialogs are automatically dismissed.
:::

## event: Page.dialogClosed
* since: v1.63
- argument: <[Dialog]>

Emitted when a JavaScript dialog has been closed, either by [`method: Dialog.accept`], by [`method: Dialog.dismiss`], or manually by the user in the headed browser.

## event: Page.DOMContentLoaded
* since: v1.9
- argument: <[Page]>

Emitted when the JavaScript [`DOMContentLoaded`](https://developer.mozilla.org/en-US/docs/Web/Events/DOMContentLoaded)
event is dispatched.

## event: Page.download
* since: v1.8
- argument: <[Download]>

Emitted when attachment download started. User can access basic file operations on downloaded content via the passed
[Download] instance.

## event: Page.fileChooser
* since: v1.9
- argument: <[FileChooser]>

Emitted when a file chooser is supposed to appear, such as after clicking the  `<input type=file>`. Playwright can
respond to it via setting the input files using [`method: FileChooser.setFiles`] that can be uploaded after that.

```js
page.on('filechooser', async fileChooser => {
  await fileChooser.setFiles(path.join(__dirname, '/tmp/myfile.pdf'));
});
```

## event: Page.frameAttached
* since: v1.9
- argument: <[Frame]>

Emitted when a frame is attached.

## event: Page.frameDetached
* since: v1.9
- argument: <[Frame]>

Emitted when a frame is detached.

## event: Page.frameNavigated
* since: v1.9
- argument: <[Frame]>

Emitted when a frame is navigated to a new url.

## event: Page.load
* since: v1.8
- argument: <[Page]>

Emitted when the JavaScript [`load`](https://developer.mozilla.org/en-US/docs/Web/Events/load) event is dispatched.

## event: Page.pageError
* since: v1.9
- argument: <[Error]>

Emitted when an uncaught exception happens within the page.

```js
// Log all uncaught errors to the terminal
page.on('pageerror', exception => {
  console.log(`Uncaught exception: "${exception}"`);
});

// Navigate to a page with an exception.
await page.goto('data:text/html,<script>throw new Error("Test")</script>');
```

## event: Page.popup
* since: v1.8
- argument: <[Page]>

Emitted when the page opens a new tab or window. This event is emitted in addition to the
[`event: BrowserContext.page`], but only for popups relevant to this page.

The earliest moment that page is available is when it has navigated to the initial url. For example, when opening a
popup with `window.open('http://example.com')`, this event will fire when the network request to "http://example.com" is
done and its response has started loading in the popup. If you would like to route/listen to this network request, use [`method: BrowserContext.route`] and [`event: BrowserContext.request`] respectively instead of similar methods on the [Page].

```js
// Start waiting for popup before clicking. Note no await.
const popupPromise = page.waitForEvent('popup');
await page.getByText('open the popup').click();
const popup = await popupPromise;
console.log(await popup.evaluate('location.href'));
```

:::note
Use [`method: Page.waitForLoadState`] to wait until the page gets to a particular state (you should not need it in most
cases).
:::

## event: Page.request
* since: v1.8
- argument: <[Request]>

Emitted when a page issues a request. The [request] object is read-only. In order to intercept and mutate requests, see
[`method: Page.route`] or [`method: BrowserContext.route`].

## event: Page.requestFailed
* since: v1.9
- argument: <[Request]>

Emitted when a request fails, for example by timing out.

```js
page.on('requestfailed', request => {
  console.log(request.url() + ' ' + request.failure().errorText);
});
```

:::note
HTTP Error responses, such as 404 or 503, are still successful responses from HTTP standpoint, so request will complete
with [`event: Page.requestFinished`] event and not with [`event: Page.requestFailed`]. A request will only be considered
failed when the client cannot get an HTTP response from the server, e.g. due to network error net::ERR_FAILED.
:::

## event: Page.requestFinished
* since: v1.9
- argument: <[Request]>

Emitted when a request finishes successfully after downloading the response body. For a successful response, the
sequence of events is `request`, `response` and `requestfinished`.

## event: Page.response
* since: v1.8
- argument: <[Response]>

Emitted when [response] status and headers are received for a request. For a successful response, the sequence of events
is `request`, `response` and `requestfinished`.

## event: Page.webSocket
* since: v1.9
- argument: <[WebSocket]>

Emitted when [WebSocket] request is sent.

## event: Page.worker
* since: v1.8
- argument: <[Worker]>

Emitted when a dedicated [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) is spawned by the
page.

## async method: Page.addInitScript
* since: v1.8
- returns: <[Disposable]>

Adds a script which would be evaluated in one of the following scenarios:
* Whenever the page is navigated.
* Whenever the child frame is attached or navigated. In this case, the script is evaluated in the context of the newly
  attached frame.

The script is evaluated after the document was created but before any of its scripts were run. This is useful to amend
the JavaScript environment, e.g. to seed `Math.random`.

**Usage**

An example of overriding `Math.random` before the page loads:

```js browser
// preload.js
Math.random = () => 42;
```

```js
// In your playwright script, assuming the preload.js file is in same directory
await page.addInitScript({ path: './preload.js' });
```

```js
await page.addInitScript(mock => {
  window.mock = mock;
}, mock);
```

:::note
The order of evaluation of multiple scripts installed via [`method: BrowserContext.addInitScript`] and
[`method: Page.addInitScript`] is not defined.
:::

### param: Page.addInitScript.script
* since: v1.8
- `script` <[function]|[string]|[Object]>
  - `path` ?<[path]> Path to the JavaScript file. If `path` is a relative path, then it is resolved relative to the
    current working directory. Optional.
  - `content` ?<[string]> Raw script content. Optional.

Script to be evaluated in the page.

### param: Page.addInitScript.arg
* since: v1.8
- `arg` ?<[Serializable]>

Optional argument to pass to [`param: script`] (only supported when passing a function).

### option: Page.addInitScript.exposeFunctions = %%-js-init-script-expose-functions-%%
* since: v1.62

## async method: Page.addScriptTag
* since: v1.8
- returns: <[ElementHandle]>

Adds a `<script>` tag into the page with the desired url or content. Returns the added tag when the script's onload
fires or when the script content was injected into frame.

### option: Page.addScriptTag.url
* since: v1.8
- `url` <[string]>

URL of a script to be added.

### option: Page.addScriptTag.path
* since: v1.8
- `path` <[path]>

Path to the JavaScript file to be injected into frame. If `path` is a relative path, then it is resolved relative to the
current working directory.

### option: Page.addScriptTag.content
* since: v1.8
- `content` <[string]>

Raw JavaScript content to be injected into frame.

### option: Page.addScriptTag.type
* since: v1.8
- `type` <[string]>

Script type. Use 'module' in order to load a JavaScript ES6 module. See
[script](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) for more details.

## async method: Page.addStyleTag
* since: v1.8
- returns: <[ElementHandle]>

Adds a `<link rel="stylesheet">` tag into the page with the desired url or a `<style type="text/css">` tag with the
content. Returns the added tag when the stylesheet's onload fires or when the CSS content was injected into frame.

### option: Page.addStyleTag.url
* since: v1.8
- `url` <[string]>

URL of the `<link>` tag.

### option: Page.addStyleTag.path
* since: v1.8
- `path` <[path]>

Path to the CSS file to be injected into frame. If `path` is a relative path, then it is resolved relative to the
current working directory.

### option: Page.addStyleTag.content
* since: v1.8
- `content` <[string]>

Raw CSS content to be injected into frame.

## async method: Page.bringToFront
* since: v1.8

Brings page to front (activates tab).

## async method: Page.cancelPickLocator
* since: v1.59

Cancels an ongoing [`method: Page.pickLocator`] call by deactivating pick locator mode.
If no pick locator mode is active, this method is a no-op.

## async method: Page.check
* since: v1.8
* discouraged: Use locator-based [`method: Locator.check`] instead. Read more about [locators](../locators.md).

This method checks an element matching [`param: selector`] by performing the following steps:
1. Find an element matching [`param: selector`]. If there is none, wait until a matching element is attached to
   the DOM.
1. Ensure that matched element is a checkbox or a radio input. If not, this method throws. If the element is already
   checked, this method returns immediately.
1. Wait for [actionability](../actionability.md) checks on the matched element, unless [`option: force`] option is
   set. If the element is detached during the checks, the whole action is retried.
1. Scroll the element into view if needed.
1. Use [`property: Page.mouse`] to click in the center of the element.
1. Ensure that the element is now checked. If not, this method throws.

When all steps combined have not finished during the specified [`option: timeout`], this method throws a
[TimeoutError]. Passing zero timeout disables this.

### param: Page.check.selector = %%-input-selector-%%
* since: v1.8

### option: Page.check.force = %%-input-force-%%
* since: v1.8

### option: Page.check.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.check.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.check.position = %%-input-position-%%
* since: v1.11

### option: Page.check.strict = %%-input-strict-%%
* since: v1.14

### option: Page.check.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.check.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.check.signal = %%-input-signal-%%

### option: Page.check.trial = %%-input-trial-%%
* since: v1.11

## async method: Page.click
* since: v1.8
* discouraged: Use locator-based [`method: Locator.click`] instead. Read more about [locators](../locators.md).

This method clicks an element matching [`param: selector`] by performing the following steps:
1. Find an element matching [`param: selector`]. If there is none, wait until a matching element is attached to
   the DOM.
1. Wait for [actionability](../actionability.md) checks on the matched element, unless [`option: force`] option is
   set. If the element is detached during the checks, the whole action is retried.
1. Scroll the element into view if needed.
1. Use [`property: Page.mouse`] to click in the center of the element, or the specified [`option: position`].
1. Wait for initiated navigations to either succeed or fail, unless [`option: noWaitAfter`] option is set.

When all steps combined have not finished during the specified [`option: timeout`], this method throws a
[TimeoutError]. Passing zero timeout disables this.

### param: Page.click.selector = %%-input-selector-%%
* since: v1.8

### option: Page.click.button = %%-input-button-%%
* since: v1.8

### option: Page.click.clickCount = %%-input-click-count-%%
* since: v1.8

### option: Page.click.delay = %%-input-down-up-delay-%%
* since: v1.8

### option: Page.click.force = %%-input-force-%%
* since: v1.8

### option: Page.click.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.click.modifiers = %%-input-modifiers-%%
* since: v1.8

### option: Page.click.noWaitAfter = %%-input-no-wait-after-%%
* since: v1.8

### option: Page.click.position = %%-input-position-%%
* since: v1.8

### option: Page.click.strict = %%-input-strict-%%
* since: v1.14

### option: Page.click.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.click.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.click.signal = %%-input-signal-%%

### option: Page.click.trial = %%-input-trial-with-modifiers-%%
* since: v1.11

## async method: Page.close
* since: v1.8

If [`option: runBeforeUnload`] is `false`, does not run any unload handlers and waits for the page to be closed. If
[`option: runBeforeUnload`] is `true` the method will run unload handlers, but will **not** wait for the page to close.

By default, `page.close()` **does not** run `beforeunload` handlers.

:::note
if [`option: runBeforeUnload`] is passed as true, a `beforeunload` dialog might be summoned and should be handled
manually via [`event: Page.dialog`] event.
:::

### option: Page.close.reason
* since: v1.40
- `reason` <[string]>

The reason to be reported to the operations interrupted by the page closure.

### option: Page.close.runBeforeUnload
* since: v1.8
- `runBeforeUnload` <[boolean]>

Defaults to `false`. Whether to run the
[before unload](https://developer.mozilla.org/en-US/docs/Web/Events/beforeunload) page handlers.

## async method: Page.content
* since: v1.8
- returns: <[string]>

Gets the full HTML contents of the page, including the doctype.

### option: Page.content.includeShadow = %%-content-option-include-shadow-%%
* since: v1.64

## method: Page.context
* since: v1.8
- returns: <[BrowserContext]>

Get the browser context that the page belongs to.

## property: Page.coverage
* since: v1.8
- type: <[Coverage]>

:::note
Only available for Chromium atm.
:::

Browser-specific Coverage implementation. See [Coverage](./class-coverage) for more details.

## async method: Page.dblclick
* since: v1.8
* discouraged: Use locator-based [`method: Locator.dblclick`] instead. Read more about [locators](../locators.md).
  - alias-csharp: DblClickAsync

This method double clicks an element matching [`param: selector`] by performing the following steps:
1. Find an element matching [`param: selector`]. If there is none, wait until a matching element is attached to
   the DOM.
1. Wait for [actionability](../actionability.md) checks on the matched element, unless [`option: force`] option is
   set. If the element is detached during the checks, the whole action is retried.
1. Scroll the element into view if needed.
1. Use [`property: Page.mouse`] to double click in the center of the element, or the specified [`option: position`].

When all steps combined have not finished during the specified [`option: timeout`], this method throws a
[TimeoutError]. Passing zero timeout disables this.

:::note
`page.dblclick()` dispatches two `click` events and a single `dblclick` event.
:::

### param: Page.dblclick.selector = %%-input-selector-%%
* since: v1.8

### option: Page.dblclick.button = %%-input-button-%%
* since: v1.8

### option: Page.dblclick.force = %%-input-force-%%
* since: v1.8

### option: Page.dblclick.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.dblclick.delay = %%-input-down-up-delay-%%
* since: v1.8

### option: Page.dblclick.modifiers = %%-input-modifiers-%%
* since: v1.8

### option: Page.dblclick.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.dblclick.position = %%-input-position-%%
* since: v1.8

### option: Page.dblclick.strict = %%-input-strict-%%
* since: v1.14

### option: Page.dblclick.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.dblclick.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.dblclick.signal = %%-input-signal-%%

### option: Page.dblclick.trial = %%-input-trial-with-modifiers-%%
* since: v1.11

## async method: Page.dispatchEvent
* since: v1.8
* discouraged: Use locator-based [`method: Locator.dispatchEvent`] instead. Read more about [locators](../locators.md).

The snippet below dispatches the `click` event on the element. Regardless of the visibility state of the element, `click`
is dispatched. This is equivalent to calling
[element.click()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/click).

**Usage**

```js
await page.dispatchEvent('button#submit', 'click');
```

Under the hood, it creates an instance of an event based on the given [`param: type`], initializes it with
[`param: eventInit`] properties and dispatches it on the element. Events are `composed`, `cancelable` and bubble by
default.

Since [`param: eventInit`] is event-specific, please refer to the events documentation for the lists of initial
properties:
* [DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/DeviceMotionEvent)
* [DeviceOrientationEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/DeviceOrientationEvent)
* [DragEvent](https://developer.mozilla.org/en-US/docs/Web/API/DragEvent/DragEvent)
* [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event/Event)
* [FocusEvent](https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent/FocusEvent)
* [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/KeyboardEvent)
* [MouseEvent](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent)
* [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/PointerEvent)
* [TouchEvent](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent/TouchEvent)
* [WheelEvent](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/WheelEvent)

You can also specify `JSHandle` as the property value if you want live objects to be passed into the event:

```js
// Note you can only create DataTransfer in Chromium and Firefox
const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
await page.dispatchEvent('#source', 'dragstart', { dataTransfer });
```

### param: Page.dispatchEvent.selector = %%-input-selector-%%
* since: v1.8

### param: Page.dispatchEvent.type
* since: v1.8
- `type` <[string]>

DOM event type: `"click"`, `"dragstart"`, etc.

### param: Page.dispatchEvent.eventInit
* since: v1.8
- `eventInit` ?<[EvaluationArgument]>

Optional event-specific initialization properties.

### option: Page.dispatchEvent.strict = %%-input-strict-%%
* since: v1.14

### option: Page.dispatchEvent.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.dispatchEvent.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.dispatchEvent.signal = %%-input-signal-%%

## async method: Page.dragAndDrop
* since: v1.13

This method drags the source element to the target element.
It will first move to the source element, perform a `mousedown`,
then move to the target element and perform a `mouseup`.

**Usage**

```js
await page.dragAndDrop('#source', '#target');
// or specify exact positions relative to the top-left corners of the elements:
await page.dragAndDrop('#source', '#target', {
  sourcePosition: { x: 34, y: 7 },
  targetPosition: { x: 10, y: 20 },
});
```

### param: Page.dragAndDrop.source = %%-input-source-%%
* since: v1.13

### param: Page.dragAndDrop.target = %%-input-target-%%
* since: v1.13

### option: Page.dragAndDrop.force = %%-input-force-%%
* since: v1.13

### option: Page.dragAndDrop.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.dragAndDrop.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.13

### option: Page.dragAndDrop.strict = %%-input-strict-%%
* since: v1.14

### option: Page.dragAndDrop.timeout = %%-input-timeout-%%
* since: v1.13

### option: Page.dragAndDrop.timeout = %%-input-timeout-js-%%
* since: v1.13

### option: Page.dragAndDrop.signal = %%-input-signal-%%

### option: Page.dragAndDrop.trial = %%-input-trial-%%
* since: v1.13

### option: Page.dragAndDrop.sourcePosition = %%-input-source-position-%%
* since: v1.14

### option: Page.dragAndDrop.targetPosition = %%-input-target-position-%%
* since: v1.14

### option: Page.dragAndDrop.steps = %%-input-drag-steps-%%
* since: v1.57

## async method: Page.emulateMedia
* since: v1.8

This method changes the `CSS media type` through the `media` argument, and/or the `'prefers-colors-scheme'` media feature, using the `colorScheme` argument.

**Usage**

```js
await page.evaluate(() => matchMedia('screen').matches);
// → true
await page.evaluate(() => matchMedia('print').matches);
// → false

await page.emulateMedia({ media: 'print' });
await page.evaluate(() => matchMedia('screen').matches);
// → false
await page.evaluate(() => matchMedia('print').matches);
// → true

await page.emulateMedia({});
await page.evaluate(() => matchMedia('screen').matches);
// → true
await page.evaluate(() => matchMedia('print').matches);
// → false
```

```js
await page.emulateMedia({ colorScheme: 'dark' });
await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
// → true
await page.evaluate(() => matchMedia('(prefers-color-scheme: light)').matches);
// → false
```

### option: Page.emulateMedia.media
* since: v1.9
- `media` "Media" <null|"screen"|"print">

Changes the CSS media type of the page. The only allowed values are `'screen'`, `'print'` and `null`.
Passing `null` disables CSS media emulation.

### option: Page.emulateMedia.colorScheme
* since: v1.9
- `colorScheme` "ColorScheme" <null|"light"|"dark"|"no-preference">

Emulates [prefers-colors-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media feature, supported values are `'light'` and `'dark'`. Passing
`null` disables color scheme emulation. `'no-preference'` is deprecated.

### option: Page.emulateMedia.reducedMotion
* since: v1.12
- `reducedMotion` "ReducedMotion" <null|"reduce"|"no-preference">

Emulates `'prefers-reduced-motion'` media feature, supported values are `'reduce'`, `'no-preference'`. Passing `null` disables reduced motion emulation.

### option: Page.emulateMedia.forcedColors
* since: v1.15
- `forcedColors` "ForcedColors" <null|"active"|"none">

Emulates `'forced-colors'` media feature, supported values are `'active'` and `'none'`. Passing `null` disables forced colors emulation.

### option: Page.emulateMedia.contrast
* since: v1.51
- `contrast` "Contrast" <null|"no-preference"|"more">

Emulates `'prefers-contrast'` media feature, supported values are `'no-preference'`, `'more'`. Passing `null` disables contrast emulation.

## async method: Page.evalOnSelector
* since: v1.9
* discouraged: This method does not wait for the element to pass actionability
  checks and therefore can lead to the flaky tests. Use [`method: Locator.evaluate`],
  other [Locator] helper methods or web-first assertions instead.
  - alias-python: eval_on_selector
  - alias-js: $eval
- returns: <[Serializable]>

The method finds an element matching the specified selector within the page and passes it as a first argument to
[`param: expression`]. If no elements match the selector, the method throws an error. Returns the value of
[`param: expression`].

If [`param: expression`] returns a [Promise], then [`method: Page.evalOnSelector`] would wait for the promise to resolve and
return its value.

**Usage**

```js
const searchValue = await page.$eval('#search', el => el.value);
const preloadHref = await page.$eval('link[rel=preload]', el => el.href);
const html = await page.$eval('.main-container', (e, suffix) => e.outerHTML + suffix, 'hello');
// In TypeScript, this example requires an explicit type annotation (HTMLLinkElement) on el:
const preloadHrefTS = await page.$eval('link[rel=preload]', (el: HTMLLinkElement) => el.href);
```

### param: Page.evalOnSelector.selector = %%-query-selector-%%
* since: v1.9

### param: Page.evalOnSelector.expression = %%-evaluate-expression-%%
* since: v1.9

### param: Page.evalOnSelector.expression = %%-js-evalonselector-pagefunction-%%
* since: v1.9

### param: Page.evalOnSelector.arg
* since: v1.9
- `arg` ?<[EvaluationArgument]>

Optional argument to pass to [`param: expression`].

### option: Page.evalOnSelector.strict = %%-input-strict-%%
* since: v1.14

## async method: Page.evalOnSelectorAll
* since: v1.9
* discouraged: In most cases, [`method: Locator.evaluateAll`],
  other [Locator] helper methods and web-first assertions do a better job.
  - alias-python: eval_on_selector_all
  - alias-js: $$eval
- returns: <[Serializable]>

The method finds all elements matching the specified selector within the page and passes an array of matched elements as
a first argument to [`param: expression`]. Returns the result of [`param: expression`] invocation.

If [`param: expression`] returns a [Promise], then [`method: Page.evalOnSelectorAll`] would wait for the promise to resolve and
return its value.

**Usage**

```js
const divCounts = await page.$$eval('div', (divs, min) => divs.length >= min, 10);
```

### param: Page.evalOnSelectorAll.selector = %%-query-selector-%%
* since: v1.9

### param: Page.evalOnSelectorAll.expression = %%-evaluate-expression-%%
* since: v1.9

### param: Page.evalOnSelectorAll.expression = %%-js-evalonselectorall-pagefunction-%%
* since: v1.9

### param: Page.evalOnSelectorAll.arg
* since: v1.9
- `arg` ?<[EvaluationArgument]>

Optional argument to pass to [`param: expression`].

## async method: Page.evaluate
* since: v1.8
- returns: <[Serializable]>

Returns the value of the [`param: expression`] invocation.

If the function passed to the [`method: Page.evaluate`] returns a [Promise], then [`method: Page.evaluate`] would wait
for the promise to resolve and return its value.

If the function passed to the [`method: Page.evaluate`] returns a non-[Serializable] value, then
[`method: Page.evaluate`] resolves to `undefined`. Playwright also supports transferring some
additional values that are not serializable by `JSON`: `-0`, `NaN`, `Infinity`, `-Infinity`.

**Usage**

Passing argument to [`param: expression`]:

```js
const result = await page.evaluate(([x, y]) => {
  return Promise.resolve(x * y);
}, [7, 8]);
console.log(result); // prints "56"
```

A string can also be passed in instead of a function:

```js
console.log(await page.evaluate('1 + 2')); // prints "3"
const x = 10;
console.log(await page.evaluate(`1 + ${x}`)); // prints "11"
```

[ElementHandle] instances can be passed as an argument to the [`method: Page.evaluate`]:

```js
const bodyHandle = await page.evaluateHandle('document.body');
const html = await page.evaluate<string, HTMLElement>(([body, suffix]) =>
  body.innerHTML + suffix, [bodyHandle, 'hello']
);
await bodyHandle.dispose();
```

### param: Page.evaluate.expression = %%-evaluate-expression-%%
* since: v1.8

### param: Page.evaluate.expression = %%-js-evaluate-pagefunction-%%
* since: v1.8

### param: Page.evaluate.arg
* since: v1.8
- `arg` ?<[EvaluationArgument]>

Optional argument to pass to [`param: expression`].

### option: Page.evaluate.exposeFunctions = %%-js-evaluate-expose-functions-%%
* since: v1.62

## async method: Page.evaluateHandle
* since: v1.8
- returns: <[JSHandle]>

Returns the value of the [`param: expression`] invocation as a [JSHandle].

The only difference between [`method: Page.evaluate`] and [`method: Page.evaluateHandle`] is that [`method: Page.evaluateHandle`] returns [JSHandle].

If the function passed to the [`method: Page.evaluateHandle`] returns a [Promise], then [`method: Page.evaluateHandle`] would wait for the
promise to resolve and return its value.

**Usage**

```js
// Handle for the window object.
const aWindowHandle = await page.evaluateHandle(() => Promise.resolve(window));
```

A string can also be passed in instead of a function:

```js
const aHandle = await page.evaluateHandle('document'); // Handle for the 'document'
```

[JSHandle] instances can be passed as an argument to the [`method: Page.evaluateHandle`]:

```js
const aHandle = await page.evaluateHandle(() => document.body);
const resultHandle = await page.evaluateHandle(body => body.innerHTML, aHandle);
console.log(await resultHandle.jsonValue());
await resultHandle.dispose();
```

### param: Page.evaluateHandle.expression = %%-evaluate-expression-%%
* since: v1.8

### param: Page.evaluateHandle.expression = %%-js-evaluate-pagefunction-%%
* since: v1.8

### param: Page.evaluateHandle.arg
* since: v1.8
- `arg` ?<[EvaluationArgument]>

Optional argument to pass to [`param: expression`].

### option: Page.evaluateHandle.exposeFunctions = %%-js-evaluate-expose-functions-%%
* since: v1.62

## async method: Page.exposeBinding
* since: v1.8
- returns: <[Disposable]>

The method adds a function called [`param: name`] on the `window` object of every frame in this page. When called, the
function executes [`param: callback`] and returns a [Promise] which resolves to the return value of [`param: callback`].
If the [`param: callback`] returns a [Promise], it will be awaited.

The first argument of the [`param: callback`] function contains information about the caller: `{ browserContext:
BrowserContext, page: Page, frame: Frame }`.

See [`method: BrowserContext.exposeBinding`] for the context-wide version.

:::note
Functions installed via [`method: Page.exposeBinding`] survive navigations.
:::

**Usage**

An example of exposing page URL to all frames in a page:

```js
const { webkit } = require('playwright');  // Or 'chromium' or 'firefox'.

(async () => {
  const browser = await webkit.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.exposeBinding('pageURL', ({ page }) => page.url());
  await page.setContent(`
    <script>
      async function onClick() {
        document.querySelector('div').textContent = await window.pageURL();
      }
    </script>
    <button onclick="onClick()">Click me</button>
    <div></div>
  `);
  await page.click('button');
})();
```

### param: Page.exposeBinding.name
* since: v1.8
- `name` <[string]>

Name of the function on the window object.

### param: Page.exposeBinding.callback
* since: v1.8
- `callback` "BindingCallback" <[function]>

Callback function that will be called in the Playwright's context.

## async method: Page.exposeFunction
* since: v1.8
- returns: <[Disposable]>

The method adds a function called [`param: name`] on the `window` object of every frame in the page. When called, the
function executes [`param: callback`] and returns a [Promise] which resolves to the return value of [`param: callback`].

If the [`param: callback`] returns a [Promise], it will be awaited.

See [`method: BrowserContext.exposeFunction`] for context-wide exposed function.

:::note
Functions installed via [`method: Page.exposeFunction`] survive navigations.
:::

**Usage**

An example of adding a `sha256` function to the page:

```js
const { webkit } = require('playwright');  // Or 'chromium' or 'firefox'.
const crypto = require('crypto');

(async () => {
  const browser = await webkit.launch({ headless: false });
  const page = await browser.newPage();
  await page.exposeFunction('sha256', text =>
    crypto.createHash('sha256').update(text).digest('hex'),
  );
  await page.setContent(`
    <script>
      async function onClick() {
        document.querySelector('div').textContent = await window.sha256('PLAYWRIGHT');
      }
    </script>
    <button onclick="onClick()">Click me</button>
    <div></div>
  `);
  await page.click('button');
})();
```

### param: Page.exposeFunction.name
* since: v1.8
- `name` <[string]>

Name of the function on the window object

### param: Page.exposeFunction.callback
* since: v1.8
- `callback` "FunctionCallback" <[function]>

Callback function which will be called in Playwright's context.

## async method: Page.fill
* since: v1.8
* discouraged: Use locator-based [`method: Locator.fill`] instead. Read more about [locators](../locators.md).

This method waits for an element matching [`param: selector`], waits for [actionability](../actionability.md) checks, focuses the element, fills it and triggers an `input` event after filling. Note that you can pass an empty string to clear the input field.

If the target element is not an `<input>`, `<textarea>` or `[contenteditable]` element, this method throws an error. However, if the element is inside the `<label>` element that has an associated [control](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control), the control will be filled instead.

To send fine-grained keyboard events, use [`method: Locator.pressSequentially`].

### param: Page.fill.selector = %%-input-selector-%%
* since: v1.8

### param: Page.fill.value
* since: v1.8
- `value` <[string]>

Value to fill for the `<input>`, `<textarea>` or `[contenteditable]` element.

### option: Page.fill.force = %%-input-force-%%
* since: v1.13

### option: Page.fill.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.fill.strict = %%-input-strict-%%
* since: v1.14

### option: Page.fill.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.fill.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.fill.signal = %%-input-signal-%%

## async method: Page.focus
* since: v1.8
* discouraged: Use locator-based [`method: Locator.focus`] instead. Read more about [locators](../locators.md).

This method fetches an element with [`param: selector`] and focuses it. If there's no element matching
[`param: selector`], the method waits until a matching element appears in the DOM.

### param: Page.focus.selector = %%-input-selector-%%
* since: v1.8

### option: Page.focus.strict = %%-input-strict-%%
* since: v1.14

### option: Page.focus.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.focus.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.focus.signal = %%-input-signal-%%

## method: Page.frame
* since: v1.8
- returns: <[null]|[Frame]>

Returns frame matching the specified criteria. Either `name` or `url` must be specified.

**Usage**

```js
const frame = page.frame('frame-name');
```

```js
const frame = page.frame({ url: /.*domain.*/ });
```

### param: Page.frame.frameSelector
* since: v1.8
- `frameSelector` <[string]|[Object]>
  - `name` ?<[string]> Frame name specified in the `iframe`'s `name` attribute. Optional.
  - `url` ?<[string]|[RegExp]|[URLPattern]|[function]\([URL]\):[boolean]> A glob pattern, regex pattern, URL pattern, or predicate receiving
    frame's `url` as a [URL] object. Optional.

Frame name or other frame lookup options.

## method: Page.frameLocator
* since: v1.17
- returns: <[FrameLocator]>

When working with iframes, you can create a frame locator that will enter the iframe and allow selecting elements
in that iframe.

When called without [`param: selector`], the search starts in any frame on the page - the main frame or any of
the iframes - so that you don't need to locate each iframe first. Note that the rest of the locator is resolved
inside a single frame, just like any other locator. If it matches elements inside multiple frames, an error is thrown.

**Usage**

Following snippet locates element with text "Submit" in the iframe with id `my-frame`,
like `<iframe id="my-frame">`:

```js
const locator = page.frameLocator('#my-iframe').getByText('Submit');
await locator.click();
```

Following snippet locates a button, either in the main frame or in one of the iframes:

```js
const locator = page.frameLocator().getByRole('button');
await locator.click();
```

### param: Page.frameLocator.selector
* since: v1.17
- `selector` ?<[string]>

A selector that matches the frame element. When not specified, locator is matched in any frame on the page.

## method: Page.frames
* since: v1.8
- returns: <[Array]<[Frame]>>

An array of all frames attached to the page.

## async method: Page.getAttribute
* since: v1.8
* discouraged: Use locator-based [`method: Locator.getAttribute`] instead. Read more about [locators](../locators.md).
- returns: <[null]|[string]>

Returns element attribute value.

### param: Page.getAttribute.selector = %%-input-selector-%%
* since: v1.8

### param: Page.getAttribute.name
* since: v1.8
- `name` <[string]>

Attribute name to get the value for.

### option: Page.getAttribute.strict = %%-input-strict-%%
* since: v1.14

### option: Page.getAttribute.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.getAttribute.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.getAttribute.signal = %%-input-signal-%%

## method: Page.getByAltText
* since: v1.27
- returns: <[Locator]>

%%-template-locator-get-by-alt-text-%%

### param: Page.getByAltText.text = %%-locator-get-by-text-text-%%

### option: Page.getByAltText.exact = %%-locator-get-by-text-exact-%%

## method: Page.getByLabel
* since: v1.27
- returns: <[Locator]>

%%-template-locator-get-by-label-text-%%

### param: Page.getByLabel.text = %%-locator-get-by-text-text-%%

### option: Page.getByLabel.exact = %%-locator-get-by-text-exact-%%

## method: Page.getByPlaceholder
* since: v1.27
- returns: <[Locator]>

%%-template-locator-get-by-placeholder-text-%%

### param: Page.getByPlaceholder.text = %%-locator-get-by-text-text-%%

### option: Page.getByPlaceholder.exact = %%-locator-get-by-text-exact-%%

## method: Page.getByRef
* since: v1.64
- returns: <[Locator]>

Locate element by its aria ref. Refs like `[ref=e2]` are reported by [`method: Page.ariaSnapshot`] when called with
the `"ai"` mode, and resolve against the latest snapshot taken in the element's frame.

**Usage**

Consider the following aria snapshot.

```yaml
- button "Submit" [ref=e2]
```

You can locate the button by its ref:

```js
await page.getByRef('e2').click();
```

### param: Page.getByRef.ref
* since: v1.64
- `ref` <[string]>

Aria ref of the element, for example `e2` or `f1e3`.

## method: Page.getByRole
* since: v1.27
- returns: <[Locator]>

%%-template-locator-get-by-role-%%

### param: Page.getByRole.role = %%-get-by-role-to-have-role-role-%%
* since: v1.27

### option: Page.getByRole.-inline- = %%-locator-get-by-role-option-list-v1.27-%%
* since: v1.27

### option: Page.getByRole.exact = %%-locator-get-by-role-option-exact-%%

### option: Page.getByRole.description = %%-locator-get-by-role-option-description-%%

## method: Page.getByTestId
* since: v1.27
- returns: <[Locator]>

%%-template-locator-get-by-test-id-%%

### param: Page.getByTestId.testId = %%-locator-get-by-test-id-test-id-%%
* since: v1.27

## method: Page.getByText
* since: v1.27
- returns: <[Locator]>

%%-template-locator-get-by-text-%%

### param: Page.getByText.text = %%-locator-get-by-text-text-%%

### option: Page.getByText.exact = %%-locator-get-by-text-exact-%%

## method: Page.getByTitle
* since: v1.27
- returns: <[Locator]>

%%-template-locator-get-by-title-%%

### param: Page.getByTitle.text = %%-locator-get-by-text-text-%%

### option: Page.getByTitle.exact = %%-locator-get-by-text-exact-%%

## async method: Page.goBack
* since: v1.8
- returns: <[null]|[Response]>

Returns the main resource response. In case of multiple redirects, the navigation will resolve with the response of the
last redirect. If cannot go back, returns `null`.

Navigate to the previous page in history.

:::warning
**Testing Back/Forward Cache (BFCache) is not supported.**
By default, Playwright disables the Back/Forward Cache across all browsers. Even if explicitly enabled, Playwright's internal state relies on network-level navigation events. Because BFCache restores unfreeze the DOM without firing these events, using `page.goBack()` or `page.goForward()` to trigger a BFCache restore will result in timeouts and a desynchronized `Page` state.
:::

### option: Page.goBack.waitUntil = %%-navigation-wait-until-%%
* since: v1.8

### option: Page.goBack.timeout = %%-navigation-timeout-%%
* since: v1.8

### option: Page.goBack.timeout = %%-navigation-timeout-js-%%
* since: v1.8

### option: Page.goBack.signal = %%-input-signal-%%

## async method: Page.goForward
* since: v1.8
- returns: <[null]|[Response]>

Returns the main resource response. In case of multiple redirects, the navigation will resolve with the response of the
last redirect. If cannot go forward, returns `null`.

Navigate to the next page in history.

:::warning
**Testing Back/Forward Cache (BFCache) is not supported.**
By default, Playwright disables the Back/Forward Cache across all browsers. Even if explicitly enabled, Playwright's internal state relies on network-level navigation events. Because BFCache restores unfreeze the DOM without firing these events, using `page.goBack()` or `page.goForward()` to trigger a BFCache restore will result in timeouts and a desynchronized `Page` state.
:::

## async method: Page.requestGC
* since: v1.48

Request the page to perform garbage collection. Note that there is no guarantee that all unreachable objects will be collected.

This is useful to help detect memory leaks. For example, if your page has a large object `'suspect'` that might be leaked, you can check that it does not leak by using a [`WeakRef`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef).

```js
// 1. In your page, save a WeakRef for the "suspect".
await page.evaluate(() => globalThis.suspectWeakRef = new WeakRef(suspect));
// 2. Request garbage collection.
await page.requestGC();
// 3. Check that weak ref does not deref to the original object.
expect(await page.evaluate(() => !globalThis.suspectWeakRef.deref())).toBe(true);
```

### option: Page.goForward.waitUntil = %%-navigation-wait-until-%%
* since: v1.8

### option: Page.goForward.timeout = %%-navigation-timeout-%%
* since: v1.8

### option: Page.goForward.timeout = %%-navigation-timeout-js-%%
* since: v1.8

### option: Page.goForward.signal = %%-input-signal-%%

## async method: Page.goto
* since: v1.8
  - alias-java: navigate
- returns: <[null]|[Response]>

Returns the main resource response. In case of multiple redirects, the navigation will resolve with the first
non-redirect response.

The method will throw an error if:
* there's an SSL error (e.g. in case of self-signed certificates).
* target URL is invalid.
* the [`option: timeout`] is exceeded during navigation.
* the remote server does not respond or is unreachable.
* the main resource failed to load.

The method will not throw an error when any valid HTTP status code is returned by the remote server, including 404 "Not
Found" and 500 "Internal Server Error".  The status code for such responses can be retrieved by calling
[`method: Response.status`].

:::note
The method either throws an error or returns a main resource response. The only exceptions are navigation to
`about:blank` or navigation to the same URL with a different hash, which would succeed and return `null`.
:::

:::note
Headless mode doesn't support navigation to a PDF document. See the
[upstream issue](https://bugs.chromium.org/p/chromium/issues/detail?id=761295).
:::

### param: Page.goto.url
* since: v1.8
- `url` <[string]>

URL to navigate page to. The url should include scheme, e.g. `https://`.
When a [`option: Browser.newContext.baseURL`] via the context options was provided and the passed URL is a path,
it gets merged via the [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL) constructor.

### option: Page.goto.waitUntil = %%-navigation-wait-until-%%
* since: v1.8

### option: Page.goto.timeout = %%-navigation-timeout-%%
* since: v1.8

### option: Page.goto.timeout = %%-navigation-timeout-js-%%
* since: v1.8

### option: Page.goto.signal = %%-input-signal-%%

### option: Page.goto.referer
* since: v1.8
- `referer` <[string]>

Referer header value. If provided it will take preference over the referer header value set by
[`method: Page.setExtraHTTPHeaders`].

## async method: Page.hideHighlight
* since: v1.60

Hide all locator highlight overlays previously added by [`method: Locator.highlight`] on this page.

## async method: Page.hover
* since: v1.8
* discouraged: Use locator-based [`method: Locator.hover`] instead. Read more about [locators](../locators.md).

This method hovers over an element matching [`param: selector`] by performing the following steps:
1. Find an element matching [`param: selector`]. If there is none, wait until a matching element is attached to
   the DOM.
1. Wait for [actionability](../actionability.md) checks on the matched element, unless [`option: force`] option is
   set. If the element is detached during the checks, the whole action is retried.
1. Scroll the element into view if needed.
1. Use [`property: Page.mouse`] to hover over the center of the element, or the specified [`option: position`].

When all steps combined have not finished during the specified [`option: timeout`], this method throws a
[TimeoutError]. Passing zero timeout disables this.

### param: Page.hover.selector = %%-input-selector-%%
* since: v1.8

### option: Page.hover.force = %%-input-force-%%
* since: v1.8

### option: Page.hover.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.hover.modifiers = %%-input-modifiers-%%
* since: v1.8

### option: Page.hover.position = %%-input-position-%%
* since: v1.8

### option: Page.hover.strict = %%-input-strict-%%
* since: v1.14

### option: Page.hover.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.hover.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.hover.signal = %%-input-signal-%%

### option: Page.hover.trial = %%-input-trial-with-modifiers-%%
* since: v1.11

### option: Page.hover.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.28

## async method: Page.innerHTML
* since: v1.8
* discouraged: Use locator-based [`method: Locator.innerHTML`] instead. Read more about [locators](../locators.md).
- returns: <[string]>

Returns `element.innerHTML`.

### param: Page.innerHTML.selector = %%-input-selector-%%
* since: v1.8

### option: Page.innerHTML.strict = %%-input-strict-%%
* since: v1.14

### option: Page.innerHTML.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.innerHTML.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.innerHTML.signal = %%-input-signal-%%

## async method: Page.innerText
* since: v1.8
* discouraged: Use locator-based [`method: Locator.innerText`] instead. Read more about [locators](../locators.md).
- returns: <[string]>

Returns `element.innerText`.

### param: Page.innerText.selector = %%-input-selector-%%
* since: v1.8

### option: Page.innerText.strict = %%-input-strict-%%
* since: v1.14

### option: Page.innerText.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.innerText.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.innerText.signal = %%-input-signal-%%

## async method: Page.inputValue
* since: v1.13
* discouraged: Use locator-based [`method: Locator.inputValue`] instead. Read more about [locators](../locators.md).
- returns: <[string]>

Returns `input.value` for the selected `<input>` or `<textarea>` or `<select>` element.

Throws for non-input elements. However, if the element is inside the `<label>` element that has an associated [control](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control), returns the value of the control.

### param: Page.inputValue.selector = %%-input-selector-%%
* since: v1.13

### option: Page.inputValue.strict = %%-input-strict-%%
* since: v1.14

### option: Page.inputValue.timeout = %%-input-timeout-%%
* since: v1.13

### option: Page.inputValue.timeout = %%-input-timeout-js-%%
* since: v1.13

### option: Page.inputValue.signal = %%-input-signal-%%

## async method: Page.isChecked
* since: v1.8
* discouraged: Use locator-based [`method: Locator.isChecked`] instead. Read more about [locators](../locators.md).
- returns: <[boolean]>

Returns whether the element is checked. Throws if the element is not a checkbox or radio input.

### param: Page.isChecked.selector = %%-input-selector-%%
* since: v1.8

### option: Page.isChecked.strict = %%-input-strict-%%
* since: v1.14

### option: Page.isChecked.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.isChecked.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.isChecked.signal = %%-input-signal-%%

## method: Page.isClosed
* since: v1.8
- returns: <[boolean]>

Indicates that the page has been closed.

## async method: Page.isDisabled
* since: v1.8
* discouraged: Use locator-based [`method: Locator.isDisabled`] instead. Read more about [locators](../locators.md).
- returns: <[boolean]>

Returns whether the element is disabled, the opposite of [enabled](../actionability.md#enabled).

### param: Page.isDisabled.selector = %%-input-selector-%%
* since: v1.8

### option: Page.isDisabled.strict = %%-input-strict-%%
* since: v1.14

### option: Page.isDisabled.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.isDisabled.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.isDisabled.signal = %%-input-signal-%%

## async method: Page.isEditable
* since: v1.8
* discouraged: Use locator-based [`method: Locator.isEditable`] instead. Read more about [locators](../locators.md).
- returns: <[boolean]>

Returns whether the element is [editable](../actionability.md#editable).

### param: Page.isEditable.selector = %%-input-selector-%%
* since: v1.8

### option: Page.isEditable.strict = %%-input-strict-%%
* since: v1.14

### option: Page.isEditable.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.isEditable.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.isEditable.signal = %%-input-signal-%%

## async method: Page.isEnabled
* since: v1.8
* discouraged: Use locator-based [`method: Locator.isEnabled`] instead. Read more about [locators](../locators.md).
- returns: <[boolean]>

Returns whether the element is [enabled](../actionability.md#enabled).

### param: Page.isEnabled.selector = %%-input-selector-%%
* since: v1.8

### option: Page.isEnabled.strict = %%-input-strict-%%
* since: v1.14

### option: Page.isEnabled.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.isEnabled.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.isEnabled.signal = %%-input-signal-%%

## async method: Page.isHidden
* since: v1.8
* discouraged: Use locator-based [`method: Locator.isHidden`] instead. Read more about [locators](../locators.md).
- returns: <[boolean]>

Returns whether the element is hidden, the opposite of [visible](../actionability.md#visible).  [`param: selector`] that does not match any elements is considered hidden.

### param: Page.isHidden.selector = %%-input-selector-%%
* since: v1.8

### option: Page.isHidden.strict = %%-input-strict-%%
* since: v1.14

### option: Page.isHidden.timeout
* since: v1.8
* deprecated: This option is ignored. [`method: Page.isHidden`] does not wait for the
  element to become hidden and returns immediately.
- `timeout` <[float]>

## async method: Page.isVisible
* since: v1.8
* discouraged: Use locator-based [`method: Locator.isVisible`] instead. Read more about [locators](../locators.md).
- returns: <[boolean]>

Returns whether the element is [visible](../actionability.md#visible). [`param: selector`] that does not match any elements is considered not visible.

### param: Page.isVisible.selector = %%-input-selector-%%
* since: v1.8

### option: Page.isVisible.strict = %%-input-strict-%%
* since: v1.14

### option: Page.isVisible.timeout
* since: v1.8
* deprecated: This option is ignored. [`method: Page.isVisible`] does not wait
  for the element to become visible and returns immediately.
- `timeout` <[float]>

## property: Page.keyboard
* since: v1.8
- type: <[Keyboard]>

## async method: Page.clearConsoleMessages
* since: v1.59

Clears all stored console messages from this page. Subsequent calls to [`method: Page.consoleMessages`] will only return messages logged after the clear.

## async method: Page.clearPageErrors
* since: v1.59

Clears all stored page errors from this page. Subsequent calls to [`method: Page.pageErrors`] will only return errors thrown after the clear.

## property: Page.localStorage
* since: v1.61
- type: <[WebStorage]>

Provides access to the page's `localStorage` for the current origin. See [WebStorage].

```js
await page.localStorage.setItem('token', 'abc');
const token = await page.localStorage.getItem('token');
```

## property: Page.sessionStorage
* since: v1.61
- type: <[WebStorage]>

Provides access to the page's `sessionStorage` for the current origin. See [WebStorage].

```js
await page.sessionStorage.setItem('flag', '1');
const flag = await page.sessionStorage.getItem('flag');
```

## async method: Page.consoleMessages
* since: v1.56
- returns: <[Array]<[ConsoleMessage]>>

Returns up to (currently) 200 last console messages from this page. See [`event: Page.console`] for more details.

### option: Page.consoleMessages.filter
* since: v1.59
- `filter` "ConsoleMessagesFilter" <"all"|"since-navigation">

Controls which messages are returned:
- `'since-navigation'` (default) — returns only messages logged after the last committed main-frame navigation.
- `'all'` — returns all stored console messages.

## async method: Page.pageErrors
* since: v1.56
- returns: <[Array]<[Error]>>

Returns up to (currently) 200 last page errors from this page. See [`event: Page.pageError`] for more details.

## method: Page.locator
* since: v1.14
- returns: <[Locator]>

%%-template-locator-root-locator-%%

### param: Page.locator.selector = %%-find-selector-%%
* since: v1.14

### option: Page.locator.-inline- = %%-locator-options-list-v1.14-%%
* since: v1.14

### option: Page.locator.hasNot = %%-locator-option-has-not-%%
* since: v1.33

### option: Page.locator.hasNotText = %%-locator-option-has-not-text-%%
* since: v1.33

## method: Page.mainFrame
* since: v1.8
- returns: <[Frame]>

The page's main frame. Page is guaranteed to have a main frame which persists during navigations.

## property: Page.mouse
* since: v1.8
- type: <[Mouse]>

## async method: Page.opener
* since: v1.8
- returns: <[null]|[Page]>

Returns the opener for popup pages and `null` for others. If the opener has been closed already the returns `null`.

## async method: Page.pause
* since: v1.9

Pauses script execution. Playwright will stop executing the script and wait for the user to either press the 'Resume'
button in the page overlay or to call `playwright.resume()` in the DevTools console.

User can inspect selectors or perform manual steps while paused. Resume will continue running the original script from
the place it was paused.

:::note
This method requires Playwright to be started in a headed mode, with a falsy [`option: BrowserType.launch.headless`] option.
:::

## async method: Page.pdf
* since: v1.8
- returns: <[Buffer]>

Returns the PDF buffer.

`page.pdf()` generates a pdf of the page with `print` css media. To generate a pdf with `screen` media, call
[`method: Page.emulateMedia`] before calling `page.pdf()`:

:::note
By default, `page.pdf()` generates a pdf with modified colors for printing. Use the
[`-webkit-print-color-adjust`](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-print-color-adjust) property to
force rendering of exact colors.
:::

**Usage**

```js
// Generates a PDF with 'screen' media type.
await page.emulateMedia({ media: 'screen' });
await page.pdf({ path: 'page.pdf' });
```

The [`option: width`], [`option: height`], and [`option: margin`] options accept values labeled with units. Unlabeled
values are treated as pixels.

A few examples:
* `page.pdf({width: 100})` - prints with width set to 100 pixels
* `page.pdf({width: '100px'})` - prints with width set to 100 pixels
* `page.pdf({width: '10cm'})` - prints with width set to 10 centimeters.

All possible units are:
* `px` - pixel
* `in` - inch
* `cm` - centimeter
* `mm` - millimeter

The [`option: format`] options are:
* `Letter`: 8.5in x 11in
* `Legal`: 8.5in x 14in
* `Tabloid`: 11in x 17in
* `Ledger`: 17in x 11in
* `A0`: 33.1in x 46.8in
* `A1`: 23.4in x 33.1in
* `A2`: 16.54in x 23.4in
* `A3`: 11.7in x 16.54in
* `A4`: 8.27in x 11.7in
* `A5`: 5.83in x 8.27in
* `A6`: 4.13in x 5.83in

:::note
[`option: headerTemplate`] and [`option: footerTemplate`] markup have the following limitations: > 1. Script tags inside
templates are not evaluated. > 2. Page styles are not visible inside templates.
:::

### option: Page.pdf.path
* since: v1.8
- `path` <[path]>

The file path to save the PDF to. If [`option: path`] is a relative path, then it is resolved relative to the current
working directory. If no path is provided, the PDF won't be saved to the disk.

### option: Page.pdf.scale
* since: v1.8
- `scale` <[float]>

Scale of the webpage rendering. Defaults to `1`. Scale amount must be between 0.1 and 2.

### option: Page.pdf.displayHeaderFooter
* since: v1.8
- `displayHeaderFooter` <[boolean]>

Display header and footer. Defaults to `false`.

### option: Page.pdf.headerTemplate
* since: v1.8
- `headerTemplate` <[string]>

HTML template for the print header. Should be valid HTML markup with following classes used to inject printing values
into them:
* `'date'` formatted print date
* `'title'` document title
* `'url'` document location
* `'pageNumber'` current page number
* `'totalPages'` total pages in the document

### option: Page.pdf.footerTemplate
* since: v1.8
- `footerTemplate` <[string]>

HTML template for the print footer. Should use the same format as the [`option: headerTemplate`].

### option: Page.pdf.printBackground
* since: v1.8
- `printBackground` <[boolean]>

Print background graphics. Defaults to `false`.

### option: Page.pdf.landscape
* since: v1.8
- `landscape` <[boolean]>

Paper orientation. Defaults to `false`.

### option: Page.pdf.pageRanges
* since: v1.8
- `pageRanges` <[string]>

Paper ranges to print, e.g., '1-5, 8, 11-13'. Defaults to the empty string, which means print all pages.

### option: Page.pdf.format
* since: v1.8
- `format` <[string]>

Paper format. If set, takes priority over [`option: width`] or [`option: height`] options. Defaults to 'Letter'.

### option: Page.pdf.width
* since: v1.8
- `width` <[string]|[float]>

Paper width, accepts values labeled with units.

### option: Page.pdf.height
* since: v1.8
- `height` <[string]|[float]>

Paper height, accepts values labeled with units.

### option: Page.pdf.margin
* since: v1.8
- `margin` "PdfMargins" <[Object]>
  - `top` ?<[string]|[float]> Top margin, accepts values labeled with units. Defaults to `0`.
  - `right` ?<[string]|[float]> Right margin, accepts values labeled with units. Defaults to `0`.
  - `bottom` ?<[string]|[float]> Bottom margin, accepts values labeled with units. Defaults to `0`.
  - `left` ?<[string]|[float]> Left margin, accepts values labeled with units. Defaults to `0`.

Paper margins, defaults to none.

### option: Page.pdf.preferCSSPageSize
* since: v1.8
- `preferCSSPageSize` <[boolean]>

Give any CSS `@page` size declared in the page priority over what is declared in [`option: width`] and
[`option: height`] or [`option: format`] options. Defaults to `false`, which will scale the content to fit the paper
size.

### option: Page.pdf.tagged
* since: v1.42
- `tagged` <[boolean]>

Whether or not to generate tagged (accessible) PDF. Defaults to `false`.

### option: Page.pdf.outline
* since: v1.42
- `outline` <[boolean]>

Whether or not to embed the document outline into the PDF. Defaults to `false`.

## async method: Page.pickLocator
* since: v1.59
- returns: <[Locator]>

Enters pick locator mode where hovering over page elements highlights them and shows the corresponding locator.
Once the user clicks an element, the mode is deactivated and the [Locator] for the picked element is returned.

**Usage**

```js
const locator = await page.pickLocator();
console.log(locator);
```

## async method: Page.press
* since: v1.8
* discouraged: Use locator-based [`method: Locator.press`] instead. Read more about [locators](../locators.md).

Focuses the element, and then uses [`method: Keyboard.down`] and [`method: Keyboard.up`].

[`param: key`] can specify the intended
[keyboardEvent.key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) value or a single character to
generate the text for. A superset of the [`param: key`] values can be found
[here](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values). Examples of the keys are:

`F1` - `F12`, `Digit0`- `Digit9`, `KeyA`- `KeyZ`, `Backquote`, `Minus`, `Equal`, `Backslash`, `Backspace`, `Tab`,
`Delete`, `Escape`, `ArrowDown`, `End`, `Enter`, `Home`, `Insert`, `PageDown`, `PageUp`, `ArrowRight`, `ArrowUp`, etc.

Following modification shortcuts are also supported: `Shift`, `Control`, `Alt`, `Meta`, `ShiftLeft`, `ControlOrMeta`.
`ControlOrMeta` resolves to `Control` on Windows and Linux and to `Meta` on macOS.

Holding down `Shift` will type the text that corresponds to the [`param: key`] in the upper case.

If [`param: key`] is a single character, it is case-sensitive, so the values `a` and `A` will generate different
respective texts.

Shortcuts such as `key: "Control+o"`, `key: "Control++` or `key: "Control+Shift+T"` are supported as well. When specified with the
modifier, modifier is pressed and being held while the subsequent key is being pressed.

**Usage**

```js
const page = await browser.newPage();
await page.goto('https://keycode.info');
await page.press('body', 'A');
await page.screenshot({ path: 'A.png' });
await page.press('body', 'ArrowLeft');
await page.screenshot({ path: 'ArrowLeft.png' });
await page.press('body', 'Shift+O');
await page.screenshot({ path: 'O.png' });
await browser.close();
```

### param: Page.press.selector = %%-input-selector-%%
* since: v1.8

### param: Page.press.key
* since: v1.8
- `key` <[string]>

Name of the key to press or a character to generate, such as `ArrowLeft` or `a`.

### option: Page.press.delay
* since: v1.8
- `delay` <[float]>

Time to wait between `keydown` and `keyup` in milliseconds. Defaults to 0.

### option: Page.press.noWaitAfter = %%-input-no-wait-after-%%
* since: v1.8

### option: Page.press.strict = %%-input-strict-%%
* since: v1.14

### option: Page.press.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.press.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.press.signal = %%-input-signal-%%

## async method: Page.querySelector
* since: v1.9
* discouraged: Use locator-based [`method: Page.locator`] instead. Read more about [locators](../locators.md).
  - alias-python: query_selector
  - alias-js: $
- returns: <[null]|[ElementHandle]>

The method finds an element matching the specified selector within the page. If no elements match the selector, the
return value resolves to `null`. To wait for an element on the page, use [`method: Locator.waitFor`].

### param: Page.querySelector.selector = %%-query-selector-%%
* since: v1.9

### option: Page.querySelector.strict = %%-input-strict-%%
* since: v1.14

## async method: Page.querySelectorAll
* since: v1.9
* discouraged: Use locator-based [`method: Page.locator`] instead. Read more about [locators](../locators.md).
  - alias-python: query_selector_all
  - alias-js: $$
- returns: <[Array]<[ElementHandle]>>

The method finds all elements matching the specified selector within the page. If no elements match the selector, the
return value resolves to `[]`.

### param: Page.querySelectorAll.selector = %%-query-selector-%%
* since: v1.9

## async method: Page.requests
* since: v1.56
- returns: <[Array]<[Request]>>

Returns up to (currently) 100 last network request from this page. See [`event: Page.request`] for more details.

Returned requests should be accessed immediately, otherwise they might be collected to prevent unbounded memory growth as new requests come in. Once collected, retrieving most information about the request is impossible.

Note that requests reported through the [`event: Page.request`] request are not collected, so there is a trade off between efficient memory usage with [`method: Page.requests`] and the amount of available information reported through [`event: Page.request`].

## async method: Page.addLocatorHandler
* since: v1.42

When testing a web page, sometimes unexpected overlays like a "Sign up" dialog appear and block actions you want to automate, e.g. clicking a button. These overlays don't always show up in the same way or at the same time, making them tricky to handle in automated tests.

This method lets you set up a special function, called a handler, that activates when it detects that overlay is visible. The handler's job is to remove the overlay, allowing your test to continue as if the overlay wasn't there.

Things to keep in mind:
* When an overlay is shown predictably, we recommend explicitly waiting for it in your test and dismissing it as a part of your normal test flow, instead of using [`method: Page.addLocatorHandler`].
* Playwright checks for the overlay every time before executing or retrying an action that requires an [actionability check](../actionability.md), or before performing an auto-waiting assertion check. When overlay is visible, Playwright calls the handler first, and then proceeds with the action/assertion. Note that the handler is only called when you perform an action/assertion - if the overlay becomes visible but you don't perform any actions, the handler will not be triggered.
* After executing the handler, Playwright will ensure that overlay that triggered the handler is not visible anymore. You can opt-out of this behavior with [`option: noWaitAfter`].
* The execution time of the handler counts towards the timeout of the action/assertion that executed the handler. If your handler takes too long, it might cause timeouts.
* You can register multiple handlers. However, only a single handler will be running at a time. Make sure the actions within a handler don't depend on another handler.

:::warning
Running the handler will alter your page state mid-test. For example it will change the currently focused element and move the mouse. Make sure that actions that run after the handler are self-contained and do not rely on the focus and mouse state being unchanged.

For example, consider a test that calls [`method: Locator.focus`] followed by [`method: Keyboard.press`]. If your handler clicks a button between these two actions, the focused element most likely will be wrong, and key press will happen on the unexpected element. Use [`method: Locator.press`] instead to avoid this problem.

Another example is a series of mouse actions, where [`method: Mouse.move`] is followed by [`method: Mouse.down`]. Again, when the handler runs between these two actions, the mouse position will be wrong during the mouse down. Prefer self-contained actions like [`method: Locator.click`] that do not rely on the state being unchanged by a handler.
:::

**Usage**

An example that closes a "Sign up to the newsletter" dialog when it appears:

```js
// Setup the handler.
await page.addLocatorHandler(page.getByText('Sign up to the newsletter'), async () => {
  await page.getByRole('button', { name: 'No thanks' }).click();
});

// Write the test as usual.
await page.goto('https://example.com');
await page.getByRole('button', { name: 'Start here' }).click();
```

An example that skips the "Confirm your security details" page when it is shown:

```js
// Setup the handler.
await page.addLocatorHandler(page.getByText('Confirm your security details'), async () => {
  await page.getByRole('button', { name: 'Remind me later' }).click();
});

// Write the test as usual.
await page.goto('https://example.com');
await page.getByRole('button', { name: 'Start here' }).click();
```

An example with a custom callback on every actionability check. It uses a `<body>` locator that is always visible, so the handler is called before every actionability check. It is important to specify [`option: noWaitAfter`], because the handler does not hide the `<body>` element.

```js
// Setup the handler.
await page.addLocatorHandler(page.locator('body'), async () => {
  await page.evaluate(() => window.removeObstructionsForTestIfNeeded());
}, { noWaitAfter: true });

// Write the test as usual.
await page.goto('https://example.com');
await page.getByRole('button', { name: 'Start here' }).click();
```

Handler takes the original locator as an argument. You can also automatically remove the handler after a number of invocations by setting [`option: times`]:

```js
await page.addLocatorHandler(page.getByLabel('Close'), async locator => {
  await locator.click();
}, { times: 1 });
```

### param: Page.addLocatorHandler.locator
* since: v1.42
- `locator` <[Locator]>

Locator that triggers the handler.

### param: Page.addLocatorHandler.handler
* since: v1.42
- `handler` <[function]\([Locator]\): [Promise<any>]>

Function that should be run once [`param: locator`] appears. This function should get rid of the element that blocks actions like click.

### option: Page.addLocatorHandler.times
* since: v1.44
- `times` <[int]>

Specifies the maximum number of times this handler should be called. Unlimited by default.

### option: Page.addLocatorHandler.noWaitAfter
* since: v1.44
- `noWaitAfter` <[boolean]>

By default, after calling the handler Playwright will wait until the overlay becomes hidden, and only then Playwright will continue with the action/assertion that triggered the handler. This option allows to opt-out of this behavior, so that overlay can stay visible after the handler has run.

## async method: Page.removeAllListeners
* since: v1.47

Removes all the listeners of the given type (or all registered listeners if no type given).
Allows to wait for async listeners to complete or to ignore subsequent errors from these listeners.

**Usage**

```js
page.on('request', async request => {
  const response = await request.response();
  const body = await response.body();
  console.log(body.byteLength);
});
await page.goto('https://playwright.dev', { waitUntil: 'domcontentloaded' });
// Waits for all the reported 'request' events to resolve.
await page.removeAllListeners('request', { behavior: 'wait' });
```

### param: Page.removeAllListeners.type
* since: v1.47
- `type` ?<[string]>

### option: Page.removeAllListeners.behavior = %%-remove-all-listeners-options-behavior-%%
* since: v1.47

## async method: Page.removeLocatorHandler
* since: v1.44

Removes all locator handlers added by [`method: Page.addLocatorHandler`] for a specific locator.

### param: Page.removeLocatorHandler.locator
* since: v1.44
- `locator` <[Locator]>

Locator passed to [`method: Page.addLocatorHandler`].

## async method: Page.reload
* since: v1.8
- returns: <[null]|[Response]>

This method reloads the current page, in the same way as if the user had triggered a browser refresh.
Returns the main resource response. In case of multiple redirects, the navigation will resolve with the response of the
last redirect.

### option: Page.reload.waitUntil = %%-navigation-wait-until-%%
* since: v1.8

### option: Page.reload.timeout = %%-navigation-timeout-%%
* since: v1.8

### option: Page.reload.timeout = %%-navigation-timeout-js-%%
* since: v1.8

### option: Page.reload.signal = %%-input-signal-%%

## property: Page.request
* since: v1.16
  - alias-csharp: APIRequest
- type: <[APIRequestContext]>

API testing helper associated with this page. This method returns the same instance as
[`property: BrowserContext.request`] on the page's context. See [`property: BrowserContext.request`] for more details.

## async method: Page.route
* since: v1.8
- returns: <[Disposable]>

Routing provides the capability to modify network requests that are made by a page.

Once routing is enabled, every request matching the url pattern will stall unless it's continued, fulfilled or aborted.

:::note
The handler will only be called for the first url if the response is a redirect.
:::

:::note
[`method: Page.route`] will not intercept requests intercepted by Service Worker. See [this](https://github.com/microsoft/playwright/issues/1090) issue. We recommend disabling Service Workers when using request interception by setting [`option: Browser.newContext.serviceWorkers`] to `'block'`.
:::

:::note
[`method: Page.route`] will not intercept the first request of a popup page. Use [`method: BrowserContext.route`] instead.
:::

**Usage**

An example of a naive handler that aborts all image requests:

```js
const page = await browser.newPage();
await page.route('**/*.{png,jpg,jpeg}', route => route.abort());
await page.goto('https://example.com');
await browser.close();
```

or the same snippet using a regex pattern instead:

```js
const page = await browser.newPage();
await page.route(/(\.png$)|(\.jpg$)/, route => route.abort());
await page.goto('https://example.com');
await browser.close();
```

It is possible to examine the request to decide the route action. For example, mocking all requests that contain some post data, and leaving all other requests as is:

```js
await page.route('/api/**', async route => {
  if (route.request().postData().includes('my-string'))
    await route.fulfill({ body: 'mocked-data' });
  else
    await route.continue();
});
```

If a request matches multiple registered routes, the most recently registered route takes precedence.

Page routes take precedence over browser context routes (set up with [`method: BrowserContext.route`]) when request
matches both handlers.

To remove a route with its handler you can use [`method: Page.unroute`].

:::note
Enabling routing disables http cache.
:::

### param: Page.route.url
* since: v1.8
- `url` <[string]|[RegExp]|[URLPattern]|[function]\([URL]\):[boolean]>

A glob pattern, regex pattern, URL pattern, or predicate that receives a [URL] to match during routing. If [`option: Browser.newContext.baseURL`] is set in the context options and the provided URL is a string that does not start with `*`, it is resolved using the [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL) constructor.

### param: Page.route.handler
* since: v1.8
- `handler` <[function]\([Route], [Request]\): [Promise<any>|any]>

handler function to route the request.

### option: Page.route.times
* since: v1.15
- `times` <[int]>

How often a route should be used. By default it will be used every time.

## async method: Page.routeFromHAR
* since: v1.23

If specified the network requests that are made in the page will be served from the HAR file. Read more about [Replaying from HAR](../mock.md#replaying-from-har).

Playwright will not serve requests intercepted by Service Worker from the HAR file. See [this](https://github.com/microsoft/playwright/issues/1090) issue. We recommend disabling Service Workers when using request interception by setting [`option: Browser.newContext.serviceWorkers`] to `'block'`.

### param: Page.routeFromHAR.har
* since: v1.23
- `har` <[path]>

Path to a [HAR](http://www.softwareishard.com/blog/har-12-spec) file with prerecorded network data. If `path` is a relative path, then it is resolved relative to the current working directory.

### option: Page.routeFromHAR.notFound
* since: v1.23
- `notFound` "HarNotFound" ?<"abort"|"fallback">
* If set to 'abort' any request not found in the HAR file will be aborted.
* If set to 'fallback' missing requests will be sent to the network.

Defaults to abort.

### option: Page.routeFromHAR.update
* since: v1.23
- `update` ?<boolean>

If specified, updates the given HAR with the actual network information instead of serving from file. The file is written to disk when [`method: BrowserContext.close`] is called.

### option: Page.routeFromHAR.url
* since: v1.23
- `url` <[string]|[RegExp]>

A glob pattern, regular expression or predicate to match the request URL. Only requests with URL matching the pattern will be served from the HAR file. If not specified, all requests are served from the HAR file.

### option: Page.routeFromHAR.updateMode
* since: v1.32
- `updateMode` "HarMode" <"full"|"minimal">

When set to `minimal`, only record information necessary for routing from HAR. This omits sizes, timing, page, cookies, security and other types of HAR information that are not used when replaying from HAR. Defaults to `minimal`.

### option: Page.routeFromHAR.updateContent
* since: v1.32
- `updateContent` "RouteFromHarUpdateContentPolicy" <"embed"|"attach">

Optional setting to control resource content management. If `attach` is specified, resources are persisted as separate files or entries in the ZIP archive. If `embed` is specified, content is stored inline the HAR file.

## async method: Page.routeWebSocket
* since: v1.48

This method allows to modify websocket connections that are made by the page.

Note that only `WebSocket`s created after this method was called will be routed. It is recommended to call this method before navigating the page.

**Usage**

Below is an example of a simple mock that responds to a single message. See [WebSocketRoute] for more details and examples.

```js
await page.routeWebSocket('/ws', ws => {
  ws.onMessage(message => {
    if (message === 'request')
      ws.send('response');
  });
});
```

### param: Page.routeWebSocket.url
* since: v1.48
- `url` <[string]|[RegExp]|[URLPattern]|[function]\([URL]\):[boolean]>

Only WebSockets with the url matching this pattern will be routed. A string pattern can be relative to the [`option: Browser.newContext.baseURL`] context option.

### param: Page.routeWebSocket.handler
* since: v1.48
- `handler` <[function]\([WebSocketRoute]\): [Promise<any>|any]>

Handler function to route the WebSocket.

## property: Page.screencast
* since: v1.59
- type: <[Screencast]>

[Screencast] object associated with this page.

**Usage**

```js
await page.screencast.start({
  onFrame: ({ data }) => {
    console.log('received frame, jpeg size:', data.length);
  },
});
// ... perform actions ...
await page.screencast.stop();
```

## async method: Page.screenshot
* since: v1.8
- returns: <[Buffer]>

Returns the buffer with the captured screenshot.

### option: Page.screenshot.-inline- = %%-screenshot-options-common-list-v1.8-%%
* since: v1.8

### option: Page.screenshot.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.screenshot.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.screenshot.signal = %%-input-signal-%%

### option: Page.screenshot.fullPage = %%-screenshot-option-full-page-%%
* since: v1.8

### option: Page.screenshot.clip = %%-screenshot-option-clip-%%
* since: v1.8

### option: Page.screenshot.maskColor = %%-screenshot-option-mask-color-%%
* since: v1.34

### option: Page.screenshot.style = %%-screenshot-option-style-%%
* since: v1.41

## async method: Page.selectOption
* since: v1.8
* discouraged: Use locator-based [`method: Locator.selectOption`] instead. Read more about [locators](../locators.md).
- returns: <[Array]<[string]>>

This method waits for an element matching [`param: selector`], waits for [actionability](../actionability.md) checks, waits until all specified options are present in the `<select>` element and selects these options.

If the target element is not a `<select>` element, this method throws an error. However, if the element is inside the `<label>` element that has an associated [control](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control), the control will be used instead.

Returns the array of option values that have been successfully selected.

Triggers a `change` and `input` event once all the provided options have been selected.

**Usage**

```js
// Single selection matching the value or label
page.selectOption('select#colors', 'blue');

// single selection matching the label
page.selectOption('select#colors', { label: 'Blue' });

// multiple selection
page.selectOption('select#colors', ['red', 'green', 'blue']);

```

### param: Page.selectOption.selector = %%-input-selector-%%
* since: v1.8

### param: Page.selectOption.values = %%-select-options-values-%%
* since: v1.8

### option: Page.selectOption.force = %%-input-force-%%
* since: v1.13

### option: Page.selectOption.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.selectOption.strict = %%-input-strict-%%
* since: v1.14

### option: Page.selectOption.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.selectOption.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.selectOption.signal = %%-input-signal-%%

### option: Page.selectOption.element = %%-python-select-options-element-%%
* since: v1.8

### option: Page.selectOption.index = %%-python-select-options-index-%%
* since: v1.8

### param: Page.selectOption.value = %%-python-select-options-value-%%
* since: v1.8

### option: Page.selectOption.label = %%-python-select-options-label-%%
* since: v1.8

## async method: Page.setChecked
* since: v1.15
* discouraged: Use locator-based [`method: Locator.setChecked`] instead. Read more about [locators](../locators.md).

This method checks or unchecks an element matching [`param: selector`] by performing the following steps:
1. Find an element matching [`param: selector`]. If there is none, wait until a matching element is attached to
   the DOM.
1. Ensure that matched element is a checkbox or a radio input. If not, this method throws.
1. If the element already has the right checked state, this method returns immediately.
1. Wait for [actionability](../actionability.md) checks on the matched element, unless [`option: force`] option is
   set. If the element is detached during the checks, the whole action is retried.
1. Scroll the element into view if needed.
1. Use [`property: Page.mouse`] to click in the center of the element.
1. Ensure that the element is now checked or unchecked. If not, this method throws.

When all steps combined have not finished during the specified [`option: timeout`], this method throws a
[TimeoutError]. Passing zero timeout disables this.

### param: Page.setChecked.selector = %%-input-selector-%%
* since: v1.15

### param: Page.setChecked.checked = %%-input-checked-%%
* since: v1.15

### option: Page.setChecked.force = %%-input-force-%%
* since: v1.15

### option: Page.setChecked.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.setChecked.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.15

### option: Page.setChecked.position = %%-input-position-%%
* since: v1.15

### option: Page.setChecked.strict = %%-input-strict-%%
* since: v1.15

### option: Page.setChecked.timeout = %%-input-timeout-%%
* since: v1.15

### option: Page.setChecked.timeout = %%-input-timeout-js-%%
* since: v1.15

### option: Page.setChecked.signal = %%-input-signal-%%

### option: Page.setChecked.trial = %%-input-trial-%%
* since: v1.15

## async method: Page.setContent
* since: v1.8

This method internally calls [document.write()](https://developer.mozilla.org/en-US/docs/Web/API/Document/write), inheriting all its specific characteristics and behaviors.

### param: Page.setContent.html
* since: v1.8
- `html` <[string]>

HTML markup to assign to the page.

### option: Page.setContent.timeout = %%-navigation-timeout-%%
* since: v1.8

### option: Page.setContent.timeout = %%-navigation-timeout-js-%%
* since: v1.8

### option: Page.setContent.signal = %%-input-signal-%%

### option: Page.setContent.waitUntil = %%-navigation-wait-until-%%
* since: v1.8

## method: Page.setDefaultNavigationTimeout
* since: v1.8

This setting will change the default maximum navigation time for the following methods and related shortcuts:
* [`method: Page.goBack`]
* [`method: Page.goForward`]
* [`method: Page.goto`]
* [`method: Page.reload`]
* [`method: Page.setContent`]
* [`method: Page.waitForNavigation`]
* [`method: Page.waitForURL`]

:::note
[`method: Page.setDefaultNavigationTimeout`] takes priority over [`method: Page.setDefaultTimeout`],
[`method: BrowserContext.setDefaultTimeout`] and [`method: BrowserContext.setDefaultNavigationTimeout`].
:::

### param: Page.setDefaultNavigationTimeout.timeout
* since: v1.8
- `timeout` <[float]>

Maximum navigation time in milliseconds

## method: Page.setDefaultTimeout
* since: v1.8

This setting will change the default maximum time for all the methods accepting [`param: timeout`] option.

:::note
[`method: Page.setDefaultNavigationTimeout`] takes priority over [`method: Page.setDefaultTimeout`].
:::

### param: Page.setDefaultTimeout.timeout
* since: v1.8
- `timeout` <[float]>

Maximum time in milliseconds. Pass `0` to disable timeout.

## async method: Page.setExtraHTTPHeaders
* since: v1.8

The extra HTTP headers will be sent with every request the page initiates.

:::note
[`method: Page.setExtraHTTPHeaders`] does not guarantee the order of headers in the outgoing requests.
:::

### param: Page.setExtraHTTPHeaders.headers
* since: v1.8
- `headers` <[Object]<[string], [string]>>

An object containing additional HTTP headers to be sent with every request. All header values must be strings.

## async method: Page.setInputFiles
* since: v1.8
* discouraged: Use locator-based [`method: Locator.setInputFiles`] instead. Read more about [locators](../locators.md).

Sets the value of the file input to these file paths or files. If some of the `filePaths` are relative paths, then they
are resolved relative to the current working directory. For empty array, clears the selected files.
For inputs with a `[webkitdirectory]` attribute, only a single directory path is supported.

This method expects [`param: selector`] to point to an
[input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input). However, if the element is inside the `<label>` element that has an associated [control](https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement/control), targets the control instead.

### param: Page.setInputFiles.selector = %%-input-selector-%%
* since: v1.8

### param: Page.setInputFiles.files = %%-input-files-%%
* since: v1.8

### option: Page.setInputFiles.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.setInputFiles.strict = %%-input-strict-%%
* since: v1.14

### option: Page.setInputFiles.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.setInputFiles.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.setInputFiles.signal = %%-input-signal-%%

## async method: Page.setViewportSize
* since: v1.8

In the case of multiple pages in a single browser, each page can have its own viewport size. However,
[`method: Browser.newContext`] allows to set viewport size (and more) for all pages in the context at once.

[`method: Page.setViewportSize`] will resize the page. A lot of websites don't expect phones to change size, so you should set the
viewport size before navigating to the page. [`method: Page.setViewportSize`] will also reset `screen` size, use [`method: Browser.newContext`] with `screen` and `viewport` parameters if you need better control of these properties.

**Usage**

```js
const page = await browser.newPage();
await page.setViewportSize({
  width: 640,
  height: 480,
});
await page.goto('https://example.com');
```

### param: Page.setViewportSize.viewportSize
* since: v1.8
- `viewportSize` "ViewportSize" <[Object]>
  - `width` <[int]> page width in pixels.
  - `height` <[int]> page height in pixels.

## async method: Page.ariaSnapshot
* since: v1.59
- returns: <[string]>

Captures the aria snapshot of the page. Read more about [aria snapshots](../aria-snapshots.md).

### option: Page.ariaSnapshot.mode
* since: v1.59
- `mode` "AriaSnapshotMode" <"ai"|"default">

When set to `"ai"`, returns a snapshot optimized for AI consumption: including element references like `[ref=e2]` and snapshots of `<iframe>`s. Defaults to `"default"`.

### option: Page.ariaSnapshot.timeout = %%-input-timeout-%%
* since: v1.59

### option: Page.ariaSnapshot.timeout = %%-input-timeout-js-%%
* since: v1.59

### option: Page.ariaSnapshot.signal = %%-input-signal-%%

### option: Page.ariaSnapshot.depth
* since: v1.59
- `depth` <[int]>

When specified, limits the depth of the snapshot.

### option: Page.ariaSnapshot.boxes
* since: v1.60
- `boxes` <[boolean]>

When `true`, appends each element's bounding box as `[box=x,y,width,height]` to the snapshot. Coordinates are
relative to the viewport, in CSS pixels, as returned by [`Element.getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect).
Defaults to `false`.

## async method: Page.ariaSnapshotJSON
* since: v1.63
- returns: <[Serializable]>

Captures the aria snapshot of the page as a free form JSON object.
Returns the same tree as [`method: Page.ariaSnapshot`], serialized as a JSON value instead of YAML markup.
See [`method: Locator.ariaSnapshotJSON`] for the details of the format.

### option: Page.ariaSnapshotJSON.mode
* since: v1.63
- `mode` "AriaSnapshotMode" <"ai"|"default">

When set to `"ai"`, returns a snapshot optimized for AI consumption: including element references like `[ref=e2]` and snapshots of `<iframe>`s. Defaults to `"default"`.

### option: Page.ariaSnapshotJSON.timeout = %%-input-timeout-%%
* since: v1.63

### option: Page.ariaSnapshotJSON.timeout = %%-input-timeout-js-%%
* since: v1.63

### option: Page.ariaSnapshotJSON.signal = %%-input-signal-%%

### option: Page.ariaSnapshotJSON.depth
* since: v1.63
- `depth` <[int]>

When specified, limits the depth of the snapshot.

### option: Page.ariaSnapshotJSON.boxes
* since: v1.63
- `boxes` <[boolean]>

When `true`, includes each element's bounding box as a `box` property with `x`, `y`, `width` and `height`. Coordinates are
relative to the viewport, in CSS pixels, as returned by [`Element.getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect).
Defaults to `false`.

## async method: Page.tap
* since: v1.8
* discouraged: Use locator-based [`method: Locator.tap`] instead. Read more about [locators](../locators.md).

This method taps an element matching [`param: selector`] by performing the following steps:
1. Find an element matching [`param: selector`]. If there is none, wait until a matching element is attached to
   the DOM.
1. Wait for [actionability](../actionability.md) checks on the matched element, unless [`option: force`] option is
   set. If the element is detached during the checks, the whole action is retried.
1. Scroll the element into view if needed.
1. Use [`property: Page.touchscreen`] to tap the center of the element, or the specified [`option: position`].

When all steps combined have not finished during the specified [`option: timeout`], this method throws a
[TimeoutError]. Passing zero timeout disables this.

:::note
[`method: Page.tap`] will throw if the [`option: Browser.newContext.hasTouch`] option of the browser context is false.
:::

### param: Page.tap.selector = %%-input-selector-%%
* since: v1.8

### option: Page.tap.force = %%-input-force-%%
* since: v1.8

### option: Page.tap.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.tap.modifiers = %%-input-modifiers-%%
* since: v1.8

### option: Page.tap.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.tap.position = %%-input-position-%%
* since: v1.8

### option: Page.tap.strict = %%-input-strict-%%
* since: v1.14

### option: Page.tap.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.tap.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.tap.signal = %%-input-signal-%%

### option: Page.tap.trial = %%-input-trial-with-modifiers-%%
* since: v1.11

## async method: Page.textContent
* since: v1.8
* discouraged: Use locator-based [`method: Locator.textContent`] instead. Read more about [locators](../locators.md).
- returns: <[null]|[string]>

Returns `element.textContent`.

### param: Page.textContent.selector = %%-input-selector-%%
* since: v1.8

### option: Page.textContent.strict = %%-input-strict-%%
* since: v1.14

### option: Page.textContent.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.textContent.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.textContent.signal = %%-input-signal-%%

## async method: Page.title
* since: v1.8
- returns: <[string]>

Returns the page's title.

## property: Page.touchscreen
* since: v1.8
- type: <[Touchscreen]>

## async method: Page.type
* since: v1.8
* deprecated: In most cases, you should use [`method: Locator.fill`] instead. You only need to press keys one by one if there is special keyboard handling on the page - in this case use [`method: Locator.pressSequentially`].

Sends a `keydown`, `keypress`/`input`, and `keyup` event for each character in the text. `page.type` can be used to send
fine-grained keyboard events. To fill values in form fields, use [`method: Page.fill`].

To press a special key, like `Control` or `ArrowDown`, use [`method: Keyboard.press`].

**Usage**

### param: Page.type.selector = %%-input-selector-%%
* since: v1.8

### param: Page.type.text
* since: v1.8
- `text` <[string]>

A text to type into a focused element.

### option: Page.type.delay
* since: v1.8
- `delay` <[float]>

Time to wait between key presses in milliseconds. Defaults to 0.

### option: Page.type.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.type.strict = %%-input-strict-%%
* since: v1.14

### option: Page.type.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.type.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.type.signal = %%-input-signal-%%

## async method: Page.uncheck
* since: v1.8
* discouraged: Use locator-based [`method: Locator.uncheck`] instead. Read more about [locators](../locators.md).

This method unchecks an element matching [`param: selector`] by performing the following steps:
1. Find an element matching [`param: selector`]. If there is none, wait until a matching element is attached to
   the DOM.
1. Ensure that matched element is a checkbox or a radio input. If not, this method throws. If the element is already
   unchecked, this method returns immediately.
1. Wait for [actionability](../actionability.md) checks on the matched element, unless [`option: force`] option is
   set. If the element is detached during the checks, the whole action is retried.
1. Scroll the element into view if needed.
1. Use [`property: Page.mouse`] to click in the center of the element.
1. Ensure that the element is now unchecked. If not, this method throws.

When all steps combined have not finished during the specified [`option: timeout`], this method throws a
[TimeoutError]. Passing zero timeout disables this.

### param: Page.uncheck.selector = %%-input-selector-%%
* since: v1.8

### option: Page.uncheck.force = %%-input-force-%%
* since: v1.8

### option: Page.uncheck.scroll = %%-input-scroll-%%
* since: v1.62

### option: Page.uncheck.noWaitAfter = %%-input-no-wait-after-removed-%%
* since: v1.8

### option: Page.uncheck.position = %%-input-position-%%
* since: v1.11

### option: Page.uncheck.strict = %%-input-strict-%%
* since: v1.14

### option: Page.uncheck.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.uncheck.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.uncheck.signal = %%-input-signal-%%

### option: Page.uncheck.trial = %%-input-trial-%%
* since: v1.11

## async method: Page.unrouteAll
* since: v1.41

Removes all routes created with [`method: Page.route`] and [`method: Page.routeFromHAR`].

### option: Page.unrouteAll.behavior = %%-unroute-all-options-behavior-%%
* since: v1.41

## async method: Page.unroute
* since: v1.8

Removes a route created with [`method: Page.route`]. When [`param: handler`] is not specified, removes all routes for
the [`param: url`].

### param: Page.unroute.url
* since: v1.8
- `url` <[string]|[RegExp]|[URLPattern]|[function]\([URL]\):[boolean]>

A glob pattern, regex pattern, URL pattern, or predicate receiving [URL] to match while routing.

### param: Page.unroute.handler
* since: v1.8
- `handler` ?<[function]\([Route], [Request]\): [Promise<any>|any]>

Optional handler function to route the request.

## method: Page.url
* since: v1.8
- returns: <[string]>

## method: Page.video
* since: v1.8
- returns: <[null]|[Video]>

Video object associated with this page. Can be used to access the video file when using the `recordVideo` context option.

## method: Page.viewportSize
* since: v1.8
- returns: "ViewportSize" <[null]|[Object]>
  * alias-csharp: PageViewportSizeResult
  - `width` <[int]> page width in pixels.
  - `height` <[int]> page height in pixels.

## async method: Page.waitForEvent
* since: v1.8
  - alias-python: expect_event
- returns: <[any]>

Waits for event to fire and passes its value into the predicate function. Returns when the predicate returns truthy
value. Will throw an error if the page is closed before the event is fired. Returns the event data value.

**Usage**

```js
// Start waiting for download before clicking. Note no await.
const downloadPromise = page.waitForEvent('download');
await page.getByText('Download file').click();
const download = await downloadPromise;
```

## async method: Page.waitForFunction
* since: v1.8
- returns: <[JSHandle]>

Returns when the [`param: expression`] returns a truthy value. It resolves to a JSHandle of the truthy value.

**Usage**

The [`method: Page.waitForFunction`] can be used to observe viewport size change:

```js
const { webkit } = require('playwright');  // Or 'chromium' or 'firefox'.

(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage();
  const watchDog = page.waitForFunction(() => window.innerWidth < 100);
  await page.setViewportSize({ width: 50, height: 50 });
  await watchDog;
  await browser.close();
})();
```

To pass an argument to the predicate of [`method: Page.waitForFunction`] function:

```js
const selector = '.foo';
await page.waitForFunction(selector => !!document.querySelector(selector), selector);
```

### param: Page.waitForFunction.expression = %%-evaluate-expression-%%
* since: v1.8

### param: Page.waitForFunction.expression = %%-js-evaluate-pagefunction-%%
* since: v1.8

### param: Page.waitForFunction.arg
* since: v1.8
- `arg` ?<[EvaluationArgument]>

Optional argument to pass to [`param: expression`].

### option: Page.waitForFunction.polling = %%-js-python-wait-for-function-polling-%%
* since: v1.8

### option: Page.waitForFunction.polling = %%-csharp-java-wait-for-function-polling-%%
* since: v1.8

### option: Page.waitForFunction.timeout = %%-wait-for-function-timeout-%%
* since: v1.8

### option: Page.waitForFunction.timeout = %%-wait-for-function-timeout-js-%%
* since: v1.8

### option: Page.waitForFunction.signal = %%-input-signal-%%

## async method: Page.waitForLoadState
* since: v1.8

Returns when the required load state has been reached.

This resolves when the page reaches a required load state, `load` by default. The navigation must have been committed
when this method is called. If current document has already reached the required state, resolves immediately.

:::note
Most of the time, this method is not needed because Playwright [auto-waits before every action](../actionability.md).
:::

**Usage**

```js
await page.getByRole('button').click(); // Click triggers navigation.
await page.waitForLoadState(); // The promise resolves after 'load' event.
```

```js
const popupPromise = page.waitForEvent('popup');
await page.getByRole('button').click(); // Click triggers a popup.
const popup = await popupPromise;
await popup.waitForLoadState('domcontentloaded'); // Wait for the 'DOMContentLoaded' event.
console.log(await popup.title()); // Popup is ready to use.
```

### param: Page.waitForLoadState.state = %%-wait-for-load-state-state-%%
* since: v1.8

### option: Page.waitForLoadState.timeout = %%-navigation-timeout-%%
* since: v1.8

### option: Page.waitForLoadState.timeout = %%-navigation-timeout-js-%%
* since: v1.8
### option: Page.waitForLoadState.signal = %%-wait-for-event-signal-%%

## async method: Page.waitForNavigation
* since: v1.8
* deprecated: This method is inherently racy, please use [`method: Page.waitForURL`] instead.
  * alias-python: expect_navigation
  * alias-csharp: RunAndWaitForNavigation
- returns: <[null]|[Response]>

Waits for the main frame navigation and returns the main resource response. In case of multiple redirects, the navigation
will resolve with the response of the last redirect. In case of navigation to a different anchor or navigation due to
History API usage, the navigation will resolve with `null`.

**Usage**

This resolves when the page navigates to a new URL or reloads. It is useful for when you run code which will indirectly
cause the page to navigate. e.g. The click target has an `onclick` handler that triggers navigation from a `setTimeout`.
Consider this example:

```js
// Start waiting for navigation before clicking. Note no await.
const navigationPromise = page.waitForNavigation();
await page.getByText('Navigate after timeout').click();
await navigationPromise;
```

:::note
Usage of the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) to change the URL is considered
a navigation.
:::

## async method: Page.waitForRequest
* since: v1.8
  * alias-python: expect_request
  * alias-csharp: RunAndWaitForRequest
- returns: <[Request]>

Waits for the matching request and returns it. See [waiting for event](../events.md#waiting-for-event) for more details about events.

**Usage**

```js
// Start waiting for request before clicking. Note no await.
const requestPromise = page.waitForRequest('https://example.com/resource');
await page.getByText('trigger request').click();
const request = await requestPromise;

// Alternative way with a predicate. Note no await.
const requestPromise = page.waitForRequest(request =>
  request.url() === 'https://example.com' && request.method() === 'GET',
);
await page.getByText('trigger request').click();
const request = await requestPromise;
```

## async method: Page.waitForResponse
* since: v1.8
  * alias-python: expect_response
  * alias-csharp: RunAndWaitForResponse
- returns: <[Response]>

Returns the matched response. See [waiting for event](../events.md#waiting-for-event) for more details about events.

**Usage**

```js
// Start waiting for response before clicking. Note no await.
const responsePromise = page.waitForResponse('https://example.com/resource');
await page.getByText('trigger response').click();
const response = await responsePromise;

// Alternative way with a predicate. Note no await.
const responsePromise = page.waitForResponse(response =>
  response.url() === 'https://example.com' && response.status() === 200
      && response.request().method() === 'GET'
);
await page.getByText('trigger response').click();
const response = await responsePromise;
```

## async method: Page.waitForSelector
* since: v1.8
* discouraged: Use web assertions that assert visibility or a locator-based [`method: Locator.waitFor`] instead.
  Read more about [locators](../locators.md).
- returns: <[null]|[ElementHandle]>

Returns when element specified by selector satisfies [`option: state`] option. Returns `null` if waiting for `hidden` or
`detached`.

:::note
Playwright automatically waits for element to be ready before performing an action. Using
[Locator] objects and web-first assertions makes the code wait-for-selector-free.
:::

Wait for the [`param: selector`] to satisfy [`option: state`] option (either appear/disappear from dom, or become
visible/hidden). If at the moment of calling the method [`param: selector`] already satisfies the condition, the method
will return immediately. If the selector doesn't satisfy the condition for the [`option: timeout`] milliseconds, the
function will throw.

**Usage**

This method works across navigations:

```js
const { chromium } = require('playwright');  // Or 'firefox' or 'webkit'.

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const currentURL of ['https://google.com', 'https://bbc.com']) {
    await page.goto(currentURL);
    const element = await page.waitForSelector('img');
    console.log('Loaded image: ' + await element.getAttribute('src'));
  }
  await browser.close();
})();
```

### param: Page.waitForSelector.selector = %%-query-selector-%%
* since: v1.8

### option: Page.waitForSelector.state = %%-wait-for-selector-state-%%
* since: v1.8

### option: Page.waitForSelector.strict = %%-input-strict-%%
* since: v1.14

### option: Page.waitForSelector.timeout = %%-input-timeout-%%
* since: v1.8

### option: Page.waitForSelector.timeout = %%-input-timeout-js-%%
* since: v1.8

### option: Page.waitForSelector.signal = %%-input-signal-%%

## async method: Page.waitForTimeout
* since: v1.8
* discouraged: Never wait for timeout in production. Tests that wait for time are
  inherently flaky. Use [Locator] actions and web assertions that wait automatically.

Waits for the given [`param: timeout`] in milliseconds.

Note that `page.waitForTimeout()` should only be used for debugging. Tests using the timer in production are going to be
flaky. Use signals such as network events, selectors becoming visible and others instead.

**Usage**

```js
// wait for 1 second
await page.waitForTimeout(1000);
```

### param: Page.waitForTimeout.timeout
* since: v1.8
- `timeout` <[float]>

A timeout to wait for

## async method: Page.waitForURL
* since: v1.11

Waits for the main frame to navigate to the given URL.

**Usage**

```js
await page.click('a.delayed-navigation'); // Clicking the link will indirectly cause a navigation
await page.waitForURL('**/target.html');
```

### param: Page.waitForURL.url = %%-js-wait-for-navigation-url-%%
* since: v1.11

### param: Page.waitForURL.url = %%-python-csharp-java-wait-for-navigation-url-%%
* since: v1.11

### option: Page.waitForURL.timeout = %%-navigation-timeout-%%
* since: v1.11

### option: Page.waitForURL.timeout = %%-navigation-timeout-js-%%
* since: v1.11
### option: Page.waitForURL.signal = %%-wait-for-event-signal-%%

### option: Page.waitForURL.waitUntil = %%-navigation-wait-until-%%
* since: v1.11

## property: Page.webmcp
* since: v1.64
- type: <[WebMCP]>

Tools that the main frame registers through the experimental [WebMCP](https://webmachinelearning.github.io/webmcp/) browser API. Shortcut for [`property: Frame.webmcp`] of [`method: Page.mainFrame`], see [WebMCP] for details.

**Usage**

```js
const tools = await page.webmcp.tools();
const result = await page.webmcp.callTool('add', { a: 2, b: 40 });
```

## method: Page.workers
* since: v1.8
- returns: <[Array]<[Worker]>>

This method returns all of the dedicated [WebWorkers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
associated with the page.

:::note
This does not contain ServiceWorkers
:::
