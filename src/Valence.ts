import { MessagePortMain } from "electron";
import ValenceContextBuilder from "./ContextBuilder";
import {
  ValenceMiddleware,
  ElectronPorts,
  ValenceContext,
  ValenceRoute,
  ValenceRequestObject,
  ValenceDatasources,
} from "./types";

export class Valence {
  private contextBuilder = new ValenceContextBuilder();
  private routesMap = new Map<string, ValenceRoute>();
  private preHooks: ValenceMiddleware[] = [];
  private process: NodeJS.Process;

  /**
   * @constructor Provide an optional config objects that specifies datasources
   * will become available in the context object of the middleware functions.
   * @param config An optional configuration object houses any datasources (databases, external APIs).
   * Datasources will be available in the context object of the middleware functions
   */
  constructor(public config?: { datasources?: ValenceDatasources }) {
    this.process = process;

    if (this.config && this.config.datasources) {
      this.contextBuilder.loadDatasources(this.config.datasources);
    }
  }

  /**
   * A method to append middleware functions that run before all routes execute.
   * @param middleware Any middleware functions that will receive a context object
   * and a call to the next function in the middleware pipeline.
   * @return Valences instance - Optionally chain additional calls to usePreHook
   */
  public usePreHook(...middleware: ValenceMiddleware[]): Valence {
    this.preHooks.push(...middleware);
    return this;
  }

  /**
   * A method to append middleware functions that runs on the specified route.
   * @param routeName The specified route to run the middleware functions on.
   * @param middleware Any middleware functions that will receive a context object
   * and a call to the next function in the middleware pipeline.
   * @return Valences instance - Optionally chain additional calls to use
   */
  public use(routeName: string, ...middleware: ValenceMiddleware[]): Valence {
    if (!this.routesMap.has(routeName)) {
      this.routesMap.set(routeName, { pipeline: [], executor: undefined });
    }
    const pipeline = this.routesMap.get(routeName)?.pipeline;
    if (pipeline !== undefined) {
      pipeline.push(...middleware);
    }
    return this;
  }

  /**
   * A method to load a datasource. Datasources will be available via the context object in middleware functions.
   * @param datasources A user specified object containing references to the datasources.
   * @return void
   */
  public loadDatasource(
    datasources: ValenceDatasources<string, unknown>
  ): void {
    this.contextBuilder.loadDatasources(datasources);
  }

  /**
   * A method to add a datasource. Datasources will be available via the context object in middleware functions.
   * @param key A key to identify the data source in the datasource object.
   * @param datasources A user specified object containing references to the datasources.
   */
  public addDatasource<T = unknown>(key: string, datasource: T): void {
    this.contextBuilder.setDatasource(key, datasource);
  }

  /**
   * A method when called, sets the event listener on a specified port.
   * The default port is the parentPort of the the spawned Node.js process.
   * @param port By default the listener is set to the parentPort.
   * If a port is specified, the listener will be set on the specified port.
   * @param callback An optional callback that will run after setting the port listener.
   * The port being listened to will be exposed as the first argument of the callback.
   * By default, the port is the parentPort of the spawned Node.js process.
   */
  public listen(callback?: (port: ElectronPorts) => void): void;
  public listen(
    port?: ElectronPorts,
    callback?: (port?: ElectronPorts) => void
  ): void;
  public listen(
    portOrCallback?: ElectronPorts | ((port: ElectronPorts) => void),
    callback?: (port: ElectronPorts) => void
  ): void {
    this.buildAllPipelines();

    let port: ElectronPorts = this.process.parentPort;

    if (portOrCallback !== undefined && typeof portOrCallback !== "function") {
      port = portOrCallback;
    } else if (portOrCallback !== undefined) {
      port = this.process.parentPort;
      callback = portOrCallback;
    }

    port.on("message", async ({ data, ports }: Electron.MessageEvent) => {
      const request: ValenceRequestObject = data;
      const portToReceiver = ports[0];
      await this.mediateRequest(request, portToReceiver);
    });

    if (callback !== undefined) {
      callback(port);
    }
  }

  private async mediateRequest(
    request: ValenceRequestObject,
    port: MessagePortMain
  ): Promise<void> {
    const route = this.routesMap.get(request.route);

    if (route === undefined) {
      throw new Error("Route not found");
    }

    if (route.executor === undefined) {
      throw new Error("No executor found");
    }

    const ctx = this.contextBuilder
      .loadRequest(request)
      .loadPort(port)
      .loadResponse()
      .build();

    await route.executor(ctx);
  }

  private buildAllPipelines(): void {
    for (const [, route] of this.routesMap) {
      const { pipeline } = route;
      route.pipeline = [...this.preHooks, ...pipeline];
      route.executor = this.buildPipelineExecutor(route.pipeline);
    }
  }

  private buildPipelineExecutor(pipeline: ValenceMiddleware[]) {
    return async (ctx: ValenceContext) => {
      let prevIdx = -1;
      const runner = async (idx: number): Promise<void> => {
        if (idx === prevIdx) throw new SyntaxError("Next was called twice.");
        prevIdx = idx;
        const func = pipeline[idx];
        if (func !== undefined) {
          await func(ctx, () => runner(idx + 1));
        }
      };

      await runner(0);
    };
  }
}
