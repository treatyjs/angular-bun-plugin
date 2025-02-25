import type { StandardSchemaV1 } from '@standard-schema/spec';

export type InferInput<E> = E extends { input: StandardSchemaV1 }
  ? StandardSchemaV1.InferInput<E['input']>
  : E extends { input: infer I }
  ? I
  : unknown;

export type InferOutput<E> = E extends { output: StandardSchemaV1 }
  ? StandardSchemaV1.InferOutput<E['output']>
  : E extends { output: infer O }
  ? O
  : unknown;

export type InferQuery<E> = E extends { query: StandardSchemaV1 }
  ? StandardSchemaV1.InferInput<E['query']>
  : E extends { query: infer Q }
  ? Q
  : unknown;

export type InferParams<E> = E extends { params: StandardSchemaV1 }
  ? StandardSchemaV1.InferInput<E['params']>
  : E extends { params: infer P }
  ? P
  : unknown;
