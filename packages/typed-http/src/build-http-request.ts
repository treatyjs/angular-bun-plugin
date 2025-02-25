import {
    HttpHeaders,
    HttpParams,
  } from '@angular/common/http';
  import { isSignal, type Signal } from '@angular/core';
  import type { ApiSchema, EndpointDefinition, RouteKey } from './types/api-schema';
  import type { HttpTypedOptions } from './types/http-typed-options';
import type { HttpResourceRequest } from './types/http-resource-request';
  
  export function buildHttpRequest<
    Schema extends ApiSchema,
    Route extends RouteKey<Schema>,
    Def extends EndpointDefinition = Schema[Route]
  >(
    baseURL: string,
    route: Route | (() => Route | undefined),
    endpoint: Def,
    fetchOptions?: HttpTypedOptions<Def>
  ): HttpResourceRequest {
    let resolvedRoute: string | undefined =
      typeof route === 'function' ? route() : route;
    if (!resolvedRoute) {
      resolvedRoute = undefined;
    }
  
    let method: string | undefined = fetchOptions?.method;
    let actualRoute = resolvedRoute;
    const methodRegex = /^@(\w+)\//;
    const modifierMatch = actualRoute?.match(methodRegex);
    if (modifierMatch) {
      method = modifierMatch[1].toUpperCase();
      actualRoute = actualRoute?.replace(methodRegex, '/') as Route;
    }
    if (!method) {
      method = endpoint.input ? 'POST' : 'GET';
    }
  
    let url = baseURL + actualRoute;
  
    if (fetchOptions?.params) {
      for (const [key, value] of Object.entries(
        fetchOptions.params as Record<
          string,
          string | number | Signal<number> | Signal<string>
        >
      )) {
        const pattern = new RegExp(`:${key}(?:::[a-zA-Z]+)?`);
        url = url.replace(
          pattern,
          encodeURIComponent(isSignal(value) ? value() : String(value))
        );
      }
    }
  
    let params: HttpParams | undefined;
    if (fetchOptions?.query) {
      params = new HttpParams({
        fromObject: fetchOptions.query as Record<string, string>,
      });
    }
  
    let headers: HttpHeaders | undefined;
    if (fetchOptions?.headers) {
      headers =
        fetchOptions.headers instanceof HttpHeaders
          ? fetchOptions.headers
          : new HttpHeaders(
              fetchOptions.headers as Record<string, string | string[]>
            );
    }
  
    let body = fetchOptions?.body;
    if (endpoint?.input && (endpoint?.input as any)['~standard']) {
      const result = (endpoint.input as any)['~standard'].validate(body);
      if (result instanceof Promise) {
        throw new Error('Async validation not supported in this helper.');
      }
      if ('issues' in result) {
        throw new Error(
          `Request body validation failed: ${JSON.stringify(
            result.issues,
            null,
            2
          )}`
        );
      }
      body = result.value;
    }
  
    return {
      url,
      method,
      body,
      params,
      headers,
    };
  }
  