import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { InferInput } from './inference-helpers';

type StringKeyOf<T> = Extract<keyof T, string>;

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

type RouteWithMethod = `@${HttpMethod}/${string}`;
type RouteWithMethodOrString = RouteWithMethod | string;

export type ExtractHTTPMethod<Route extends string> =
  Route extends `@${infer M}/${string}`
    ? M extends HttpMethod
      ? M
      : never
    : never;

type AllowedParamTypes = 'number' | 'string' | 'boolean';

export type ReplaceParams<Route extends string> =
  Route extends `${infer Prefix}:${infer Param}::${infer T}/${infer Rest}`
    ? ReplaceParams<`${Prefix}${T}/${Rest}`>
    : Route extends `${infer Prefix}:${infer Param}::${infer T}`
    ? `${Prefix}${T}`
    : Route;

export type ValidRouteFrom<R extends string> = R | ReplaceParams<R>;

export type EndpointDefinition<
  Input = unknown,
  Output = unknown,
  Query = unknown,
  Params = unknown
> = {
  input?: StandardSchemaV1<Input, Input> | Input;
  output?: StandardSchemaV1<unknown, Output> | Output;
  query?: StandardSchemaV1<Query, Query> | Query;
  params?: StandardSchemaV1<Params, Params>;
};

export type ApiSchema<
  T extends Record<RouteWithMethodOrString, EndpointDefinition> = Record<
    string,
    EndpointDefinition
  >
> = T;

export type RouteKey<TSchema extends ApiSchema> = StringKeyOf<TSchema>;

export type InferMethod<
  Route extends string,
  E extends EndpointDefinition
> = Route extends `@${infer M}/${string}`
  ? M extends HttpMethod
    ? M
    : never
  : InferInput<E> extends undefined
  ? 'GET'
  : 'POST';
