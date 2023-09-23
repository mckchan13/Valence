export class Deferred<T = unknown, E = Error> {
  public promise: Promise<T>;
  public resolve: (value: T | PromiseLike<T>) => void = () => null;
  public reject: (reason?: E) => void = () => null;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
