import type { OnLoadResult, BunPlugin } from "bun";
import {
  NgtscProgram,
  setFileSystem,
  createCompilerHost,
  type CompilerOptions,
  NodeJSFileSystem,
  type CompilerHost,
} from "@angular/compiler-cli";
import ts, { ScriptTarget, ModuleKind } from "typescript";
import {
  mergeTransformers,
  replaceBootstrap,
} from "@ngtools/webpack/src/ivy/transformation";
import { augmentProgramWithVersioning } from "@ngtools/webpack/src/ivy/host";
import { isAbsolute, resolve, normalize } from "path";
import { JavaScriptTransformer } from "@angular/build/private";

setFileSystem(new NodeJSFileSystem());

interface EmitFileResult {
  code: string;
  map?: string;
  dependencies: readonly string[];
  hash?: Uint8Array;
}

type FileEmitter = (file: string) => Promise<EmitFileResult | undefined>;

function augmentHostWithResources(
  host: ts.CompilerHost,
  transform: (
    code: string,
    id: string,
    options?: { ssr?: boolean }
  ) => ReturnType<any> | null,
  options: { inlineStylesExtension?: string } = {}
) {
  const resourceHost = host as CompilerHost;
  resourceHost.readResource = function (fileName: string) {
    const filePath = normalize(fileName);
    const content = this.readFile(filePath);
    if (content === undefined) {
      throw new Error("Unable to locate component resource: " + fileName);
    }
    return content;
  };
  resourceHost.transformResource = async function (data, context) {
    if (context.type !== "style") {
      return null;
    }
    if (options.inlineStylesExtension) {
      const filename =
        context.resourceFile ??
        `${context.containingFile.replace(
          /\.ts$/,
          `.${options.inlineStylesExtension}`
        )}`;
      let stylesheetResult;
      try {
        stylesheetResult = await transform(data, `${filename}?direct`);
      } catch (e) {
        console.error(`${e}`);
      }
      return { content: stylesheetResult?.code || "" };
    }
    return null;
  };
}

function shouldInjectHMRFromAST(
  sourceFile: ts.SourceFile,
  filePath: string
): boolean {
  let isAngular = false;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isClassDeclaration(node)) {
      const decorators = (node as any).decorators as ts.Node[] | undefined;
      if (decorators) {
        decorators.forEach((decorator: any) => {
          if (ts.isCallExpression(decorator.expression)) {
            const expr = decorator.expression.expression;
            if (ts.isIdentifier(expr)) {
              const decName = expr.text;
              if (
                ["Component", "Directive", "Pipe", "NgModule", "Injectable"].includes(
                  decName
                )
              ) {
                isAngular = true;
              }
            }
          }
        });
      }
    }
  });
  return isAngular;
}

function isBootstrapFile(sourceFile: ts.SourceFile): boolean {
  let foundBootstrap = false;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        if (expr.name.text.startsWith("bootstrap")) {
          foundBootstrap = true;
        }
      } else if (ts.isIdentifier(expr)) {
        if (expr.text.startsWith("bootstrap")) {
          foundBootstrap = true;
        }
      }
    }
    if (!foundBootstrap) {
      ts.forEachChild(node, visit);
    }
  }
  ts.forEachChild(sourceFile, visit);
  return foundBootstrap;
}

