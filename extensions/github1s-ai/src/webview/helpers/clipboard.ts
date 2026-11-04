export const COPY_FEEDBACK_DURATION_MS = 1_600;

export const copyText = async (text: string): Promise<boolean> => {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
};
