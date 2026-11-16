# class: BrowserContext
* since: v1.8

BrowserContexts provide a way to operate multiple independent browser sessions.

If a page opens another page, e.g. with a `window.open` call, the popup will belong to the parent page's browser
context.

Playwright allows creating isolated non-persistent browser contexts with [`method: Browser.newContext`] method. Non-persistent browser
contexts don't write any browsing data to disk.

```js
// Create a new incognito browser context
const context = await browser.newContext();
// Create a new page inside context.
const page = await context.newPage();
await page.goto('https://example.com');
// Dispose context once it's no longer needed.
await context.close();
```

## event: BrowserContext.backgroundPage
* since: v1.11
* deprecated: Background pages have been removed from Chromium together with Manifest V2 extensions.
- argument: <[Page]>

This event is not emitted.

## property: BrowserContext.clock
* since: v1.45
- type: <[Clock]>

Playwright has ability to mock clock and passage of time.

## property: BrowserContext.credentials
* since: v1.61
- type: <[Credentials]>

Virtual WebAuthn authenticator for this context. Lets tests seed credentials and intercept
`navigator.credentials.create()` / `navigator.credentials.get()` ceremonies.

## property: BrowserContext.debugger
* since: v1.59
- type: <[Debugger]>

Debugger allows to pause and resume the execution.

## event: BrowserContext.close
* since: v1.8
- argument: <[BrowserContext]>

Emitted when Browser context gets closed. This might happen because of one of the following:
* Browser context is closed.
* Browser application is closed or crashed.
* The [`method: Browser.close`] method was called.

### option: BrowserContext.close.reason
* since: v1.40
- `reason` <[string]>

The reason to be reported to the operations interrupted by the context closure.

## event: BrowserContext.console
* since: v1.34
  - alias-java: consoleMessage
- argument: <[ConsoleMessage]>

Emitted when JavaScript within the page calls one of console API methods, e.g. `console.log` or `console.dir`.

The arguments passed into `console.log` and the page are available on the [ConsoleMessage] event handler argument.

**Usage**

```js
context.on('console', async msg => {
  const values = [];
  for (const arg of msg.args())
    values.push(await arg.jsonValue());
  console.log(...values);
});
await page.evaluate(() => console.log('hello', 5, { foo: 'bar' }));
```

## event: BrowserContext.dialog
* since: v1.34
- argument: <[Dialog]>

