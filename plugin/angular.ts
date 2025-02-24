import type { OnLoadResult, plugin, BunPlugin } from "bun";
import { NgtscProgram, setFileSystem, createCompilerHost, type CompilerOptions, NodeJSFileSystem, readConfiguration, type CompilerHost } from '@angular/compiler-cli';
import ts, { ScriptTarget, ModuleKind } from "typescript";
import { mergeTransformers, replaceBootstrap } from '@ngtools/webpack/src/ivy/transformation';
import { augmentProgramWithVersioning } from '@ngtools/webpack/src/ivy/host';
import { normalize } from 'path';
import { JavaScriptTransformer } from '@angular/build/private'
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
        options?: { ssr?: boolean },
    ) => ReturnType<any> | null,
    options: {
        inlineStylesExtension?: string;
    } = {},
) {
    const resourceHost = host as CompilerHost;

    resourceHost.readResource = function (fileName: string) {
        const filePath = normalize(fileName);

        const content = this.readFile(filePath);
        if (content === undefined) {
            throw new Error('Unable to locate component resource: ' + fileName);
        }

        return content;
    };

    resourceHost.transformResource = async function (data, context) {
        // Only style resources are supported currently
        if (context.type !== 'style') {
            return null;
        }

        if (options.inlineStylesExtension) {
            // Resource file only exists for external stylesheets
            const filename =
                context.resourceFile ??
                `${context.containingFile.replace(
                    /\.ts$/,
                    `.${options?.inlineStylesExtension}`,
                )}`;

            let stylesheetResult;

            try {
                stylesheetResult = await transform(data, `${filename}?direct`);
            } catch (e) {
                console.error(`${e}`);
            }

            return { content: stylesheetResult?.code || '' };
        }

        return null;
    };
}




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
            incremental: true
		};
        const host = createCompilerHost({ options })
        let ng = new NgtscProgram(["./main.ts"], options, host);
        augmentHostWithResources(
            host,
            (code, id) => { },
            {
                inlineStylesExtension: 'css',
            },
        );
		await ng.compiler.analyzeAsync()
		let program = ng.getReuseTsProgram();

        function createFileEmitter(
            transformers: ts.CustomTransformers = {},
            onAfterEmit?: (sourceFile: ts.SourceFile) => void,
        ): FileEmitter {
            return async (file: string) => {
                const sourceFile = program.getSourceFile(file);
                if (!sourceFile) {
                    return undefined;
                }
        
                let code: string = '';
                program.emit(
                    sourceFile,
                    (filename: string, data: string) => {
                        if (/\.[cm]?js$/.test(filename)) {
                            if (data) {
                                code = data;
                            }
                        }
                    },
                    undefined /* cancellationToken */,
                    undefined /* emitOnlyDtsFiles */,
                    transformers,
                );
        
                onAfterEmit?.(sourceFile);
        
                return { code, dependencies: [] };
            };
        }

		augmentProgramWithVersioning(program);

		build.onLoad({ filter: /\.[cm]?ts?$/ }, async ({ path }) => {
            if (path.includes('node_modules')) {
                return;
            }
            // Check if the file is part of the program
            let sourceFile = program.getSourceFile(path);
            if (!sourceFile) {
                // Add the file to the program if it's not recognized
                const rootFileNames = [...program.getRootFileNames(), path];
                ng = new NgtscProgram(rootFileNames, options, host);
                await ng.compiler.analyzeAsync();
                program = ng.getReuseTsProgram();
                sourceFile = program.getSourceFile(path);
            }

            const fileEmitter = createFileEmitter(
                mergeTransformers(ng.compiler.prepareEmit().transformers, {
                    before: [replaceBootstrap(() => program.getTypeChecker())],
                }),
                () => [],
            );

			const result = await fileEmitter(path);

            if (!result) {
                throw new Error(`Failed to emit file: ${path}`);
            }

			return { contents: result.code, loader: 'js' } as OnLoadResult;
		});

        const javascriptTransformer = new JavaScriptTransformer({
            sourcemap: true,
            advancedOptimizations: false,
            jit: false,
            
        },  1);
        const transpiler = new Bun.Transpiler({ loader: "ts" });
    
        build.onLoad({filter: /\.[cm]?[jt]s?$/ }, (async ({path}) => {
          try {
            const fileText = await Bun.file(path).text()
            const contents = await javascriptTransformer.transformData(path, fileText, true, false);
            const javascript = transpiler.transformSync(contents.toString());
            await javascriptTransformer.close()
            return {
              contents: javascript,
              loader: 'ts',
            };
          } catch (error) {
            console.log('error:' ,error)
          }
        }))
	},
};

export default Angular;