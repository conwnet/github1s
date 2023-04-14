/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { URI } from 'vs/base/common/uri';
import { IDisposable, Disposable, dispose } from 'vs/base/common/lifecycle';
import { posix, sep, win32 } from 'vs/base/common/path';
import { Emitter } from 'vs/base/common/event';
import { Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IWorkspaceContextService, IWorkspace, isWorkspace, ISingleFolderWorkspaceIdentifier, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, IWorkspaceIdentifier, toWorkspaceIdentifier, WORKSPACE_EXTENSION, isUntitledWorkspace, isTemporaryWorkspace } from 'vs/platform/workspace/common/workspace';
import { basenameOrAuthority, basename, joinPath, dirname } from 'vs/base/common/resources';
import { tildify, getPathLabel } from 'vs/base/common/labels';
import { ILabelService, ResourceLabelFormatter, ResourceLabelFormatting, IFormatterChangeEvent, Verbosity } from 'vs/platform/label/common/label';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { match } from 'vs/base/common/glob';
import { ILifecycleService, LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { InstantiationType, registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IPathService } from 'vs/workbench/services/path/common/pathService';
import { isProposedApiEnabled } from 'vs/workbench/services/extensions/common/extensions';
import { OperatingSystem, OS } from 'vs/base/common/platform';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { Schemas } from 'vs/base/common/network';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { Memento } from 'vs/workbench/common/memento';
import { firstOrDefault } from 'vs/base/common/arrays';

const resourceLabelFormattersExtPoint = ExtensionsRegistry.registerExtensionPoint<ResourceLabelFormatter[]>({
	extensionPoint: 'resourceLabelFormatters',
	jsonSchema: {
		description: localize('vscode.extension.contributes.resourceLabelFormatters', 'Contributes resource label formatting rules.'),
		type: 'array',
		items: {
			type: 'object',
			required: ['scheme', 'formatting'],
			properties: {
				scheme: {
					type: 'string',
					description: localize('vscode.extension.contributes.resourceLabelFormatters.scheme', 'URI scheme on which to match the formatter on. For example "file". Simple glob patterns are supported.'),
				},
				authority: {
					type: 'string',
					description: localize('vscode.extension.contributes.resourceLabelFormatters.authority', 'URI authority on which to match the formatter on. Simple glob patterns are supported.'),
				},
				formatting: {
					description: localize('vscode.extension.contributes.resourceLabelFormatters.formatting', "Rules for formatting uri resource labels."),
					type: 'object',
					properties: {
						label: {
							type: 'string',
							description: localize('vscode.extension.contributes.resourceLabelFormatters.label', "Label rules to display. For example: myLabel:/${path}. ${path}, ${scheme}, ${authority} and ${authoritySuffix} are supported as variables.")
						},
						separator: {
							type: 'string',
							description: localize('vscode.extension.contributes.resourceLabelFormatters.separator', "Separator to be used in the uri label display. '/' or '\' as an example.")
						},
						stripPathStartingSeparator: {
							type: 'boolean',
							description: localize('vscode.extension.contributes.resourceLabelFormatters.stripPathStartingSeparator', "Controls whether `${path}` substitutions should have starting separator characters stripped.")
						},
						tildify: {
							type: 'boolean',
							description: localize('vscode.extension.contributes.resourceLabelFormatters.tildify', "Controls if the start of the uri label should be tildified when possible.")
						},
						workspaceSuffix: {
							type: 'string',
							description: localize('vscode.extension.contributes.resourceLabelFormatters.formatting.workspaceSuffix', "Suffix appended to the workspace label.")
						}
					}
				}
			}
		}
	}
});

const sepRegexp = /\//g;
const labelMatchingRegexp = /\$\{(scheme|authoritySuffix|authority|path|(query)\.(.+?))\}/g;

function hasDriveLetterIgnorePlatform(path: string): boolean {
	return !!(path && path[2] === ':');
}

class ResourceLabelFormattersHandler implements IWorkbenchContribution {

	private readonly formattersDisposables = new Map<ResourceLabelFormatter, IDisposable>();

	constructor(@ILabelService labelService: ILabelService) {
		resourceLabelFormattersExtPoint.setHandler((extensions, delta) => {
			for (const added of delta.added) {
				for (const untrustedFormatter of added.value) {

					// We cannot trust that the formatter as it comes from an extension
					// adheres to our interface, so for the required properties we fill
					// in some defaults if missing.

					const formatter = { ...untrustedFormatter };
					if (typeof formatter.formatting.label !== 'string') {
						formatter.formatting.label = '${authority}${path}';
					}
					if (typeof formatter.formatting.separator !== `string`) {
						formatter.formatting.separator = sep;
					}

					if (!isProposedApiEnabled(added.description, 'contribLabelFormatterWorkspaceTooltip') && formatter.formatting.workspaceTooltip) {
						formatter.formatting.workspaceTooltip = undefined; // workspaceTooltip is only proposed
					}

					this.formattersDisposables.set(formatter, labelService.registerFormatter(formatter));
				}
			}

			for (const removed of delta.removed) {
				for (const formatter of removed.value) {
					dispose(this.formattersDisposables.get(formatter));
				}
			}
		});
	}
}
Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ResourceLabelFormattersHandler, LifecyclePhase.Restored);