function injectHmrSnippetFromAST(
  sourceFile: ts.SourceFile,
  filePath: string,
  code: string
): string {
  if (isBootstrapFile(sourceFile)) {
    let newCode = code;
    if (
      !newCode.includes("import '@angular/compiler'") &&
      !newCode.includes('import "@angular/compiler"')
    ) {
      newCode = `import '@angular/compiler';\n` + newCode;
    }
    return newCode + `
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    window.ngRef && window.ngRef.destroy();
  });
}
`;
  } else if (shouldInjectHMRFromAST(sourceFile, filePath)) {
    return code + `
if (import.meta.hot) {
  import.meta.hot.accept(({ module }) => {
    if (module && module.__hmrUpdate) {
      module.__hmrUpdate();
    }
  });
}
`;
  } else {
    return code + `
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;
  }
}

function parseSourceFile(code: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ScriptTarget.Latest, true);
}

const rootFiles = new Set<string>();

export const Angular: BunPlugin = {
  name: "Angular loader",
  async setup(build) {
    setFileSystem(new NodeJSFileSystem());
    const options: CompilerOptions = {
      strict: true,
      strictTemplates: true,
      target: ScriptTarget.Latest,
      module: ModuleKind.ESNext,
      annotateForClosureCompiler: true,
      compilationMode: "experimental-local",
      inlineSourceMap: true,
      incremental: true,
    };
    const host = createCompilerHost({ options });
    let ng = new NgtscProgram([], options, host);
    augmentHostWithResources(
      host,
      (code, id) => {},
      { inlineStylesExtension: "css" }
    );
    await ng.compiler.analyzeAsync();
    let program = ng.getReuseTsProgram();
    function createFileEmitter(
      transformers: ts.CustomTransformers = {},
      onAfterEmit?: (sourceFile: ts.SourceFile) => void
    ): FileEmitter {
      return async (file: string) => {
        const srcFile = program.getSourceFile(file);
        if (!srcFile) {
          return undefined;
        }
        let code = "";
        program.emit(
          srcFile,
          (filename: string, data: string) => {
            if (/\.[cm]?js$/.test(filename) && data) {
              code = data;
            }
          },
          undefined,
          undefined,
          transformers
        );
        onAfterEmit?.(srcFile);
        return { code, dependencies: [] };
      };
    }
    augmentProgramWithVersioning(program);
    build.onLoad({ filter: /\.[cm]?ts?$/ }, async ({ path }) => {
      if (path.includes("node_modules")) {
        return;
      }
      await Bun.file(path).text();
      const absolutePath = isAbsolute(path)
        ? normalize(path)
        : normalize(resolve(process.cwd(), path));
      rootFiles.add(absolutePath);
      const allFiles = Array.from(rootFiles);
      ng = new NgtscProgram(allFiles, options, host);
      await ng.compiler.analyzeAsync();
      program = ng.getReuseTsProgram();
      const sourceFile = program.getSourceFile(absolutePath);
      if (!sourceFile) {
        throw new Error(`Unable to retrieve source file: ${absolutePath}`);
      }
      const fileEmitter = createFileEmitter(
        mergeTransformers(ng.compiler.prepareEmit().transformers, {
          before: [replaceBootstrap(() => program.getTypeChecker())],
        }),
        () => []
      );
      const result = await fileEmitter(absolutePath);
      if (!result) {
        throw new Error(`Failed to emit file: ${absolutePath}`);
      }
      let transformedCode = result.code;
      transformedCode = injectHmrSnippetFromAST(
        sourceFile,
        absolutePath,
        transformedCode
      );
      return { contents: transformedCode, loader: "js" } as OnLoadResult;
    });
    const javascriptTransformer = new JavaScriptTransformer(
      {
        sourcemap: true,
        advancedOptimizations: false,
        jit: false,
      },
      1
    );
    const transpiler = new Bun.Transpiler({ loader: "ts" });
    build.onLoad({ filter: /\.[cm]?[jt]s?$/ }, async ({ path }) => {
      try {
        const fileText = await Bun.file(path).text();
        const contents = await javascriptTransformer.transformData(
          path,
          fileText,
          true,
          false
        );
        let javascript = transpiler.transformSync(contents.toString());
        await javascriptTransformer.close();
        const jsAst = parseSourceFile(javascript, path);
        javascript = injectHmrSnippetFromAST(jsAst, path, javascript);
        return { contents: javascript, loader: "ts" } as OnLoadResult;
      } catch (error) {
        console.error("Error during HMR transform:", error);
      }
    });
  },
};

export default Angular;
