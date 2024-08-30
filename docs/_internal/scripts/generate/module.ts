import dedent from "dedent";
import { assertExists } from "@std/assert";
import { ModuleMeta, ProjectMeta } from "../../../../packages/toolchain/build/meta.ts";
import { TemplateContext } from "./main.ts";
import { resolve } from "@std/path";
import { DOCS_MODULES_PATH } from "./paths.ts";
import { emptyDir, exists } from "@std/fs";
import { genMarkdownDocsFromSchema } from "./markdown_docs.ts";
import { DependencyConfig } from "../../../../packages/toolchain/config/module.ts";

export async function generateModule(context: TemplateContext, groupNav, moduleName: string, module: ModuleMeta) {
  console.log("Generating module", moduleName);

  // Validate module
  assertExists(module.config.name, `Missing name for module "${moduleName}"`);
  assertExists(module.config.description, `Missing description for module "${moduleName}"`);
  assertExists(module.config.icon, `Missing icon for module "${moduleName}"`);
  assertExists(module.config.tags, `Missing tags for module "${moduleName}"`);
  assertExists(module.config.status, `Missing status for module "${moduleName}"`);

  // Validate scripts
  for (let [key, script] of Object.entries(module.scripts)) {
    if (!script.config.name) {
      throw new Error(`Script missing name: ${moduleName}.${key}`);
    }
  }
  const scriptsSorted = Object.entries(module.scripts).sort((a, b) =>
    a[1].config.name!.localeCompare(b[1].config.name!)
  );
  for (const [scriptName, script] of scriptsSorted) {
    assertExists(script.config.name, `Missing name for script "${scriptName}"`);
  }

  // Validate errors
  if (module.config.errors) {
    for (const [errorName, error] of Object.entries(module.config.errors)) {
      assertExists(error.name, `Missing name for error "${errorName}"`);
    }
  }

  // Sort scripts
  const publicScripts = Object.entries(module.scripts).filter(([_, x]) => x.config.public);
  const internalScripts = Object.entries(module.scripts).filter(([_, x]) => !x.config.public);

  // Add nav
  let pages: any[] = [`modules/${moduleName}/overview`];
  if (module.hasUserConfigSchema) {
    pages.push(`modules/${moduleName}/config`);
  }
  if (module.config.errors && Object.keys(module.config.errors).length > 0) {
    pages.push(`modules/${moduleName}/errors`);
  }
  if (publicScripts.length > 0) {
    pages.push({
      "group": "Scripts (Public)",
      "pages": publicScripts.sort((a, b) => a[1].config.name!.localeCompare(b[1].config.name!)).map(([scriptName]) =>
        `modules/${moduleName}/scripts/${scriptName}`
      ),
    });
  }
  if (internalScripts.length > 0) {
    pages.push({
      "group": "Scripts (Internal)",
      "pages": internalScripts.sort((a, b) => a[1].config.name!.localeCompare(b[1].config.name!)).map(([scriptName]) =>
        `modules/${moduleName}/scripts/${scriptName}`
      ),
    });
  }
  groupNav.pages.push({
    "icon": module.config.icon,
    "group": module.config.name,
    "pages": pages,
  });

  const modulePath = resolve(DOCS_MODULES_PATH, moduleName);
  await emptyDir(modulePath);

  // Render
  const publicScriptCards = publicScripts.map(([scriptName, script]) =>
    tplScriptCard(moduleName, module, scriptName, script)
  ).join("");
  const internalScriptCards = internalScripts.map(([scriptName, script]) =>
    tplScriptCard(moduleName, module, scriptName, script)
  ).join("");
  const configSection = module.hasUserConfigSchema ? tplConfigSection(moduleName, module) : "";

  const overview = await tplOverview(context, moduleName, module, publicScripts, internalScripts, configSection);
  await Deno.writeTextFile(resolve(modulePath, "overview.mdx"), overview);

  // Write errors to dedicated file
  if (module.config.errors && Object.keys(module.config.errors).length > 0) {
    const errorsContent = tplErrors(moduleName, module, module.config.errors);
    await Deno.writeTextFile(resolve(modulePath, "errors.mdx"), errorsContent);
  }

  await emptyDir(resolve(modulePath, "scripts"));
  for (const [scriptName, script] of scriptsSorted) {
    const scriptContent = await tplScript(moduleName, module, scriptName, script);
    await Deno.writeTextFile(resolve(modulePath, "scripts", `${scriptName}.mdx`), scriptContent);
  }

  // Config
  if (module.hasUserConfigSchema) {
    const configContent = await tplConfig(moduleName, module);
    await Deno.writeTextFile(resolve(modulePath, "config.mdx"), configContent);
  }
}