const FORMATTER_CACHE_SIZE = 50;

interface IStoredFormatters {
	formatters?: ResourceLabelFormatter[];
	i?: number;
}

export class LabelService extends Disposable implements ILabelService {

	declare readonly _serviceBrand: undefined;

	private formatters: ResourceLabelFormatter[];

	private readonly _onDidChangeFormatters = this._register(new Emitter<IFormatterChangeEvent>({ leakWarningThreshold: 400 }));
	readonly onDidChangeFormatters = this._onDidChangeFormatters.event;

	private readonly storedFormattersMemento: Memento;
	private readonly storedFormatters: IStoredFormatters;
	private os: OperatingSystem;
	private userHome: URI | undefined;

	constructor(
		@IWorkbenchEnvironmentService private readonly environmentService: IWorkbenchEnvironmentService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IPathService private readonly pathService: IPathService,
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService,
		@IStorageService storageService: IStorageService,
		@ILifecycleService lifecycleService: ILifecycleService,
	) {
		super();

		// Find some meaningful defaults until the remote environment
		// is resolved, by taking the current OS we are running in
		// and by taking the local `userHome` if we run on a local
		// file scheme.
		this.os = OS;
		this.userHome = pathService.defaultUriScheme === Schemas.file ? this.pathService.userHome({ preferLocal: true }) : undefined;

		const memento = this.storedFormattersMemento = new Memento('cachedResourceLabelFormatters2', storageService);
		this.storedFormatters = memento.getMemento(StorageScope.PROFILE, StorageTarget.MACHINE);
		this.formatters = this.storedFormatters?.formatters?.slice() || [];

		// Remote environment is potentially long running
		this.resolveRemoteEnvironment();
	}

	private async resolveRemoteEnvironment(): Promise<void> {

		// OS
		const env = await this.remoteAgentService.getEnvironment();
		this.os = env?.os ?? OS;

		// User home
		this.userHome = await this.pathService.userHome();
	}

	findFormatting(resource: URI): ResourceLabelFormatting | undefined {
		let bestResult: ResourceLabelFormatter | undefined;

		for (const formatter of this.formatters) {
			if (formatter.scheme === resource.scheme) {
				if (!formatter.authority && (!bestResult || formatter.priority)) {
					bestResult = formatter;
					continue;
				}

				if (!formatter.authority) {
					continue;
				}

				if (
					match(formatter.authority.toLowerCase(), resource.authority.toLowerCase()) &&
					(
						!bestResult ||
						!bestResult.authority ||
						formatter.authority.length > bestResult.authority.length ||
						((formatter.authority.length === bestResult.authority.length) && formatter.priority)
					)
				) {
					bestResult = formatter;
				}
			}
		}

		return bestResult ? bestResult.formatting : undefined;
	}

	getUriLabel(resource: URI, options: { relative?: boolean; noPrefix?: boolean; separator?: '/' | '\\' } = {}): string {
		let formatting = this.findFormatting(resource);
		if (formatting && options.separator) {
			// mixin separator if defined from the outside
			formatting = { ...formatting, separator: options.separator };
		}

		const label = this.doGetUriLabel(resource, formatting, options);

		// Without formatting we still need to support the separator
		// as provided in options (https://github.com/microsoft/vscode/issues/130019)
		if (!formatting && options.separator) {
			return label.replace(sepRegexp, options.separator);
		}

		return label;
	}

