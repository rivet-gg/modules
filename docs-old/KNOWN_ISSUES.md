# Known Issues

## `Record<K, V>` produces JSON schema

[typescript-json-schema#547](https://github.com/YousefED/typescript-json-schema/issues/547)

Will be fixed with [#15](https://github.com/rivet-gg/opengb-engine/issues/15).

## Moving modules folder breaks imports

```
error: Module not found "file:///path/to/src/runtime/mod.ts".
  at file:///path/to/tests/basic/.opengb/entrypoint.ts:3:25
```