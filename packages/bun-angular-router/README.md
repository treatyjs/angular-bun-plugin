# @treaty/bun-angular-router

Warning this package is still in early stages. DO NOT USE IN PRODUCTION!

## How to use

In root of your application you should have a bunfig.toml. If not you will need to create one.

Either add or edit the `[serve.static]` section and in the publig add `"@treaty/bun-angular-router"`

### Example
```
[serve.static]
plugins = [
    "@treaty/bun-angular-router"
]
```

You will also need a `routes.ng.ts` file in your src with the following code:

```
import type { Routes } from "@angular/router";

export const routes: Routes = [
    
];
```

On inital build we will generate the routes for you from a nextjs style using [bun file router](https://bun.sh/docs/api/file-system-router#next-js-style)