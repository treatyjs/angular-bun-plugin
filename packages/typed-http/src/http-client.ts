import { HttpClient } from "@angular/common/http";
import type { ApiSchema, EndpointDefinition, RouteKey } from "./types/api-schema";
import type { HttpTypedOptions } from "./types/http-typed-options";
import type { InferOutput, InferInput } from "./types/inference-helpers";
import { Injector, inject } from "@angular/core";
import { from, of, switchMap, type Observable } from "rxjs";
import { buildHttpRequest } from "./build-http-request";
import type { HttpResourceRequest } from "./types/http-resource-request";

export interface TypedHttpClientOptions<S extends ApiSchema> {
  baseURL: string;
  schema: S;
  injector?: Injector;
}

export class TypedHttpClient<TSchema extends ApiSchema> {
  private http: HttpClient;
  private typedOptions: TypedHttpClientOptions<TSchema>;

  constructor(
    typedOptions: TypedHttpClientOptions<TSchema>,
    injector?: Injector
  ) {
    this.typedOptions = typedOptions;
    const inj = injector || typedOptions.injector || inject(Injector);
    this.http = inj.get(HttpClient);
  }

  request<Route extends RouteKey<TSchema>>(
    route: Route,
    fetchOptions?: HttpTypedOptions<TSchema[Route]>
  ): Observable<InferOutput<TSchema[Route]>> {
    const endpoint: EndpointDefinition =
      this.typedOptions.schema[route as string];
    if (!endpoint) {
      throw new Error(`Route "${route}" is not defined in the API schema.`);
    }
    const req: HttpResourceRequest = buildHttpRequest(
      this.typedOptions.baseURL,
      route,
      endpoint,
      fetchOptions
    );
    return this.http
      .request<InferOutput<TSchema[Route]>>(
        req.method! satisfies string,
        req.url,
        {
          body: req.body,
          headers: req.headers as any,
          params: req.params,
          responseType: 'json',
        }
      )
      .pipe(
        switchMap((res) => {
          if (endpoint.output && (endpoint.output as any)['~standard']) {
            const result = (endpoint.output as any)['~standard'].validate(res);
            return from(Promise.resolve(result)).pipe(
              switchMap((validated) => {
                if ('issues' in validated) {
                  throw new Error(
                    `Request body validation failed: ${JSON.stringify(
                      validated.issues,
                      null,
                      2
                    )}`
                  );
                }
                return of(res);
              })
            );
          }
          return of(res);
        })
      );
  }

  get<Route extends RouteKey<TSchema>>(
    route: Route,
    options?: HttpTypedOptions<TSchema[Route]>
  ): Observable<InferOutput<TSchema[Route]>> {
    return this.request(route, { ...options, method: 'GET' });
  }

  post<Route extends RouteKey<TSchema>>(
    route: Route,
    body: InferInput<TSchema[Route]>,
    options?: Omit<HttpTypedOptions<TSchema[Route]>, 'body' | 'method'>
  ): Observable<InferOutput<TSchema[Route]>> {
    return this.request(route, { ...options, method: 'POST', body });
  }

  put<Route extends RouteKey<TSchema>>(
    route: Route,
    body: InferInput<TSchema[Route]>,
    options?: Omit<HttpTypedOptions<TSchema[Route]>, 'body' | 'method'>
  ): Observable<InferOutput<TSchema[Route]>> {
    return this.request(route, { ...options, method: 'PUT', body });
  }

  patch<Route extends RouteKey<TSchema>>(
    route: Route,
    body: InferInput<TSchema[Route]>,
    options?: Omit<HttpTypedOptions<TSchema[Route]>, 'body' | 'method'>
  ): Observable<InferOutput<TSchema[Route]>> {
    return this.request(route, { ...options, method: 'PATCH', body });
  }

  delete<Route extends RouteKey<TSchema>>(
    route: Route,
    options?: HttpTypedOptions<TSchema[Route]>
  ): Observable<InferOutput<TSchema[Route]>> {
    return this.request(route, { ...options, method: 'DELETE' });
  }

  head<Route extends RouteKey<TSchema>>(
    route: Route,
    options?: HttpTypedOptions<TSchema[Route]>
  ): Observable<InferOutput<TSchema[Route]>> {
    return this.request(route, { ...options, method: 'HEAD' });
  }

  options<Route extends RouteKey<TSchema>>(
    route: Route,
    options?: HttpTypedOptions<TSchema[Route]>
  ): Observable<InferOutput<TSchema[Route]>> {
    return this.request(route, { ...options, method: 'OPTIONS' });
  }
}