	private doGetUriLabel(resource: URI, formatting?: ResourceLabelFormatting, options: { relative?: boolean; noPrefix?: boolean } = {}): string {
		if (!formatting) {
			return getPathLabel(resource, {
				os: this.os,
				tildify: this.userHome ? { userHome: this.userHome } : undefined,
				relative: options.relative ? {
					noPrefix: options.noPrefix,
					getWorkspace: () => this.contextService.getWorkspace(),
					getWorkspaceFolder: resource => this.contextService.getWorkspaceFolder(resource)
				} : undefined
			});
		}

		// Relative label
		if (options.relative && this.contextService) {
			let folder = this.contextService.getWorkspaceFolder(resource);
			if (!folder) {

				// It is possible that the resource we want to resolve the
				// workspace folder for is not using the same scheme as
				// the folders in the workspace, so we help by trying again
				// to resolve a workspace folder by trying again with a
				// scheme that is workspace contained.

				const workspace = this.contextService.getWorkspace();
				const firstFolder = firstOrDefault(workspace.folders);
				if (firstFolder && resource.scheme !== firstFolder.uri.scheme && resource.path.startsWith(posix.sep)) {
					folder = this.contextService.getWorkspaceFolder(firstFolder.uri.with({ path: resource.path }));
				}
			}

			if (folder) {
				const folderLabel = this.formatUri(folder.uri, formatting, options.noPrefix);

				let relativeLabel = this.formatUri(resource, formatting, options.noPrefix);
				let overlap = 0;
				while (relativeLabel[overlap] && relativeLabel[overlap] === folderLabel[overlap]) {
					overlap++;
				}

				if (!relativeLabel[overlap] || relativeLabel[overlap] === formatting.separator) {
					relativeLabel = relativeLabel.substring(1 + overlap);
				} else if (overlap === folderLabel.length && folder.uri.path === posix.sep) {
					relativeLabel = relativeLabel.substring(overlap);
				}

				// always show root basename if there are multiple folders
				const hasMultipleRoots = this.contextService.getWorkspace().folders.length > 1;
				if (hasMultipleRoots && !options.noPrefix) {
					const rootName = folder?.name ?? basenameOrAuthority(folder.uri);
					relativeLabel = relativeLabel ? `${rootName} • ${relativeLabel}` : rootName;
				}

				return relativeLabel;
			}
		}

		// Absolute label
		return this.formatUri(resource, formatting, options.noPrefix);
	}

	getUriBasenameLabel(resource: URI): string {
		const formatting = this.findFormatting(resource);
		const label = this.doGetUriLabel(resource, formatting);

		let pathLib: typeof win32 | typeof posix;
		if (formatting?.separator === win32.sep) {
			pathLib = win32;
		} else if (formatting?.separator === posix.sep) {
			pathLib = posix;
		} else {
			pathLib = (this.os === OperatingSystem.Windows) ? win32 : posix;
		}

		return pathLib.basename(label);
	}

	getWorkspaceLabel(workspace: IWorkspace | IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier | URI, options?: { verbose: Verbosity }): string {
		/* below codes are changed by github1s */
		if (window?.vscodeWeb?.workspaceLabel) {
			return window?.vscodeWeb?.workspaceLabel as string;
		}
		/* above codes are changed by github1s */

		if (isWorkspace(workspace)) {
			const identifier = toWorkspaceIdentifier(workspace);
			if (isSingleFolderWorkspaceIdentifier(identifier) || isWorkspaceIdentifier(identifier)) {
				return this.getWorkspaceLabel(identifier, options);
			}

			return '';
		}

		// Workspace: Single Folder (as URI)
		if (URI.isUri(workspace)) {
			return this.doGetSingleFolderWorkspaceLabel(workspace, options);
		}

		// Workspace: Single Folder (as workspace identifier)
		if (isSingleFolderWorkspaceIdentifier(workspace)) {
			return this.doGetSingleFolderWorkspaceLabel(workspace.uri, options);
		}

		// Workspace: Multi Root
		if (isWorkspaceIdentifier(workspace)) {
			return this.doGetWorkspaceLabel(workspace.configPath, options);
		}

		return '';
	}

	private doGetWorkspaceLabel(workspaceUri: URI, options?: { verbose: Verbosity }): string {

		// Workspace: Untitled
		if (isUntitledWorkspace(workspaceUri, this.environmentService)) {
			return localize('untitledWorkspace', "Untitled (Workspace)");
		}

		// Workspace: Temporary
		if (isTemporaryWorkspace(workspaceUri)) {
			return localize('temporaryWorkspace', "Workspace");
		}

		// Workspace: Saved
		let filename = basename(workspaceUri);
		if (filename.endsWith(WORKSPACE_EXTENSION)) {
			filename = filename.substr(0, filename.length - WORKSPACE_EXTENSION.length - 1);
		}

		let label: string;
		switch (options?.verbose) {
			case Verbosity.SHORT:
				label = filename; // skip suffix for short label
				break;
			case Verbosity.LONG:
				label = localize('workspaceNameVerbose', "{0} (Workspace)", this.getUriLabel(joinPath(dirname(workspaceUri), filename)));
				break;
			case Verbosity.MEDIUM:
			default:
				label = localize('workspaceName', "{0} (Workspace)", filename);
				break;
		}

		if (options?.verbose === Verbosity.SHORT) {
			return label; // skip suffix for short label
		}

		return this.appendWorkspaceSuffix(label, workspaceUri);
	}

