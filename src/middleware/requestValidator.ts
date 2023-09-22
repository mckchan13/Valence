import { ValenceContext, ValenceMiddleware } from "../types";

export function requestValidator(): ValenceMiddleware {
  return function (
    ctx: ValenceContext,
    next: () => void | Promise<void>
  ): void | Promise<void> {
    const {
      request: { route, method, payload },
      response: { port },
    } = ctx;

    if (port === undefined) {
      throw new SyntaxError("No ports received with request");
    }

    if (route === undefined) {
      throw new SyntaxError("No route was specified in the request.");
    }

    if (method !== "GET" && payload === undefined) {
      throw new SyntaxError(
        "No payload was specified with the mutation request."
      );
    }

    return next();
  };
}
