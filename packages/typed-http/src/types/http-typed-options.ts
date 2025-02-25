import type { EndpointDefinition, HttpMethod } from './api-schema';
import type { InferInput, InferParams, InferQuery } from './inference-helpers';
import type { HttpHeaders } from '@angular/common/http';

export interface HttpTypedOptions<E extends EndpointDefinition> {
  body?: InferInput<E>;
  query?: InferQuery<E>;
  params?: InferParams<E>;
  method?: HttpMethod;
  headers?: HttpHeaders | Record<string, string | string[]>;
}
