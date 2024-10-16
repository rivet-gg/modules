const API = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const validateCFTurnstileResponse = async (
	secret: string,
	response: string,
): Promise<boolean> => {
	try {
		const result = await fetch(API, {
			body: JSON.stringify({ secret, response }),
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
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
