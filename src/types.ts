import { MessagePortMain } from "electron";

export type ValenceMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ValenceResponseStatus = "success" | "failure" | "pending" | string;

export type ElectronPorts = Electron.ParentPort | MessagePortMain;

export type ValenceDatasources<
  T extends string | number | symbol = string,
  K = unknown
> = Record<T, K>;

export type ValenceExecutor = (ctx: ValenceContext) => void | Promise<void>;

export type ValenceMainRequest<T = unknown> = Readonly<ValenceRequest<T>>;

export type ValenceRequestObject<T = unknown, K = string> = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  route: K;
  payload: T;
  channel: string;
};

export type ValenceMainResponseMethods = {
  setStatus: (status: ValenceResponseStatus) => void;
  send: (
    payload: unknown,
    transfer?: MessagePortMain[]
  ) => void | Promise<void>;
};

export type ValenceRequest<T = unknown> = {
  method: ValenceMethods;
  route: string;
  payload: T;
};

export type ValenceResponse<T = unknown> = {
  readonly method: ValenceMethods;
  readonly route: string;
  status: ValenceResponseStatus;
  payload: T;
  port: MessagePortMain;
  setStatus: ValenceMainResponseMethods["setStatus"];
  send: ValenceMainResponseMethods["send"];
};

export type ValenceRendererResponse<T = unknown> = Omit<
  Readonly<ValenceResponse<T>>,
  keyof ValenceMainResponseMethods
>;

export type ValenceContext<B = unknown, D = unknown> = {
  request: ValenceMainRequest<B>;
  response: ValenceResponse<B>;
  body: B;
  datasources: ValenceDatasources<string, D>;
};

export type ValenceMiddleware = (
  ctx: ValenceContext,
  next: () => void | Promise<void>
) => void | Promise<void>;

export type ValenceRoute = {
  pipeline: ValenceMiddleware[];
  executor?: ValenceExecutor;
};

export interface ValenceBuilder<T> {
  build: () => T;
}
