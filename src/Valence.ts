import { MessagePortMain } from "electron";
import ValenceContextBuilder from "./ContextBuilder";
import {
  ValenceMiddleware,
  ElectronPorts,
  Datasources,
  ValenceContext,
  ValenceRoute,
  ValenceRequestObject,
} from "./types";

export class Valence {
  private contextBuilder = new ValenceContextBuilder();
  private routesMap = new Map<string, ValenceRoute>();
  private preHooks: ValenceMiddleware[] = [];
  private process: NodeJS.Process;

  constructor(public config?: { datasources?: unknown }) {
    this.process = process;

    if (this.config && this.config.datasources) {
      this.contextBuilder.loadDatasources(
        this.config.datasources as Datasources<string, unknown>
      );
    }
  }

  public usePreHook(...middleware: ValenceMiddleware[]): Valence {
    this.preHooks.push(...middleware);
    return this;
  }

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

  public loadDatasource(
    datasources: Datasources<string, unknown>
  ): ValenceContextBuilder {
    this.contextBuilder.loadDatasources(datasources);
    return this.contextBuilder;
  }

  public addDatasource<T = unknown>(key: string, datasource: T): void {
    this.contextBuilder.setDatasource(key, datasource);
  }

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
      await this.processRequest(request, portToReceiver);
    });

    if (callback !== undefined) {
      callback(port);
    }
  }

  private async processRequest(
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
