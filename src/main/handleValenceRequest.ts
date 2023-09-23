import {
  IpcMainInvokeEvent,
  UtilityProcess,
  MessageChannelMain,
} from "electron";

import { RequestObject, ResponseObject } from "..";
import { ElectronPorts } from "..";
import { Deferred } from "../lib/DeferredPromise";

export function handleValenceRequest(
  childOrPort: UtilityProcess | ElectronPorts
) {
  return function invokeValenceRequest<
    T extends RequestObject,
    K extends ResponseObject
  >(_event: IpcMainInvokeEvent, request: T): Promise<K> {
    const { port1, port2 } = new MessageChannelMain();
    const deferred = new Deferred<K, Error>();

    port1.on("message", ({ data }: { data: K }) => {
      deferred.resolve(data);
      process.nextTick(() => {
        port1.close();
      });
    });

    port1.start();

    childOrPort?.postMessage(request, [port2]);

    return deferred.promise;
  };
}
