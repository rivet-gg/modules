import { _exited } from "./process.js";
import { exposeCustomGlobal } from "../global-exposure.js";
import { bridgeDispatchSync } from "../transport.js";
import { _immediateEntries, _timerEntries, clearImmediate, clearTimeout2 } from "./timers.js";

var HANDLE_DISPATCH = {
  register: "kernelHandleRegister",
  unregister: "kernelHandleUnregister",
  list: "kernelHandleList"
};
var _activeHandles = /* @__PURE__ */ new Map();
// Optional close callbacks, keyed like _activeHandles.
var _handleClosers = /* @__PURE__ */ new Map();
var _waitResolvers = [];

var _activeHandleDrainScheduled = false;

function scheduleActiveHandleDrain() {
  if (_activeHandleDrainScheduled) return;
  _activeHandleDrainScheduled = true;
  const defer =
    typeof globalThis.setImmediate === "function"
      ? globalThis.setImmediate
      : queueMicrotask;
  defer(() => {
    _activeHandleDrainScheduled = false;
    if (_activeHandles.size !== 0 || _waitResolvers.length === 0) return;
    const resolvers = _waitResolvers;
    _waitResolvers = [];
    for (const resolve of resolvers) resolve();
  });
}

function _registerHandle2(id, description, close) {
  try {
    bridgeDispatchSync(HANDLE_DISPATCH.register, id, description);
  } catch (error) {
    if (error instanceof Error && error.message.includes("EAGAIN")) {
      throw new Error(
        "ERR_RESOURCE_BUDGET_EXCEEDED: maximum active handles exceeded"
      );
    }
    throw error;
  }
  _activeHandles.set(id, description);
  if (typeof close === "function") _handleClosers.set(id, close);
}
function _unregisterHandle2(id) {
  _activeHandles.delete(id);
  _handleClosers.delete(id);
  const remaining = _activeHandles.size;
  try {
    bridgeDispatchSync(HANDLE_DISPATCH.unregister, id);
  } catch {
  }
  if (remaining === 0 && _waitResolvers.length > 0) scheduleActiveHandleDrain();
}
function _waitForActiveHandles() {
  if (typeof _exited !== "undefined" && _exited) {
    return Promise.resolve();
  }
  const getPendingTimerCount = globalThis._getPendingTimerCount;
  const waitForTimerDrain = globalThis._waitForTimerDrain;
  const hasHandles = _getActiveHandles().length > 0;
  const hasTimers =
    typeof getPendingTimerCount === "function" && getPendingTimerCount() > 0;
  if (!hasHandles && !hasTimers) {
    return Promise.resolve();
  }
  const promises = [];
  if (hasHandles) {
    promises.push(
      new Promise((resolve) => {
        let settled = false;
        const complete = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        _waitResolvers.push(complete);
        if (_getActiveHandles().length === 0) {
          complete();
        }
      })
    );
  }
  if (hasTimers && typeof waitForTimerDrain === "function") {
    promises.push(waitForTimerDrain());
  }
  return Promise.all(promises).then(() => {
    const timersRemain =
      typeof getPendingTimerCount === "function" && getPendingTimerCount() > 0;
    if (_getActiveHandles().length > 0 || timersRemain) {
      return _waitForActiveHandles();
    }
  });
}
// A context call or evaluation completes when its result settles. Anything it
// left behind would otherwise stay frozen in the idle context, so cancel the
// timers, close the closable handles, and report both on stderr.
function _releaseLeftoverHandles() {
  const released = [];
  for (const [id, entry] of Array.from(_timerEntries)) {
    clearTimeout2(id);
    released.push(entry.repeat ? "setInterval" : "setTimeout");
  }
  for (const id of Array.from(_immediateEntries.keys())) {
    clearImmediate(id);
    released.push("setImmediate");
  }
  for (const [id, close] of Array.from(_handleClosers)) {
    if (!_handleClosers.has(id)) continue;
    released.push(String(_activeHandles.get(id)).split(":")[0]);
    _handleClosers.delete(id);
    close();
  }
  if (released.length === 0 || typeof _error === "undefined") return;
  const counts = new Map();
  for (const name of released) counts.set(name, (counts.get(name) ?? 0) + 1);
  const summary = Array.from(counts, ([name, count]) => `${name} x${count}`).join(", ");
  _error.applySync(void 0, [
    `agentOS: the call completed with work still pending; cancelled ${summary}`
  ]);
}
function _getActiveHandles() {
  return Array.from(_activeHandles.values());
}
exposeCustomGlobal("_registerHandle", _registerHandle2);
exposeCustomGlobal("_unregisterHandle", _unregisterHandle2);
exposeCustomGlobal("_waitForActiveHandles", _waitForActiveHandles);
exposeCustomGlobal("_getActiveHandles", _getActiveHandles);
exposeCustomGlobal("_releaseLeftoverHandles", _releaseLeftoverHandles);
export { HANDLE_DISPATCH, _activeHandles, _waitResolvers, _registerHandle2, _unregisterHandle2, _waitForActiveHandles, _getActiveHandles };
