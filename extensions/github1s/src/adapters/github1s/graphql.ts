/**
 * @file github graphql queries
 * @author netcon
 */

export const FILE_BLAME_QUERY = `
query fileBlameQuery($owner: String!, $repo: String!, $ref: String!, $path: String!) {
	repository(owner: $owner, name: $repo) {
		object(expression: $ref) {
			... on Commit {
				blame(path: $path) {
					ranges {
						age
						startingLine
						endingLine
						commit {
							sha: oid
							message
							authoredDate
							author {
								avatarUrl
								name
								email
							}
						}
					}
				}
			}
		}
	}
}
`;
