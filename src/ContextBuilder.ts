import { MessagePortMain } from "electron";
import {
  ValenceBuilder,
  ValenceContext,
  ValenceDatasources,
  ValenceMainRequest,
  ValenceResponse,
  ValenceResponseStatus,
} from "./types";

class ValenceContextBuilder implements ValenceBuilder<ValenceContext> {
  private datasources: ValenceDatasources = {};
  private request: ValenceMainRequest | undefined = undefined;
  private response: ValenceResponse | undefined = undefined;
  private port: MessagePortMain | undefined = undefined;

  constructor(public config?: { datasources?: ValenceDatasources }) {
    if (this.config !== undefined && this.config.datasources !== undefined) {
      this.loadDatasources(this.config.datasources);
    }
  }

  public build(): ValenceContext {
    this.assertsValueIsDefined(this.request);
    this.assertsValueIsDefined(this.response);
    this.assertsValueIsDefined(this.port);

    const request: ValenceMainRequest = this.request;
    const response: ValenceResponse = this.response;
    const datasources: Record<string, unknown> = this.datasources;

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

  public loadDatasources(
    datasources: Record<string | number | symbol, unknown>
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
    this.assertsValueIsDefined(this.request);
    this.assertsValueIsDefined(this.port);

    const { method, route } = this.request;

    const port = this.port;

    const response: ValenceResponse = {
      method,
      port: port,
      payload: undefined,
      status: "pending",
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

  private assertsValueIsDefined<T>(
    value: unknown
  ): asserts value is NonNullable<T> {
    if (value === undefined || value === null) {
      throw new Error("Value is undefined or null.");
    }
  }
}

export default ValenceContextBuilder;
