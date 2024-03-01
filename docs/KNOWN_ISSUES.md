# Known Issues

## `Record<K, V>` produces JSON schema

[typescript-json-schema#547](https://github.com/YousefED/typescript-json-schema/issues/547)

## Moving modules folder breaks imports

```
error: Module not found "file:///path/to/src/runtime/mod.ts".
  at file:///path/to/tests/test_project/_gen/entrypoint.ts:3:25
```