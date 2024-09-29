const API = "https://api.hcaptcha.com/siteverify";
export const validateHCaptchaResponse = async (
	secret: string,
	response: string,
): Promise<boolean> => {
	try {
		const body = new FormData();
		body.append("secret", secret);
		body.append("response", response);
		const result = await fetch(API, {
			body,
			method: "POST",
		});

		if (result.status !== 200) {
			return false;
		}

		const { success } = await result.json();

		return success;
	} catch (error) {
		console.error("Failed to request hCaptcha /siteverify endpoint", error);
	}

	return false;
};
