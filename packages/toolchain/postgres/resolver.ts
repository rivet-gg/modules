const DOWNLOAD_BASE_URL = "https://releases.rivet.gg/postgres";

export function getDownloadUrl(version: string, fileName: string): string {
	return `${DOWNLOAD_BASE_URL}/${version}/${fileName}`;
}

export function getReleaseFileNameForCurrentHost(version: string): string {
	const os = Deno.build.os;
	const arch = Deno.build.arch;
	return getReleaseFileName(version, os, arch);
}

export function getReleaseFileName(version: string, os: typeof Deno.build.os, arch: typeof Deno.build.arch): string {
	const baseFileName = `postgresql-${version}`;
	let osName: string;
	let archName: string;

	switch (os) {
		case "darwin":
			osName = "apple-darwin";
			break;
		case "linux":
		case "android":
		case "freebsd":
		case "netbsd":
		case "aix":
		case "solaris":
		case "illumos":
			osName = "unknown-linux-gnu";
			break;
		case "windows":
			osName = "pc-windows-msvc";
			break;
		default:
			throw new Error(`Unsupported OS: ${os}`);
	}

	switch (arch) {
		case "x86_64":
			archName = "x86_64";
			break;
		case "aarch64":
			archName = "aarch64";
			break;
		default:
			throw new Error(`Unsupported architecture: ${arch}`);
	}

	const fileName = `${baseFileName}-${archName}-${osName}.tar.gz`;
	return fileName;
}
