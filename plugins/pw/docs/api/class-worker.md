# class: Worker
* since: v1.8

The Worker class represents a [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API). `worker`
event is emitted on the page object to signal a worker creation. `close` event is emitted on the worker object when the
worker is gone.

```js
page.on('worker', worker => {
  console.log('Worker created: ' + worker.url());
  worker.on('close', worker => console.log('Worker destroyed: ' + worker.url()));
});

console.log('Current workers:');
for (const worker of page.workers())
  console.log('  ' + worker.url());
```

## event: Worker.close
* since: v1.8
- argument: <[Worker]>

Emitted when this dedicated [WebWorker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) is terminated.

## event: Worker.console
* since: v1.57
- argument: <[ConsoleMessage]>

Emitted when JavaScript within the worker calls one of console API methods, e.g. `console.log` or `console.dir`.

## async method: Worker.evaluate
* since: v1.8
- returns: <[Serializable]>

Returns the return value of [`param: expression`].

If the function passed to the [`method: Worker.evaluate`] returns a [Promise], then [`method: Worker.evaluate`] would wait for the promise
to resolve and return its value.

If the function passed to the [`method: Worker.evaluate`] returns a non-[Serializable] value, then [`method: Worker.evaluate`] returns `undefined`. Playwright also supports transferring some
additional values that are not serializable by `JSON`: `-0`, `NaN`, `Infinity`, `-Infinity`.

### param: Worker.evaluate.expression = %%-evaluate-expression-%%
* since: v1.8

### param: Worker.evaluate.expression = %%-js-worker-evaluate-workerfunction-%%
* since: v1.8

### param: Worker.evaluate.arg
* since: v1.8
- `arg` ?<[EvaluationArgument]>

Optional argument to pass to [`param: expression`].

## async method: Worker.evaluateHandle
* since: v1.8
- returns: <[JSHandle]>

Returns the return value of [`param: expression`] as a [JSHandle].

The only difference between [`method: Worker.evaluate`] and
[`method: Worker.evaluateHandle`] is that [`method: Worker.evaluateHandle`]
returns [JSHandle].

If the function passed to the [`method: Worker.evaluateHandle`] returns a [Promise], then [`method: Worker.evaluateHandle`] would wait for
the promise to resolve and return its value.

### param: Worker.evaluateHandle.expression = %%-evaluate-expression-%%
* since: v1.8

### param: Worker.evaluateHandle.expression = %%-js-worker-evaluate-workerfunction-%%
* since: v1.8

### param: Worker.evaluateHandle.arg
* since: v1.8
- `arg` ?<[EvaluationArgument]>

Optional argument to pass to [`param: expression`].

## method: Worker.url
* since: v1.8
- returns: <[string]>

## async method: Worker.waitForEvent
* since: v1.57
  - alias-python: expect_event
- returns: <[any]>

Waits for event to fire and passes its value into the predicate function.
Returns when the predicate returns truthy value.
Will throw an error if the page is closed before the event is fired.
Returns the event data value.

**Usage**

```js
// Start waiting for download before clicking. Note no await.
const consolePromise = worker.waitForEvent('console');
await worker.evaluate('console.log(42)');
const consoleMessage = await consolePromise;
```