Emitted when a JavaScript dialog appears, such as `alert`, `prompt`, `confirm` or `beforeunload`. Listener **must** either [`method: Dialog.accept`] or [`method: Dialog.dismiss`] the dialog - otherwise the page will [freeze](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop#never_blocking) waiting for the dialog, and actions like click will never finish.

**Usage**

```js
context.on('dialog', dialog => {
  dialog.accept();
});
```

:::note
When no [`event: Page.dialog`] or [`event: BrowserContext.dialog`] listeners are present, all dialogs are automatically dismissed.
:::

## event: BrowserContext.dialogClosed
* since: v1.63
- argument: <[Dialog]>

Emitted when a JavaScript dialog in any page belonging to this context has been closed, either by [`method: Dialog.accept`], by [`method: Dialog.dismiss`], or manually by the user in the headed browser.

## event: BrowserContext.download
* since: v1.60
- argument: <[Download]>

Emitted when attachment download started in any page belonging to this context. User can access basic file operations on downloaded content via the passed [Download] instance. See also [`event: Page.download`] to receive events about a specific page.

## event: BrowserContext.frameAttached
* since: v1.60
- argument: <[Frame]>

Emitted when a frame is attached in any page belonging to this context. See also [`event: Page.frameAttached`] to receive events about a specific page.

## event: BrowserContext.frameDetached
* since: v1.60
- argument: <[Frame]>

Emitted when a frame is detached in any page belonging to this context. See also [`event: Page.frameDetached`] to receive events about a specific page.

## event: BrowserContext.frameNavigated
* since: v1.60
- argument: <[Frame]>

Emitted when a frame is navigated to a new url in any page belonging to this context. See also [`event: Page.frameNavigated`] to receive events about navigations in a specific page.

## event: BrowserContext.page
* since: v1.8
- argument: <[Page]>

The event is emitted when a new Page is created in the BrowserContext. The page may still be loading. The event will
also fire for popup pages. See also [`event: Page.popup`] to receive events about popups relevant to a specific page.

The earliest moment that page is available is when it has navigated to the initial url. For example, when opening a
popup with `window.open('http://example.com')`, this event will fire when the network request to "http://example.com" is
done and its response has started loading in the popup. If you would like to route/listen to this network request, use [`method: BrowserContext.route`] and [`event: BrowserContext.request`] respectively instead of similar methods on the [Page].

```js
const newPagePromise = context.waitForEvent('page');
await page.getByText('open new page').click();
const newPage = await newPagePromise;
console.log(await newPage.evaluate('location.href'));
```

:::note
Use [`method: Page.waitForLoadState`] to wait until the page gets to a particular state (you should not need it in most
cases).
:::

## event: BrowserContext.pageClose
* since: v1.60
- argument: <[Page]>

Emitted when a page in this context is closed. See also [`event: Page.close`] to receive events about a specific page.

## event: BrowserContext.pageLoad
* since: v1.60
- argument: <[Page]>

Emitted when the JavaScript [`load`](https://developer.mozilla.org/en-US/docs/Web/Events/load) event is dispatched in any page belonging to this context. See also [`event: Page.load`] to receive events about a specific page.

## event: BrowserContext.webError
* since: v1.38
- argument: <[WebError]>

Emitted when exception is unhandled in any of the pages in this
context. To listen for errors from a particular page, use [`event: Page.pageError`] instead.

## event: BrowserContext.request
* since: v1.12
- argument: <[Request]>

Emitted when a request is issued from any pages created through this context.
The [request] object is read-only. To only listen for requests from a particular
page, use [`event: Page.request`].

In order to intercept and mutate requests, see [`method: BrowserContext.route`]
or [`method: Page.route`].

## event: BrowserContext.requestFailed
* since: v1.12
- argument: <[Request]>

Emitted when a request fails, for example by timing out. To only listen for
failed requests from a particular page, use [`event: Page.requestFailed`].

:::note
HTTP Error responses, such as 404 or 503, are still successful responses from HTTP standpoint, so request will complete
with [`event: BrowserContext.requestFinished`] event and not with [`event: BrowserContext.requestFailed`].
:::

## event: BrowserContext.requestFinished
* since: v1.12
- argument: <[Request]>

Emitted when a request finishes successfully after downloading the response body. For a successful response, the
sequence of events is `request`, `response` and `requestfinished`. To listen for
successful requests from a particular page, use [`event: Page.requestFinished`].

## event: BrowserContext.response
* since: v1.12
- argument: <[Response]>

Emitted when [response] status and headers are received for a request. For a successful response, the sequence of events
is `request`, `response` and `requestfinished`. To listen for response events
from a particular page, use [`event: Page.response`].

## event: BrowserContext.serviceWorker
* since: v1.11
- argument: <[Worker]>

:::note
Service workers are only supported on Chromium-based browsers.
:::

Emitted when new service worker is created in the context.

## async method: BrowserContext.addCookies
* since: v1.8

Adds cookies into this browser context. All pages within this context will have these cookies installed. Cookies can be
obtained via [`method: BrowserContext.cookies`].

**Usage**

```js
await browserContext.addCookies([cookieObject1, cookieObject2]);
```

### param: BrowserContext.addCookies.cookies = %%-add-cookies-param-%%
* since: v1.8

## async method: BrowserContext.addInitScript
* since: v1.8
- returns: <[Disposable]>

Adds a script which would be evaluated in one of the following scenarios:
* Whenever a page is created in the browser context or is navigated.
* Whenever a child frame is attached or navigated in any page in the browser context. In this case, the script is
  evaluated in the context of the newly attached frame.

The script is evaluated after the document was created but before any of its scripts were run. This is useful to amend
the JavaScript environment, e.g. to seed `Math.random`.

**Usage**

An example of overriding `Math.random` before the page loads:

```js browser
// preload.js
Math.random = () => 42;
```

```js
// In your playwright script, assuming the preload.js file is in same directory.
await browserContext.addInitScript({
  path: 'preload.js'
});
```

:::note
The order of evaluation of multiple scripts installed via [`method: BrowserContext.addInitScript`] and
[`method: Page.addInitScript`] is not defined.
:::

### param: BrowserContext.addInitScript.script
* since: v1.8
- `script` <[function]|[string]|[Object]>
  - `path` ?<[path]> Path to the JavaScript file. If `path` is a relative path, then it is resolved relative to the
    current working directory. Optional.
  - `content` ?<[string]> Raw script content. Optional.

Script to be evaluated in all pages in the browser context.

### param: BrowserContext.addInitScript.arg
* since: v1.8
- `arg` ?<[Serializable]>

Optional argument to pass to [`param: script`] (only supported when passing a function).

### option: BrowserContext.addInitScript.exposeFunctions = %%-js-init-script-expose-functions-%%
* since: v1.62

## method: BrowserContext.backgroundPages
* since: v1.11
* deprecated: Background pages have been removed from Chromium together with Manifest V2 extensions.
- returns: <[Array]<[Page]>>

Returns an empty list.

## method: BrowserContext.browser
* since: v1.8
- returns: <[null]|[Browser]>

Gets the browser instance that owns the context. Returns `null` if the context is created outside of normal browser, e.g. Android or Electron.

## async method: BrowserContext.clearCookies
* since: v1.8

Removes cookies from context. Accepts optional filter.

**Usage**

```js
await context.clearCookies();
await context.clearCookies({ name: 'session-id' });
await context.clearCookies({ domain: 'my-origin.com' });
await context.clearCookies({ domain: /.*my-origin\.com/ });
await context.clearCookies({ path: '/api/v1' });
await context.clearCookies({ name: 'session-id', domain: 'my-origin.com' });
```

### option: BrowserContext.clearCookies.name = %%-clear-cookies-option-name-%%
* since: v1.43

### option: BrowserContext.clearCookies.domain = %%-clear-cookies-option-domain-%%
* since: v1.43

### option: BrowserContext.clearCookies.path = %%-clear-cookies-option-path-%%
* since: v1.43

## async method: BrowserContext.clearPermissions
* since: v1.8

Clears all permission overrides for the browser context.

**Usage**

```js
const context = await browser.newContext();
await context.grantPermissions(['clipboard-read']);
// do stuff ..
context.clearPermissions();
```

## async method: BrowserContext.close
* since: v1.8

Closes the browser context. All the pages that belong to the browser context will be closed.

:::note
The default browser context cannot be closed.
:::

## async method: BrowserContext.cookies
* since: v1.8
- returns: "Cookie" <[Array]<[Object]>>
  * alias-csharp: BrowserContextCookiesResult
  - `name` <[string]>
  - `value` <[string]>
  - `domain` <[string]>
  - `path` <[string]>
  - `expires` <[float]> Unix time in seconds.
  - `httpOnly` <[boolean]>
  - `secure` <[boolean]>
  - `sameSite` "SameSiteAttribute" <"Strict"|"Lax"|"None">
  - `partitionKey` ?<[string]>

If no URLs are specified, this method returns all cookies. If URLs are specified, only cookies that affect those URLs
are returned.

### param: BrowserContext.cookies.urls = %%-cookies-param-urls-%%
* since: v1.8

## async method: BrowserContext.exposeBinding
* since: v1.8
- returns: <[Disposable]>

The method adds a function called [`param: name`] on the `window` object of every frame in every page in the context.
When called, the function executes [`param: callback`] and returns a [Promise] which resolves to the return value of
[`param: callback`]. If the [`param: callback`] returns a [Promise], it will be awaited.

The first argument of the [`param: callback`] function contains information about the caller: `{ browserContext:
BrowserContext, page: Page, frame: Frame }`.

See [`method: Page.exposeBinding`] for page-only version.

**Usage**

An example of exposing page URL to all frames in all pages in the context:

```js
const { webkit } = require('playwright');  // Or 'chromium' or 'firefox'.

(async () => {
  const browser = await webkit.launch({ headless: false });
  const context = await browser.newContext();
  await context.exposeBinding('pageURL', ({ page }) => page.url());
  const page = await context.newPage();
  await page.setContent(`
    <script>
      async function onClick() {
        document.querySelector('div').textContent = await window.pageURL();
      }
    </script>
    <button onclick="onClick()">Click me</button>
    <div></div>
  `);
  await page.getByRole('button').click();
})();
```

### param: BrowserContext.exposeBinding.name
* since: v1.8
- `name` <[string]>

Name of the function on the window object.

### param: BrowserContext.exposeBinding.callback
* since: v1.8
- `callback` "BindingCallback" <[function]>

Callback function that will be called in the Playwright's context.

## async method: BrowserContext.exposeFunction
* since: v1.8
- returns: <[Disposable]>

The method adds a function called [`param: name`] on the `window` object of every frame in every page in the context.
When called, the function executes [`param: callback`] and returns a [Promise] which resolves to the return value of
[`param: callback`].

If the [`param: callback`] returns a [Promise], it will be awaited.

See [`method: Page.exposeFunction`] for page-only version.

**Usage**

An example of adding a `sha256` function to all pages in the context:

```js
const { webkit } = require('playwright');  // Or 'chromium' or 'firefox'.
const crypto = require('crypto');

(async () => {
  const browser = await webkit.launch({ headless: false });
  const context = await browser.newContext();
  await context.exposeFunction('sha256', text =>
    crypto.createHash('sha256').update(text).digest('hex'),
  );
  const page = await context.newPage();
  await page.setContent(`
    <script>
      async function onClick() {
        document.querySelector('div').textContent = await window.sha256('PLAYWRIGHT');
      }
    </script>
    <button onclick="onClick()">Click me</button>
    <div></div>
  `);
  await page.getByRole('button').click();
})();
```

### param: BrowserContext.exposeFunction.name
* since: v1.8
- `name` <[string]>

Name of the function on the window object.

### param: BrowserContext.exposeFunction.callback
* since: v1.8
- `callback` "FunctionCallback" <[function]>

Callback function that will be called in the Playwright's context.

## async method: BrowserContext.grantPermissions
* since: v1.8

Grants specified permissions to the browser context. Only grants corresponding permissions to the given origin if
specified.

### param: BrowserContext.grantPermissions.permissions
* since: v1.8
- `permissions` <[Array]<[string]>>

A list of permissions to grant.

:::danger
Supported permissions differ between browsers, and even between different versions of the same browser. Any permission may stop working after an update.
:::

Here are some permissions that may be supported by some browsers:
* `'accelerometer'`
* `'ambient-light-sensor'`
* `'background-sync'`
* `'camera'`
* `'clipboard-read'`
* `'clipboard-write'`
* `'geolocation'`
* `'gyroscope'`
* `'local-fonts'`
* `'local-network-access'`
* `'magnetometer'`
* `'microphone'`
* `'midi-sysex'` (system-exclusive midi)
* `'midi'`
* `'notifications'`
* `'payment-handler'`
* `'storage-access'`
* `'screen-wake-lock'`

### option: BrowserContext.grantPermissions.origin
* since: v1.8
- `origin` <[string]>

The [origin] to grant permissions to, e.g. "https://example.com".

## method: BrowserContext.isClosed
* since: v1.59
- returns: <[boolean]>

Indicates that the browser context is in the process of closing or has already been closed.

## async method: BrowserContext.newCDPSession
* since: v1.11
- returns: <[CDPSession]>

:::note
CDP sessions are only supported on Chromium-based browsers.
:::

Returns the newly created session.

### param: BrowserContext.newCDPSession.page
* since: v1.11
- `page` <[Page]|[Frame]>

Target to create new session for. For backwards-compatibility, this parameter is
named `page`, but it can be a `Page` or `Frame` type.

## async method: BrowserContext.newPage
* since: v1.8
- returns: <[Page]>

Creates a new page in the browser context.

## method: BrowserContext.pages
* since: v1.8
- returns: <[Array]<[Page]>>

Returns all open pages in the context.

## async method: BrowserContext.removeAllListeners
* since: v1.47

Removes all the listeners of the given type (or all registered listeners if no type given).
Allows to wait for async listeners to complete or to ignore subsequent errors from these listeners.

### param: BrowserContext.removeAllListeners.type
* since: v1.47
- `type` ?<[string]>

### option: BrowserContext.removeAllListeners.behavior = %%-remove-all-listeners-options-behavior-%%
* since: v1.47

## property: BrowserContext.request
* since: v1.16
  - alias-csharp: APIRequest
- type: <[APIRequestContext]>

API testing helper associated with this context. Requests made with this API will use context cookies.

## async method: BrowserContext.route
* since: v1.8
- returns: <[Disposable]>

Routing provides the capability to modify network requests that are made by any page in the browser context. Once route
is enabled, every request matching the url pattern will stall unless it's continued, fulfilled or aborted.

:::note
[`method: BrowserContext.route`] will not intercept requests intercepted by Service Worker. See [this](https://github.com/microsoft/playwright/issues/1090) issue. We recommend disabling Service Workers when using request interception by setting [`option: Browser.newContext.serviceWorkers`] to `'block'`.
:::

**Usage**

An example of a naive handler that aborts all image requests:

```js
const context = await browser.newContext();
await context.route('**/*.{png,jpg,jpeg}', route => route.abort());
const page = await context.newPage();
await page.goto('https://example.com');
await browser.close();
```

or the same snippet using a regex pattern instead:

```js
const context = await browser.newContext();
await context.route(/(\.png$)|(\.jpg$)/, route => route.abort());
const page = await context.newPage();
await page.goto('https://example.com');
await browser.close();
```

It is possible to examine the request to decide the route action. For example, mocking all requests that contain some post data, and leaving all other requests as is:

```js
await context.route('/api/**', async route => {
  if (route.request().postData().includes('my-string'))
    await route.fulfill({ body: 'mocked-data' });
  else
    await route.continue();
});
```

Page routes (set up with [`method: Page.route`]) take precedence over browser context routes when request matches both
handlers.

To remove a route with its handler you can use [`method: BrowserContext.unroute`].

:::note
Enabling routing disables http cache.
:::

### param: BrowserContext.route.url
* since: v1.8
- `url` <[string]|[RegExp]|[URLPattern]|[function]\([URL]\):[boolean]>

A glob pattern, regex pattern, URL pattern, or predicate that receives a [URL] to match during routing. If [`option: Browser.newContext.baseURL`] is set in the context options and the provided URL is a string that does not start with `*`, it is resolved using the [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL) constructor.

### param: BrowserContext.route.handler
* since: v1.8
- `handler` <[function]\([Route], [Request]\): [Promise<any>|any]>

handler function to route the request.

### option: BrowserContext.route.times
* since: v1.15
- `times` <[int]>

How often a route should be used. By default it will be used every time.

## async method: BrowserContext.routeFromHAR
* since: v1.23

If specified the network requests that are made in the context will be served from the HAR file. Read more about [Replaying from HAR](../mock.md#replaying-from-har).

Playwright will not serve requests intercepted by Service Worker from the HAR file. See [this](https://github.com/microsoft/playwright/issues/1090) issue. We recommend disabling Service Workers when using request interception by setting [`option: Browser.newContext.serviceWorkers`] to `'block'`.

### param: BrowserContext.routeFromHAR.har
* since: v1.23
- `har` <[path]>

Path to a [HAR](http://www.softwareishard.com/blog/har-12-spec) file with prerecorded network data. If `path` is a relative path, then it is resolved relative to the current working directory.

### option: BrowserContext.routeFromHAR.notFound
* since: v1.23
- `notFound` "HarNotFound" ?<"abort"|"fallback">
* If set to 'abort' any request not found in the HAR file will be aborted.
* If set to 'fallback' falls through to the next route handler in the handler chain.

Defaults to abort.

### option: BrowserContext.routeFromHAR.update
* since: v1.23
- `update` ?<boolean>

If specified, updates the given HAR with the actual network information instead of serving from file. The file is written to disk when [`method: BrowserContext.close`] is called.

### option: BrowserContext.routeFromHAR.url
* since: v1.23
- `url` <[string]|[RegExp]>

A glob pattern, regular expression or predicate to match the request URL. Only requests with URL matching the pattern will be served from the HAR file. If not specified, all requests are served from the HAR file.

### option: BrowserContext.routeFromHAR.updateMode
* since: v1.32
- `updateMode` "HarMode" <"full"|"minimal">

When set to `minimal`, only record information necessary for routing from HAR. This omits sizes, timing, page, cookies, security and other types of HAR information that are not used when replaying from HAR. Defaults to `minimal`.

### option: BrowserContext.routeFromHAR.updateContent
* since: v1.32
- `updateContent` "RouteFromHarUpdateContentPolicy" <"embed"|"attach">

Optional setting to control resource content management. If `attach` is specified, resources are persisted as separate files or entries in the ZIP archive. If `embed` is specified, content is stored inline the HAR file.

## async method: BrowserContext.routeWebSocket
* since: v1.48

This method allows to modify websocket connections that are made by any page in the browser context.

Note that only `WebSocket`s created after this method was called will be routed. It is recommended to call this method before creating any pages.

**Usage**

Below is an example of a simple handler that blocks some websocket messages.
See [WebSocketRoute] for more details and examples.

```js
await context.routeWebSocket('/ws', ws => {
  const server = ws.connectToServer();
  ws.onMessage(message => {
    if (message === 'to-be-blocked')
      return;
    server.send(message);
  });
});
```

### param: BrowserContext.routeWebSocket.url
* since: v1.48
- `url` <[string]|[RegExp]|[function]\([URL]\):[boolean]>

Only WebSockets with the url matching this pattern will be routed. A string pattern can be relative to the [`option: Browser.newContext.baseURL`] context option.

### param: BrowserContext.routeWebSocket.handler
* since: v1.48
- `handler` <[function]\([WebSocketRoute]\): [Promise<any>|any]>

Handler function to route the WebSocket.

## method: BrowserContext.serviceWorkers
* since: v1.11
- returns: <[Array]<[Worker]>>

:::note
Service workers are only supported on Chromium-based browsers.
:::

All existing service workers in the context.

## method: BrowserContext.setDefaultNavigationTimeout
* since: v1.8

This setting will change the default maximum navigation time for the following methods and related shortcuts:
* [`method: Page.goBack`]
* [`method: Page.goForward`]
* [`method: Page.goto`]
* [`method: Page.reload`]
* [`method: Page.setContent`]
* [`method: Page.waitForNavigation`]

:::note
[`method: Page.setDefaultNavigationTimeout`] and [`method: Page.setDefaultTimeout`] take priority over
[`method: BrowserContext.setDefaultNavigationTimeout`].
:::

### param: BrowserContext.setDefaultNavigationTimeout.timeout
* since: v1.8
- `timeout` <[float]>

Maximum navigation time in milliseconds

## method: BrowserContext.setDefaultTimeout
* since: v1.8

This setting will change the default maximum time for all the methods accepting [`param: timeout`] option.

:::note
[`method: Page.setDefaultNavigationTimeout`], [`method: Page.setDefaultTimeout`] and
[`method: BrowserContext.setDefaultNavigationTimeout`] take priority over [`method: BrowserContext.setDefaultTimeout`].
:::

### param: BrowserContext.setDefaultTimeout.timeout
* since: v1.8
- `timeout` <[float]>

Maximum time in milliseconds. Pass `0` to disable timeout.

## async method: BrowserContext.setExtraHTTPHeaders
* since: v1.8

The extra HTTP headers will be sent with every request initiated by any page in the context. These headers are merged
with page-specific extra HTTP headers set with [`method: Page.setExtraHTTPHeaders`]. If page overrides a particular
header, page-specific header value will be used instead of the browser context header value.

:::note
[`method: BrowserContext.setExtraHTTPHeaders`] does not guarantee the order of headers in the outgoing requests.
:::

### param: BrowserContext.setExtraHTTPHeaders.headers
* since: v1.8
- `headers` <[Object]<[string], [string]>>

An object containing additional HTTP headers to be sent with every request. All header values must be strings.

## async method: BrowserContext.setGeolocation
* since: v1.8

Sets the context's geolocation. Passing `null` or `undefined` emulates position unavailable.

**Usage**

```js
await browserContext.setGeolocation({ latitude: 59.95, longitude: 30.31667 });
```

:::note
Consider using [`method: BrowserContext.grantPermissions`] to grant permissions for the browser context pages to read
its geolocation.
:::

### param: BrowserContext.setGeolocation.geolocation
* since: v1.8
- `geolocation` "Geolocation" <[null]|[Object]>
  - `latitude` <[float]> Latitude between -90 and 90.
  - `longitude` <[float]> Longitude between -180 and 180.
  - `accuracy` ?<[float]> Non-negative accuracy value. Defaults to `0`.

## async method: BrowserContext.setHTTPCredentials
* since: v1.8

Sets the credentials for HTTP authentication for this browser context.

:::note
Browsers may cache credentials per origin after a successful authentication, so changing credentials for an origin that has already been authenticated may have no effect.
:::

### param: BrowserContext.setHTTPCredentials.httpCredentials
* since: v1.8
- `httpCredentials` <[null]|[Object]|[Array]<[Object]>>
  - `username` <[string]>
  - `password` <[string]>
  - `origin` ?<[string]> Restrain sending http credentials on specific origin (scheme://host:port).

Pass an array to use different credentials for different origins. The first entry that matches the request origin is used, and entries with no origin match any request.

## async method: BrowserContext.setOffline
* since: v1.8

### param: BrowserContext.setOffline.offline
* since: v1.8
- `offline` <[boolean]>

Whether to emulate network being offline for the browser context.

:::note
Offline emulation only affects requests that go through the browser's regular network stack, such as page navigations, `fetch()`, `XMLHttpRequest` and WebSockets. It does not affect WebRTC traffic: established `RTCPeerConnection`s keep sending and receiving media over UDP. To test WebRTC connection loss, interrupt the connection outside the browser, for example by stopping the TURN server or using an OS-level firewall.
:::

## async method: BrowserContext.storageState
* since: v1.8
- returns: "StorageState" <[Object]>
  - `cookies` "StorageStateCookie" <[Array]<[Object]>>
    - `name` <[string]>
    - `value` <[string]>
    - `domain` <[string]>
    - `path` <[string]>
    - `expires` <[float]> Unix time in seconds.
    - `httpOnly` <[boolean]>
    - `secure` <[boolean]>
    - `sameSite` "SameSiteAttribute" <"Strict"|"Lax"|"None">
  - `origins` "OriginState" <[Array]<[Object]>>
    - `origin` <[string]>
    - `localStorage` "LocalStorageEntry" <[Array]<[Object]>>
      - `name` <[string]>
      - `value` <[string]>

Returns storage state for this browser context, contains current cookies, local storage snapshot, IndexedDB snapshot, origin private file system snapshot and virtual WebAuthn credentials.

## async method: BrowserContext.setStorageState
* since: v1.59

Clears the existing cookies, local storage, IndexedDB entries, origin private file system entries and virtual WebAuthn credentials, and sets the new storage
state. When the storage state contains credentials, the virtual WebAuthn authenticator is installed (equivalent to
[`method: Credentials.install`]), preventing all real authenticators from working in this context.

**Usage**

```js
// Load storage state from a file and apply it to the context.
await context.setStorageState('state.json');
```

### param: BrowserContext.setStorageState.storageState = %%-js-python-context-option-storage-state-%%
* since: v1.59

## property: BrowserContext.tracing
* since: v1.12
- type: <[Tracing]>

## async method: BrowserContext.unrouteAll
* since: v1.41

Removes all routes created with [`method: BrowserContext.route`] and [`method: BrowserContext.routeFromHAR`].

### option: BrowserContext.unrouteAll.behavior = %%-unroute-all-options-behavior-%%
* since: v1.41

## async method: BrowserContext.unroute
* since: v1.8

Removes a route created with [`method: BrowserContext.route`]. When [`param: handler`] is not specified, removes all
routes for the [`param: url`].

### param: BrowserContext.unroute.url
* since: v1.8
- `url` <[string]|[RegExp]|[URLPattern]|[function]\([URL]\):[boolean]>

A glob pattern, regex pattern, URL pattern, or predicate receiving [URL] used to register a routing with
[`method: BrowserContext.route`].

### param: BrowserContext.unroute.handler
* since: v1.8
- `handler` ?<[function]\([Route], [Request]\): [Promise<any>|any]>

Optional handler function used to register a routing with [`method: BrowserContext.route`].

## async method: BrowserContext.waitForEvent
* since: v1.8
  - alias-python: expect_event
- returns: <[any]>

Waits for event to fire and passes its value into the predicate function. Returns when the predicate returns truthy
value. Will throw an error if the context closes before the event is fired. Returns the event data value.

**Usage**

```js
const pagePromise = context.waitForEvent('page');
await page.getByRole('button').click();
const page = await pagePromise;
```

