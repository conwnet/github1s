/**
 * @file trending constants
 * @author netcon
 */

export enum RankingPeriod {
	Today = 'Today',
	ThisWeek = 'ThisWeek',
	ThisMonth = 'ThisMonth',
}

export const RankingLanguages = [
	'JavaScript',
	'Java',
	'Python',
	'PHP',
	'C++',
	'C#',
	'Typescript',
	'Shell',
	'C',
	'Ruby',
	'Rust',
	'Go',
	'Kotlin',
	'HCL',
	'PowerShell',
	'CMake',
	'Groovy',
	'PLpgSQL',
	'TSQL',
	'Dart',
	'Swift',
	'HTML',
	'CSS',
	'Elixir',
	'Haskell',
	'Solidity',
	'Assembly',
	'R',
	'Scala',
	'Julia',
	'Lua',
	'Clojure',
	'Erlang',
	'Common Lisp',
	'Emacs Lisp',
	'OCaml',
	'MATLAB',
	'Objective-C',
	'Perl',
	'Fortran',
];

export type RepoItem = {
	collection_names?: string;
	contributor_logins?: string;
	description?: string;
	forks?: number;
	language?: string;
	repo_name: string;
	stars?: number;
	total_score?: number;
};
