declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onListen?: (params: { hostname: string; port: number }) => void;
    onError?: (error: unknown) => void;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: ServeOptions
  ): void;
}
