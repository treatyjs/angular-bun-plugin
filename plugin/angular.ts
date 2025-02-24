import type { OnLoadResult, plugin, BunPlugin } from "bun";
import { NgtscProgram, setFileSystem, createCompilerHost, type CompilerOptions, NodeJSFileSystem, readConfiguration, type CompilerHost } from '@angular/compiler-cli';
import ts, { ScriptTarget, ModuleKind } from "typescript";
import { mergeTransformers, replaceBootstrap } from '@ngtools/webpack/src/ivy/transformation';
import { augmentProgramWithVersioning } from '@ngtools/webpack/src/ivy/host';
import { normalize } from 'path';
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

function createFileEmitter(
    program: ts.Program,
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
        const ng = new NgtscProgram(["./main.ts"], options, host);
        augmentHostWithResources(
            host,
            (code, id) => { },
            {
                inlineStylesExtension: 'css',
            },
        );
		await ng.compiler.analyzeAsync()
		const program = ng.getReuseTsProgram();

        // const builder = ts.createAbstractBuilder(typeScriptProgram, host);

        const fileEmitter = createFileEmitter(
            program,
            mergeTransformers(ng.compiler.prepareEmit().transformers, {
                before: [replaceBootstrap(() => program.getTypeChecker())],
            }),
            () => [],
        );

		augmentProgramWithVersioning(program);

    
        
		build.onLoad({ filter: /\.[cm]?ts?$/ }, async ({ path }) => {
            if (path.includes('node_modules')) {
                return;
            }

			console.log("file to build: ", path);



			const result = await fileEmitter(path);

			return { contents: result?.code, loader: 'js',  } as OnLoadResult
		})

	},
};

export default Angular;