const API = "https://api.hcaptcha.com/siteverify";
export const validateHCaptchaResponse = async (
    secret: string,
    response: string
): Promise<boolean> => {
    try {
        const body = new FormData();
        body.append("secret", secret);
        body.append("response", response);
        const result = await fetch(API, {
            body,
            method: "POST",
        });

        const { success } = await result.json();

        return success;
    } catch {}

    return false;
}