# class: CDPSession
* since: v1.8

The `CDPSession` instances are used to talk raw Chrome Devtools Protocol:
* protocol methods can be called with `session.send` method.
* protocol events can be subscribed to with `session.on` method.

Useful links:
* Documentation on DevTools Protocol can be found here:
  [DevTools Protocol Viewer](https://chromedevtools.github.io/devtools-protocol/).
* Getting Started with DevTools Protocol:
  https://github.com/aslushnikov/getting-started-with-cdp/blob/master/README.md

```js
const client = await page.context().newCDPSession(page);
await client.send('Animation.enable');
client.on('Animation.animationCreated', () => console.log('Animation created!'));
const response = await client.send('Animation.getPlaybackRate');
console.log('playback rate is ' + response.playbackRate);
await client.send('Animation.setPlaybackRate', {
  playbackRate: response.playbackRate / 2
});
```

## event: CDPSession.close
* since: v1.59
- argument: <[CDPSession]>

Emitted when the session is closed, either because the target was closed or `session.detach()` was called.

## event: CDPSession.event
* since: v1.59
- argument: <[Object]>
  - `method` <[string]> CDP event name.
  - `params` ?<[Object]> CDP event parameters.

Emitted for every CDP event received from the session. Allows subscribing to all CDP events at once without knowing
their names ahead of time.

**Usage**

```js
session.on('event', ({ method, params }) => {
  console.log(`CDP event: ${method}`, params);
});
```

## async method: CDPSession.detach
* since: v1.8

Detaches the CDPSession from the target. Once detached, the CDPSession object won't emit any events and can't be used to
send messages.

## async method: CDPSession.send
* since: v1.8
- returns: <[Object]>
