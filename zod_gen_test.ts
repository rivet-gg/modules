import * as tsToZod from "npm:ts-to-zod";
import ts from "npm:typescript";

const path = 'modules/users/scripts/register copy 2.ts';

const sourceText = await Deno.readTextFile(path);
console.log('src', sourceText);

// const sourceFile = ts.createSourceFile(
//     path,
//     sourceText,
//     ts.ScriptTarget.Latest
//   );


// const zodOutput = tsToZod.generateZodSchemaVariableStatement({
//     node: 
//     sourceFile,

// });

const zodOutput = tsToZod.generate({ sourceText });
if (zodOutput.errors.length > 0) {
    throw new Error(zodOutput.errors.join('\n'));
}
console.log('generated zod', zodOutput.getZodSchemasFile(path));