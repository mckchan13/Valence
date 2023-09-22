import { MessagePortMain } from "electron";
import {
  Datasources,
  ValenceContext,
  ValenceMainRequest,
  ValenceResponse,
  ValenceResponseStatus,
} from "./types";

class ValenceContextBuilder {
  private datasources: Datasources<string, unknown> = {};
  private request: ValenceMainRequest | undefined = undefined;
  private response: ValenceResponse | undefined = undefined;
  private port: MessagePortMain | undefined = undefined;

  constructor(public config?: { datasources?: Datasources<string, unknown> }) {
    if (this.config !== undefined && this.config.datasources !== undefined) {
      this.loadDatasources(this.config.datasources);
    }
  }

  public build(): ValenceContext {
    if (
      this.request === undefined ||
      this.response === undefined ||
      this.port === undefined
    ) {
      throw new Error(
        "No request or response was loaded, context not ready to build."
      );
    }

    const request: ValenceMainRequest = this.request;
    const response: ValenceResponse = this.response;
    const datasources: Datasources<string, unknown> = this.datasources;

    const context: ValenceContext = {
      request,
      response,
      datasources,
      body: {},
    };

    this.reset();

    return context;
  }

  public setDatasource(
    key: string,
    datasource: unknown
  ): ValenceContextBuilder {
    this.datasources[key] = datasource;
    return this;
  }

  public getDatasources(): Datasources<string, unknown> {
    return this.datasources;
  }

  public loadDatasources(
    datasources: Datasources<string, unknown>
  ): ValenceContextBuilder {
    this.datasources = datasources;
    return this;
  }

  public loadPort(port: MessagePortMain): ValenceContextBuilder {
    this.port = port;
    return this;
  }

  public loadRequest(request: ValenceMainRequest): ValenceContextBuilder {
    this.request = request;
    return this;
  }

  public loadResponse(): ValenceContextBuilder {
    if (this.request === undefined || this.port === undefined) {
      throw new Error("No request loaded. No response can be generated.");
    }

    const { method, route } = this.request;

    const port = this.port;

    const response: ValenceResponse = {
      method,
      status: "pending",
      port: port,
      payload: undefined,
      route,
      setStatus: function (status: ValenceResponseStatus) {
        this.status = status;
      },
      send: function (payload: unknown): void {
        this.payload = payload;
        this.setStatus("success");
        const { method, route, port, status } = this;
        port.start();
        port.postMessage({
          method,
          route,
          status,
          payload,
        });
      },
    };

    response.send.bind(response);
    response.setStatus.bind(response);

    this.response = response;

    return this;
  }

  private reset(): void {
    this.request = undefined;
    this.response = undefined;
  }
}

export default ValenceContextBuilder;
