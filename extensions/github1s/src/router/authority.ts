/**
 * @file URI authority helpers
 * @author netcon
 */

export const buildAuthority = (repo: string, ref: string): string => {
	// label is using for display in resourceLabelFormatters
	const label = ref.length >= 32 ? ref.slice(0, 7) : ref;
	return repo && ref ? `${repo}@${ref}+${label}` : '';
};

export const parseAuthority = (authority: string): { repo: string; ref: string } | undefined => {
	// repo name may starts with @, so we skip the first character
	const atIndex = authority.slice(1).indexOf('@') + 1;
	if (atIndex <= 0) {
		// compatible with old format, remove in the future
		const [repo, ref] = authority.split('+');
		return repo && ref ? { repo, ref } : undefined;
	}
	const repo = authority.slice(0, atIndex);
	const plusIndex = authority.lastIndexOf('+');
	const ref = plusIndex > 0 ? authority.slice(atIndex + 1, plusIndex) : '';
	return repo && ref ? { repo, ref } : undefined;
};
