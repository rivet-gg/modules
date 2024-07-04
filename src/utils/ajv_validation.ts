import Ajv, { ErrorObject } from "https://esm.sh/ajv@^8.12.0";
import { UserError } from "../error/mod.ts";
import { Module, Project } from "../project/mod.ts";
import { resolve } from "../deps.ts";

export function formatValidationErrors(ajv: Ajv, errors: ErrorObject[] | null | undefined): string {
	return ajv.errorsText(errors, { separator: "\n" })
		.split("\n")
		.map((x) => `  - ${x}`)
		.join("\n");
}

export function validationUserError(
	message: string,
	path: string,
	config: any,
	ajv: Ajv,
	errors: ErrorObject[] | null | undefined,
) {
	return new UserError(
		message,
		{
			path,
			details: `Validation errors:\n\n${formatValidationErrors(ajv, errors)}\n`,
			suggest: `Validate your config data:\n\n${JSON.stringify(config, null, 2)}`,
		},
	);
}