function tplDeps(meta: ProjectMeta, moduleName: string, module: ModuleMeta, dependencies: Record<string, DependencyConfig>) {
  const deps = Object.keys(dependencies ?? {}).sort().map(k => [k, meta.modules[k]!]);

  return `
${
    deps.length > 0
      ? deps.map(([k, v]) => `- [${v.config.name}](/modules/${k}/overview)`).join("\n")
      : "_No dependencies_"
  }
`;
}

function tplScriptCard(moduleName: string, module: ModuleMeta, scriptName: string, script: any) {
  return `
- **[${script.config.name}](/modules/${moduleName}/scripts/${scriptName})** (\`${scriptName}\`) ${script.config.description}
`;
}

function tplErrors(moduleName: string, module: ModuleMeta, errors: Record<string, any>) {
  return `---
title: "Errors"
---

${
    Object.entries(errors).sort((a, b) => a[1].name!.localeCompare(b[1].name!)).map(([errorName, error]) => `
## ${error.name}

\`${errorName}\`

${error.description ?? ""}
`).join("\n")
  }
`;
}

function tplConfigSection(moduleName: string, module: ModuleMeta) {
  return `
## Config

<Card title="View Config" icon="square-sliders" href="/modules/${moduleName}/config"></Card>
`;
}

function tplMetadataCell(title: string, icon: string | null, content: string, bigAssFocusedCell: boolean = false) {
  return `
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginBottom: '4px'${bigAssFocusedCell ? `, gridColumn: 'span 2'` : ''} }}>
  <div style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold'${bigAssFocusedCell ? `, color: 'white'` : ''} }}>${title}</div>
  <div style={{ display: 'flex' }}>
    ${icon ? `
    <div style={{ width: '24px', height: '24px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon="${icon}" />
    </div>` : ''}
    <div style={{ width: "100%" }}>${content}</div>
  </div>
</div>
`;
}

async function tplOverview(
  context: TemplateContext,
  moduleName: string, 
  module: ModuleMeta,
  publicScripts: any[],
  internalScripts: any[],
  configSection: string,
) {
  const actorCount = Object.keys(module.config.actors ?? {}).length;

  // Read README.md or README.mdx if it exists
  let readmeContent = "";
  const readmeMdPath = resolve(module.path, "README.md");
  const readmeMdxPath = resolve(module.path, "README.mdx");
  if (await exists(readmeMdPath)) {
    readmeContent = Deno.readTextFileSync(readmeMdPath);
  } else if (await exists(readmeMdxPath)) {
    readmeContent = Deno.readTextFileSync(readmeMdxPath);
  }
  // Remove H1 heading from README if it exists
  if (readmeContent) {
    readmeContent = readmeContent.replace(/^#\s.*\n/, "");
  }

  return `---
title: "${module.config.name}"
description: "${module.config.description}"
sidebarTitle: Overview
---

import { H2, Separator } from "/snippets/intro.mdx";

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#101010', border: '1px solid #222', borderRadius: '8px', padding: '16px' }}>
  
${tplMetadataCell("Installation", null, `<div>Run the following command in your project directory:</div><div style={{ marginTop: '-8px', marginBottom: '-32px' }}><CodeBlock>opengb module add ${moduleName}</CodeBlock></div>`, true)}

${tplMetadataCell("Authors", "user", module.config.authors ? module.config.authors.map(author => `<a href="https://github.com/${author}">${author}</a>`).join(", ") : "Unknown")}

${tplMetadataCell("Status", "square-info", getStatusLabel(module.config.status!))}

${tplMetadataCell("Source", "git-alt", `<a href="https://github.com/rivet-gg/opengb-modules/tree/main/modules/${moduleName}">View Source Code</a>`)}

