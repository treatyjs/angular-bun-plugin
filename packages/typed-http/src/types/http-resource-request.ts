/**
 * @license Angular v19.2.0-next.1
 * (c) 2010-2024 Google LLC. https://angular.io/
 * License: MIT
 */

import type { HttpHeaders, HttpParams } from '@angular/common/http';

/**
 * The structure of an `httpResource` request.
 *
 * @experimental
 */
export declare interface HttpResourceRequest {
  url: string;
  method?: string;
  body?: unknown;
  params?: HttpParams | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
  headers?: HttpHeaders | Record<string, string | ReadonlyArray<string>>;
  reportProgress?: boolean;
  withCredentials?: boolean;
  transferCache?: {
      includeHeaders?: string[];
  } | boolean;
}