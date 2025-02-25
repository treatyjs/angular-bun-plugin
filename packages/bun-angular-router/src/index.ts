import type { Route } from "@angular/router";
import type { BunPlugin } from "bun";
import path, { relative, dirname } from "path";

export type AngularRouting = {
  redirectTo?: string;
  filePath?: string;
  pagesPath?: string;
};

type RoutingMapper = { imports: string[]; routes: string[] };

export type RoutingMeta = Omit<
  Route,
  | "path"
  | "matcher"
  | "loadComponent"
  | "component"
  | "redirectTo"
  | "children"
  | "loadChildren"
>;

/**
 * Normalizes a file path to use forward slashes regardless of OS.
 */
const normalizePath = (p: string): string => p.split(path.sep).join("/");

export function routes(routingInfo: Required<AngularRouting>) {
  const router = new Bun.FileSystemRouter({
    style: "nextjs",
    dir: routingInfo.pagesPath,
  });


  const routingMapper: RoutingMapper = { imports: [], routes: [] };

  Object.keys(router.routes).forEach((key, index) => {
    let relPath = relative(dirname(routingInfo.filePath), router.routes[key]);
    relPath = normalizePath(relPath);

    routingMapper.imports.push(
      `import {routerMeta as r${index}} from './${relPath}'`
    );

    routingMapper.routes.push(`{
    path: '${key.replace(/\[(.*?)\]/g, ":$1").substring(1)}',
    loadComponent: () => import('./${relPath.replace(".ts",'')}'),
    ...r${index},
  }`);
  });

  const redirectRoute = `
  {
    path: '',
    redirectTo: '${routingInfo.redirectTo}',
    pathMatch: 'full',
  },
`;

  const content = `
${routingMapper.imports.join("\n")}

export const routes = [
  ${routingInfo.redirectTo ? redirectRoute : ""}
  ${routingMapper.routes.join(",\n")}
]
`;
  return content;
}

export const AngularRoutesRunTime: BunPlugin = {
  name: "Angular Bun routing loader",
  setup(build) {
    build.module("angular-routing-bun", () => {
      const router = new Bun.FileSystemRouter({
        style: "nextjs",
        dir: "src/pages",
      });

      const routingMapper: RoutingMapper = { imports: [], routes: [] };

      Object.keys(router.routes).forEach((key, index) => {
        // For the static import, normalize the full path
        let importPath = normalizePath(router.routes[key]);
        // For dynamic load, compute the relative path from __dirname and normalize
        let loadPath = relative(__dirname, router.routes[key]);
        loadPath = normalizePath(loadPath);
        // If needed, adjust loadPath (e.g. remove leading "../")
        loadPath = loadPath.replace(/^\.\.\//, "");

        routingMapper.imports.push(
          `import {RouterMeta as r${index}}from './${importPath}'`
        );
        routingMapper.routes.push(`{
                path: '${key.replace(/\[(.*?)\]/g, ":$1").substring(1)}',
                ...r${index}
            }`);
      });

      const content = `
${routingMapper.imports.join("\n")}

export const bunRoutes = [
  ${routingMapper.routes.join(",\n")}
]
`;
      return {
        contents: content,
        loader: "ts",
      };
    });
  },
};

export const AngularRoutesBuild: (routingInfo?: AngularRouting) => BunPlugin =
  (routingInfo = {}) => {
    // Resolve the file paths to absolute paths.
    const routePath = path.resolve(
      routingInfo.filePath || "src/routes.ng.ts"
    );
    const pagesPath = path.resolve(routingInfo.pagesPath || "src/pages");

    // Helper to escape special regex characters in the route path.
    function escapeRegExp(str: string): string {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    return {
      name: "Angular Bun routing loader",
      setup(build) {
        // Create a regex that matches the absolute routePath.
        // The '$' ensures the path ends with our routePath.
        const filter = new RegExp(escapeRegExp(routePath) + "$", "i");

        build.onLoad({ filter }, (args) => {
          // Generate routes using the configuration
          const genroutes = routes({
            ...routingInfo,
            filePath: routePath,
            pagesPath: pagesPath,
          } as any);

          return {
            contents: genroutes,
            loader: "ts",
          };
        });
      },
    };
  };

export default AngularRoutesBuild();