${tplMetadataCell("License", "file-certificate", "Apache 2.0")}

${tplMetadataCell("Public Scripts", "code", `${publicScripts.length} script${publicScripts.length !== 1 ? 's' : ''}`)}

${tplMetadataCell("Internal Scripts", "code", `${internalScripts.length} script${internalScripts.length !== 1 ? 's' : ''}`)}

${tplMetadataCell("Database", "database", module.db ? "Includes Database" : "No Database")}

${tplMetadataCell("Actors", "bolt", `${actorCount} actor${actorCount !== 1 ? 's' : ''}`)}

</div>

<div style={{ height: '20px' }}/>

${readmeContent}
`;
}

function tplRequestExample(moduleName: string, module: ModuleMeta, scriptName: string, script: any) {
  return `
<RequestExample>

\`\`\`typescript OpenGB Script
const data = await ctx.modules.${module.nameCamel}.${script.nameCamel}({
  // Request body
});
\`\`\`

${
script.config.public
? `
\`\`\`javascript JavaScript
import { Backend } from "opengb-sdk";
const backend = new Backend({ endpoint: "http://localhost:6420" });
const data = await backend.${module.nameCamel}.${script.nameCamel}({
  // Request body
});
\`\`\`

\`\`\`gdscript Godot
var data = backend.${module.name}.${scriptName}({
  # Request body
})
\`\`\`

\`\`\`csharp Unity
var data = Backend.${module.namePascal}.${script.namePascal}();
\`\`\`

\`\`\`cpp Unreal Engine
// IMPORTANT: Auto-generated SDK coming soon

#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Misc/DefaultValueHelper.h"

void UYourClassName::PostRequest()
{
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->OnProcessRequestComplete().BindUObject(this, &UYourClassName::OnResponseReceived);
    Request->SetURL(TEXT("https://localhost:6420/modules/${moduleName}/scripts/${scriptName}/call"));
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    FString Payload = TEXT("{\"key\":\"value\"}");
    Request->SetContentAsString(Payload);
    Request->ProcessRequest();
}

void UYourClassName::OnResponseReceived(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful)
{
    if(!bWasSuccessful || !Response.IsValid())
    {
        UE_LOG(LogTemp, Error, TEXT("Request Failed"));
        return
    }

    FString data = Response->GetContentAsString();

    // Success
}
\`\`\`

\`\`\`rust Rust
// IMPORTANT: Auto-generated SDK coming soon

let data = reqwest::Client::new()
    .post("https://localhost:6420/modules/${moduleName}/scripts/${scriptName}/call")
    .json(&body) // Make sure \`body\` is defined
    .send()
    .await?
    .error_for_status()?
    .json::<serde_json::Value>()
    .await?;
\`\`\`

\`\`\`bash curl
curl -X POST "https://localhost:6420/modules/${moduleName}/scripts/${scriptName}/call" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "value" // Your JSON payload here
  }'
\`\`\`
`
: ""
}
</RequestExample>
`;
}

async function tplScript(moduleName: string, module: ModuleMeta, scriptName: string, script: any) {
  return `---
title: "${script.config.name}"
description: "${script.config.description ?? ""}"
---

## Public

${script.config.public ? "Yes" : "No"}

## Request

${tplRequestExample(moduleName, module, scriptName, script)}

${await genMarkdownDocsFromSchema(script.requestSchema, "Request")}

## Response

${await genMarkdownDocsFromSchema(script.responseSchema, "Response")}
`;
}

async function tplConfig(moduleName: string, module: ModuleMeta) {
  return `
# Config

${await genMarkdownDocsFromSchema(module.userConfigSchema!, "Config")}

## Default Config

\`\`\`json
${JSON.stringify(module.config.defaultConfig ?? {}, null, 4)}
\`\`\`
`;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "coming_soon":
      return "Coming Soon";
    case "preview":
      return "Preview";
    case "beta":
      return "Beta";
    case "stable":
      return "Stable";
    case "maintenance":
      return "Maintenance";
    case "end_of_life":
      return "End of Life";
    default:
      return status;
  }
}
