# @treaty/bun-angular

Warning this package is still in early stages.


## How to use

In root of your application you should have a bunfig.toml. If not you will need to create one.

Either add or edit the `[serve.static]` section and in the publig add `"@treaty/bun-angular"`

### Example
```
[serve.static]
plugins = [
    "@treaty/bun-angular"
]
```

## Tailwind support?

This package works out of the box with the `bun-plugin-tailwind`