	private doGetSingleFolderWorkspaceLabel(folderUri: URI, options?: { verbose: Verbosity }): string {
		let label: string;
		switch (options?.verbose) {
			case Verbosity.LONG:
				label = this.getUriLabel(folderUri);
				break;
			case Verbosity.SHORT:
			case Verbosity.MEDIUM:
			default:
				label = basename(folderUri) || posix.sep;
				break;
		}

		if (options?.verbose === Verbosity.SHORT) {
			return label; // skip suffix for short label
		}

		return this.appendWorkspaceSuffix(label, folderUri);
	}

	getSeparator(scheme: string, authority?: string): '/' | '\\' {
		const formatter = this.findFormatting(URI.from({ scheme, authority }));

		return formatter?.separator || posix.sep;
	}

	getHostLabel(scheme: string, authority?: string): string {
		const formatter = this.findFormatting(URI.from({ scheme, authority }));

		return formatter?.workspaceSuffix || authority || '';
	}

	getHostTooltip(scheme: string, authority?: string): string | undefined {
		const formatter = this.findFormatting(URI.from({ scheme, authority }));

		return formatter?.workspaceTooltip;
	}

	registerCachedFormatter(formatter: ResourceLabelFormatter): IDisposable {
		const list = this.storedFormatters.formatters ??= [];

		let replace = list.findIndex(f => f.scheme === formatter.scheme && f.authority === formatter.authority);
		if (replace === -1 && list.length >= FORMATTER_CACHE_SIZE) {
			replace = FORMATTER_CACHE_SIZE - 1; // at max capacity, replace the last element
		}

		if (replace === -1) {
			list.unshift(formatter);
		} else {
			for (let i = replace; i > 0; i--) {
				list[i] = list[i - 1];
			}
			list[0] = formatter;
		}

		this.storedFormattersMemento.saveMemento();

		return this.registerFormatter(formatter);
	}

	registerFormatter(formatter: ResourceLabelFormatter): IDisposable {
		this.formatters.push(formatter);
		this._onDidChangeFormatters.fire({ scheme: formatter.scheme });

		return {
			dispose: () => {
				this.formatters = this.formatters.filter(f => f !== formatter);
				this._onDidChangeFormatters.fire({ scheme: formatter.scheme });
			}
		};
	}

	private formatUri(resource: URI, formatting: ResourceLabelFormatting, forceNoTildify?: boolean): string {
		let label = formatting.label.replace(labelMatchingRegexp, (match, token, qsToken, qsValue) => {
			switch (token) {
				case 'scheme': return resource.scheme;
				case 'authority': return resource.authority;
				case 'authoritySuffix': {
					const i = resource.authority.indexOf('+');
					return i === -1 ? resource.authority : resource.authority.slice(i + 1);
				}
				case 'path':
					return formatting.stripPathStartingSeparator
						? resource.path.slice(resource.path[0] === formatting.separator ? 1 : 0)
						: resource.path;
				default: {
					if (qsToken === 'query') {
						const { query } = resource;
						if (query && query[0] === '{' && query[query.length - 1] === '}') {
							try {
								return JSON.parse(query)[qsValue] || '';
							} catch { }
						}
					}

					return '';
				}
			}
		});

		// convert \c:\something => C:\something
		if (formatting.normalizeDriveLetter && hasDriveLetterIgnorePlatform(label)) {
			label = label.charAt(1).toUpperCase() + label.substr(2);
		}

		if (formatting.tildify && !forceNoTildify) {
			if (this.userHome) {
				label = tildify(label, this.userHome.fsPath, this.os);
			}
		}

		if (formatting.authorityPrefix && resource.authority) {
			label = formatting.authorityPrefix + label;
		}

		return label.replace(sepRegexp, formatting.separator);
	}

	private appendWorkspaceSuffix(label: string, uri: URI): string {
		const formatting = this.findFormatting(uri);
		const suffix = formatting && (typeof formatting.workspaceSuffix === 'string') ? formatting.workspaceSuffix : undefined;

		return suffix ? `${label} [${suffix}]` : label;
	}
}

registerSingleton(ILabelService, LabelService, InstantiationType.Delayed);
