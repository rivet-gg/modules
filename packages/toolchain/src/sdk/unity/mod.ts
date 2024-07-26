import { camelify, pascalify } from "../../../../case_conversion/src/mod.ts";
import { exists, glob, resolve } from "../../deps.ts";
import { GeneratedCodeBuilder, Lang } from "../../build/gen/code_builder.ts";
import { Project } from "../../project/mod.ts";
import { dedent } from "../../build/deps.ts";

// Can be nested, like Foo.Bar
export const DEFAULT_PACKAGE_NAME = "Backend";

export async function generateUnityAddons(project: Project, sdkGenPath: string) {
	// Remove unused backend components
	await Deno.remove(resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Api", "BackendApi.cs"));
	await Deno.remove(resolve(sdkGenPath, "src", `${DEFAULT_PACKAGE_NAME}.Test`), { recursive: true });

	await modifyApiClient(sdkGenPath);
	await modifyModels(project, sdkGenPath);
	await generateApiClient(project, sdkGenPath);
	await generateModuleApiClients(project, sdkGenPath);
}

async function modifyApiClient(sdkGenPath: string) {
	const path = resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Client", "ApiClient.cs");

	const content = await Deno.readTextFile(path);
	const fixedContent = content
		.replace("using UnityEngine;", "using UnityEngine;\nusing Newtonsoft.Json.Linq;")
		.replace(
			"throw new ApiException((int)request.responseCode, request.error, text);",
			dedent`
        var jsonBody = JObject.Parse(text);
        throw new ApiException((int)request.responseCode, request.error + " (" + jsonBody["message"] + ")", jsonBody);
      `,
		)
    // HACK: Allow creating requests from background threads by running request
    // constructor on main thread.
    .replace(
      /request = UnityWebRequest\.(\w+)\(uri, jsonData\);/g,
      // TODO: Run FromCurrentSynchronizationContext once
      dedent`
        await Task.Factory.StartNew(() =>
        {
          request = UnityWebRequest.$1(uri, jsonData);
        }, CancellationToken.None, TaskCreationOptions.None, TaskScheduler.FromCurrentSynchronizationContext());
      `
    )
    // HACK: Make `NewRequest` async so we can create the Unity request on the main thread.
    .replace("private UnityWebRequest NewRequest<T>", "private async Task<UnityWebRequest> NewRequest<T>")
    .replace(/public Task<ApiResponse<T>> (\w+Async)/g, "public async Task<ApiResponse<T>> $1")
    .replace(
      /var config = configuration \?\? GlobalConfiguration\.Instance;\s*return ExecAsync<T>\(NewRequest<T>\("(\w+)", path, options, config\), path, options, config, cancellationToken\);/gs,
      dedent`
        var config = configuration ?? GlobalConfiguration.Instance;
        var request = await NewRequest<T>("$1", path, options, config);
        return await ExecAsync<T>(request, path, options, config, cancellationToken);
      `
    );


	// Write new runtime
	await Deno.writeTextFile(path, fixedContent);
}

// Move module name from type name into namespace
async function modifyModels(project: Project, sdkGenPath: string) {
	for (const mod of project.modules.values()) {
		// TODO: This will cause problems if one module name is a superset of
		// another OR if a script name start with the end of another module name

		const moduleNamePascal = pascalify(mod.name);

		const files = await glob.glob([`${moduleNamePascal}*.cs`], {
			cwd: resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Model"),
			ignore: "AbstractOpenAPISchema.cs",
			nodir: true,
		});

		for (const file of files) {
			const path = resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Model", file);

			const content = await Deno.readTextFile(path);
			const fixedContent = content
				.replace(`${DEFAULT_PACKAGE_NAME}.Model\n`, `${DEFAULT_PACKAGE_NAME}.Model.${moduleNamePascal}\n`)
				// Fix incorrectly generated class extensions
				.replace(/partial class (\w+) : AbstractOpenAPISchema,\s*/gm, "partial class $1 : AbstractOpenAPISchema")
				.replaceAll(new RegExp(`\\b${moduleNamePascal}(\\w+)`, "g"), "$1");

			await Deno.writeTextFile(path, fixedContent);
		}
	}
}

async function generateApiClient(project: Project, sdkGenPath: string) {
	// Update index to only export our custom api
	const apiBuilder = new GeneratedCodeBuilder(
		resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Client.cs"),
		2,
		Lang.CSharp,
	);

	const modules = apiBuilder.chunk;

	for (const mod of project.modules.values()) {
		const moduleNamePascal = pascalify(mod.name);
		const apiName = `${moduleNamePascal}Api`;

		modules.append`
			private Modules.${apiName} _${mod.name};
			public Modules.${apiName} ${moduleNamePascal} => _${mod.name} ??= new Modules.${apiName}(this.AsynchronousClient, this.Configuration);
		`;
	}

	GeneratedCodeBuilder.wrap(
		apiClassTemplate(DEFAULT_PACKAGE_NAME, "BackendClient"),
		modules,
		`
			}
		}
		`,
	);

	await apiBuilder.write();
}

async function generateModuleApiClients(project: Project, sdkGenPath: string) {
	// Create dir for module apis
	try {
		await Deno.mkdir(resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Api", "Modules"));
	} catch (e) {
		if (!(e instanceof Deno.errors.AlreadyExists)) {
			throw e;
		}
	}

	for (const mod of project.modules.values()) {
		const moduleNamePascal = pascalify(mod.name);

		// Create module api class
		const moduleApiBuilder = new GeneratedCodeBuilder(
			resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Modules", `${moduleNamePascal}.cs`),
			2,
			Lang.CSharp,
		);

		const scripts = moduleApiBuilder.chunk;

		for (const script of mod.scripts.values()) {
			const scriptNamePascal = pascalify(script.name);
			const path = `/modules/${mod.name}/scripts/${script.name}/call`;

			const requestName = `${moduleNamePascal}${scriptNamePascal}Request`;
			const responseName = `${moduleNamePascal}${scriptNamePascal}Response`;
			const nsRequestName = `${DEFAULT_PACKAGE_NAME}.Model.${moduleNamePascal}.${scriptNamePascal}Request`;
			const nsResponseName = `${DEFAULT_PACKAGE_NAME}.Model.${moduleNamePascal}.${scriptNamePascal}Response`;

			// Generate missing free-form objects
			if (!await exists(resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Model", `${requestName}.cs`))) {
				await generateFreeFormInterface(
					moduleNamePascal,
					`${scriptNamePascal}Request`,
					`${mod.name}__${script.name}__Request`,
					resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Model", `${requestName}.cs`),
				);
			}
			if (!await exists(resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Model", `${responseName}.cs`))) {
				await generateFreeFormInterface(
					moduleNamePascal,
					`${scriptNamePascal}Response`,
					`${mod.name}__${script.name}__Response`,
					resolve(sdkGenPath, "src", DEFAULT_PACKAGE_NAME, "Model", `${responseName}.cs`),
				);
			}

			scripts.append`
				/// <summary>
				///  Call ${mod.name}.${script.name} script.
				/// </summary>
				/// <exception cref="${DEFAULT_PACKAGE_NAME}.Client.ApiException">Thrown when fails to make API call</exception>
				/// <param name="body"> (optional)</param>
				/// <param name="cancellationToken">Cancellation Token to cancel the request.</param>
				/// <returns>Task of ${nsResponseName}</returns>
				public async System.Threading.Tasks.Task<${nsResponseName}> ${scriptNamePascal}(${nsRequestName} ${
				camelify(requestName)
			} = default(${nsRequestName}), System.Threading.CancellationToken cancellationToken = default(System.Threading.CancellationToken))
				{
					var task = ${scriptNamePascal}WithHttpInfo(${camelify(requestName)}, cancellationToken);
		#if UNITY_EDITOR || !UNITY_WEBGL
					${DEFAULT_PACKAGE_NAME}.Client.ApiResponse<${nsResponseName}> localVarResponse = await task.ConfigureAwait(false);
		#else
					${DEFAULT_PACKAGE_NAME}.Client.ApiResponse<${nsResponseName}> localVarResponse = await task;
		#endif
					return localVarResponse.Data;
				}

				/// <summary>
				///  Call ${mod.name}.${script.name} script.
				/// </summary>
				/// <exception cref="${DEFAULT_PACKAGE_NAME}.Client.ApiException">Thrown when fails to make API call</exception>
				/// <param name="body"> (optional)</param>
				/// <param name="cancellationToken">Cancellation Token to cancel the request.</param>
				/// <returns>Task of ApiResponse (${nsResponseName})</returns>
				public async System.Threading.Tasks.Task<${DEFAULT_PACKAGE_NAME}.Client.ApiResponse<${nsResponseName}>> ${scriptNamePascal}WithHttpInfo(${nsRequestName} ${
				camelify(requestName)
			} = default(${nsRequestName}), System.Threading.CancellationToken cancellationToken = default(System.Threading.CancellationToken))
				{

					${DEFAULT_PACKAGE_NAME}.Client.RequestOptions localVarRequestOptions = new ${DEFAULT_PACKAGE_NAME}.Client.RequestOptions();

					string[] _contentTypes = new string[] {
						"application/json"
					};

					// to determine the Accept header
					string[] _accepts = new string[] {
						"application/json"
					};


					var localVarContentType = ${DEFAULT_PACKAGE_NAME}.Client.ClientUtils.SelectHeaderContentType(_contentTypes);
					if (localVarContentType != null) localVarRequestOptions.HeaderParameters.Add("Content-Type", localVarContentType);

					var localVarAccept = ${DEFAULT_PACKAGE_NAME}.Client.ClientUtils.SelectHeaderAccept(_accepts);
					if (localVarAccept != null) localVarRequestOptions.HeaderParameters.Add("Accept", localVarAccept);

					localVarRequestOptions.Data = ${camelify(requestName)};


					// make the HTTP request

					var task = this.AsynchronousClient.PostAsync<${nsResponseName}>("${path}", localVarRequestOptions, this.Configuration, cancellationToken);

		#if UNITY_EDITOR || !UNITY_WEBGL
					var localVarResponse = await task.ConfigureAwait(false);
		#else
					var localVarResponse = await task;
		#endif

					if (this.ExceptionFactory != null)
					{
						Exception _exception = this.ExceptionFactory("${scriptNamePascal}", localVarResponse);
						if (_exception != null) throw _exception;
					}

					return localVarResponse;
				}
			`;
		}

		GeneratedCodeBuilder.wrap(
			apiClassTemplate(`${DEFAULT_PACKAGE_NAME}.Modules`, `${moduleNamePascal}Api`),
			scripts,
			`
				}
			}
			`,
		);

		await moduleApiBuilder.write();
	}
}

async function generateFreeFormInterface(moduleName: string, interfaceName: string, dataName: string, path: string) {
	const schemaBuilder = new GeneratedCodeBuilder(path, 2, Lang.CSharp);

	schemaBuilder.appendRaw(`
		using System;
		using System.Collections;
		using System.Collections.Generic;
		using System.Collections.ObjectModel;
		using System.Linq;
		using System.IO;
		using System.Runtime.Serialization;
		using System.Text;
		using System.Text.RegularExpressions;
		using Newtonsoft.Json;
		using Newtonsoft.Json.Converters;
		using Newtonsoft.Json.Linq;
		using OpenAPIDateConverter = ${DEFAULT_PACKAGE_NAME}.Client.OpenAPIDateConverter;

		namespace ${DEFAULT_PACKAGE_NAME}.Model.${moduleName}
		{
			/// <summary>
			/// ${interfaceName}
			/// </summary>
			[DataContract(Name = "${dataName}")]
			public partial class ${interfaceName}
			{
				/// <summary>
				/// Initializes a new instance of the <see cref="${interfaceName}" /> class.
				/// </summary>
				[JsonConstructorAttribute]
				public ${interfaceName}() { }

				/// <summary>
				/// Returns the string presentation of the object
				/// </summary>
				/// <returns>String presentation of the object</returns>
				public override string ToString()
				{
					StringBuilder sb = new StringBuilder();
					sb.Append("class ${interfaceName} {\\n");
					sb.Append("}\\n");
					return sb.ToString();
				}

				/// <summary>
				/// Returns the JSON string presentation of the object
				/// </summary>
				/// <returns>JSON string presentation of the object</returns>
				public virtual string ToJson()
				{
					return Newtonsoft.Json.JsonConvert.SerializeObject(this, Newtonsoft.Json.Formatting.Indented);
				}

			}
		}
	`);

	await schemaBuilder.write();
}

function apiClassTemplate(namespace: string, name: string) {
	return dedent`
		using System;
		using System.Collections.Generic;
		using System.Collections.ObjectModel;
		using System.Linq;
		using System.Net;
		using System.Net.Mime;
		using ${DEFAULT_PACKAGE_NAME}.Client;
		using ${DEFAULT_PACKAGE_NAME}.Model;

		namespace ${namespace}
		{
			/// <summary>
			/// Represents a collection of functions to interact with the API endpoints
			/// </summary>
			public partial class ${name} : IDisposable
			{
				/// <summary>
				/// Initializes a new instance of the <see cref="${name}"/> class.
				/// **IMPORTANT** This will also create an instance of HttpClient, which is less than ideal.
				/// It's better to reuse the <see href="https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/use-httpclientfactory-to-implement-resilient-http-requests#issues-with-the-original-httpclient-class-available-in-net">HttpClient and HttpClientHandler</see>.
				/// </summary>
				/// <returns></returns>
				public ${name}() : this((string)null)
				{
				}

				/// <summary>
				/// Initializes a new instance of the <see cref="${name}"/> class.
				/// **IMPORTANT** This will also create an instance of HttpClient, which is less than ideal.
				/// It's better to reuse the <see href="https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/use-httpclientfactory-to-implement-resilient-http-requests#issues-with-the-original-httpclient-class-available-in-net">HttpClient and HttpClientHandler</see>.
				/// </summary>
				/// <param name="basePath">The target service's base path in URL format.</param>
				/// <exception cref="ArgumentException"></exception>
				/// <returns></returns>
				public ${name}(string basePath)
				{
					this.Configuration = ${DEFAULT_PACKAGE_NAME}.Client.Configuration.MergeConfigurations(
						${DEFAULT_PACKAGE_NAME}.Client.GlobalConfiguration.Instance,
						new ${DEFAULT_PACKAGE_NAME}.Client.Configuration { BasePath = basePath }
					);
					this.ApiClient = new ${DEFAULT_PACKAGE_NAME}.Client.ApiClient(this.Configuration.BasePath);
					this.AsynchronousClient = this.ApiClient;
					this.ExceptionFactory = ${DEFAULT_PACKAGE_NAME}.Client.Configuration.DefaultExceptionFactory;
				}

				/// <summary>
				/// Initializes a new instance of the <see cref="${name}"/> class using Configuration object.
				/// **IMPORTANT** This will also create an instance of HttpClient, which is less than ideal.
				/// It's better to reuse the <see href="https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/use-httpclientfactory-to-implement-resilient-http-requests#issues-with-the-original-httpclient-class-available-in-net">HttpClient and HttpClientHandler</see>.
				/// </summary>
				/// <param name="configuration">An instance of Configuration.</param>
				/// <exception cref="ArgumentNullException"></exception>
				/// <returns></returns>
				public ${name}(${DEFAULT_PACKAGE_NAME}.Client.Configuration configuration)
				{
					if (configuration == null) throw new ArgumentNullException("configuration");

					this.Configuration = ${DEFAULT_PACKAGE_NAME}.Client.Configuration.MergeConfigurations(
						${DEFAULT_PACKAGE_NAME}.Client.GlobalConfiguration.Instance,
						configuration
					);
					this.ApiClient = new ${DEFAULT_PACKAGE_NAME}.Client.ApiClient(this.Configuration.BasePath);
					this.AsynchronousClient = this.ApiClient;
					ExceptionFactory = ${DEFAULT_PACKAGE_NAME}.Client.Configuration.DefaultExceptionFactory;
				}

				/// <summary>
				/// Initializes a new instance of the <see cref="${name}"/> class
				/// using a Configuration object and client instance.
				/// </summary>
				/// <param name="asyncClient">The client interface for asynchronous API access.</param>
				/// <param name="configuration">The configuration object.</param>
				/// <exception cref="ArgumentNullException"></exception>
				public ${name}(${DEFAULT_PACKAGE_NAME}.Client.IAsynchronousClient asyncClient, ${DEFAULT_PACKAGE_NAME}.Client.IReadableConfiguration configuration)
				{
					if (asyncClient == null) throw new ArgumentNullException("asyncClient");
					if (configuration == null) throw new ArgumentNullException("configuration");

					this.AsynchronousClient = asyncClient;
					this.Configuration = configuration;
					this.ExceptionFactory = ${DEFAULT_PACKAGE_NAME}.Client.Configuration.DefaultExceptionFactory;
				}

				/// <summary>
				/// Disposes resources if they were created by us
				/// </summary>
				public void Dispose()
				{
					this.ApiClient?.Dispose();
				}

				/// <summary>
				/// Holds the ApiClient if created
				/// </summary>
				public ${DEFAULT_PACKAGE_NAME}.Client.ApiClient ApiClient { get; set; } = null;

				/// <summary>
				/// The client for accessing this underlying API asynchronously.
				/// </summary>
				public ${DEFAULT_PACKAGE_NAME}.Client.IAsynchronousClient AsynchronousClient { get; set; }

				/// <summary>
				/// Gets the base path of the API client.
				/// </summary>
				/// <value>The base path</value>
				public string GetBasePath()
				{
					return this.Configuration.BasePath;
				}

				/// <summary>
				/// Gets or sets the configuration object
				/// </summary>
				/// <value>An instance of the Configuration</value>
				public ${DEFAULT_PACKAGE_NAME}.Client.IReadableConfiguration Configuration { get; set; }

				private ${DEFAULT_PACKAGE_NAME}.Client.ExceptionFactory _exceptionFactory = (name, response) => null;

				/// <summary>
				/// Provides a factory method hook for the creation of exceptions.
				/// </summary>
				public ${DEFAULT_PACKAGE_NAME}.Client.ExceptionFactory ExceptionFactory
				{
					get
					{
						if (_exceptionFactory != null && _exceptionFactory.GetInvocationList().Length > 1)
						{
							throw new InvalidOperationException("Multicast delegate for ExceptionFactory is unsupported.");
						}
						return _exceptionFactory;
					}
					set { _exceptionFactory = value; }
				}
	`;
}
