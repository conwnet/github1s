/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as glob from 'vs/base/common/glob';
import { distinct, firstOrDefault, flatten, insert } from 'vs/base/common/arrays';
import { Disposable, IDisposable, toDisposable } from 'vs/base/common/lifecycle';
import { basename, extname, isEqual } from 'vs/base/common/resources';
import { URI } from 'vs/base/common/uri';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { EditorActivation, EditorResolution, IEditorOptions } from 'vs/platform/editor/common/editor';
import { DEFAULT_EDITOR_ASSOCIATION, EditorResourceAccessor, EditorInputWithOptions, IResourceSideBySideEditorInput, isEditorInputWithOptions, isEditorInputWithOptionsAndGroup, isResourceDiffEditorInput, isResourceSideBySideEditorInput, isUntitledResourceEditorInput, isResourceMergeEditorInput, IUntypedEditorInput, SideBySideEditor } from 'vs/workbench/common/editor';
import { EditorInput } from 'vs/workbench/common/editor/editorInput';
import { IEditorGroup, IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { Schemas } from 'vs/base/common/network';
import { RegisteredEditorInfo, RegisteredEditorPriority, RegisteredEditorOptions, EditorAssociation, EditorAssociations, editorsAssociationsSettingId, globMatchesResource, IEditorResolverService, priorityToRank, ResolvedEditor, ResolvedStatus, EditorInputFactoryObject } from 'vs/workbench/services/editor/common/editorResolverService';
import { QuickPickItem, IKeyMods, IQuickInputService, IQuickPickItem, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { localize } from 'vs/nls';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { InstantiationType, registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';
import { findGroup } from 'vs/workbench/services/editor/common/editorGroupFinder';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { PreferredGroup } from 'vs/workbench/services/editor/common/editorService';
import { SideBySideEditorInput } from 'vs/workbench/common/editor/sideBySideEditorInput';
import { PauseableEmitter } from 'vs/base/common/event';

interface RegisteredEditor {
	globPattern: string | glob.IRelativePattern;
	editorInfo: RegisteredEditorInfo;
	options?: RegisteredEditorOptions;
	editorFactoryObject: EditorInputFactoryObject;
}

type RegisteredEditors = Array<RegisteredEditor>;

export class EditorResolverService extends Disposable implements IEditorResolverService {
	readonly _serviceBrand: undefined;

	// Events
	private readonly _onDidChangeEditorRegistrations = this._register(new PauseableEmitter<void>());
	readonly onDidChangeEditorRegistrations = this._onDidChangeEditorRegistrations.event;

	// Constants
	private static readonly configureDefaultID = 'promptOpenWith.configureDefault';
	private static readonly cacheStorageID = 'editorOverrideService.cache';
	private static readonly conflictingDefaultsStorageID = 'editorOverrideService.conflictingDefaults';

	// Data Stores
	private _editors: Map<string | glob.IRelativePattern, Map<string, RegisteredEditors>> = new Map<string | glob.IRelativePattern, Map<string, RegisteredEditors>>();
	private _flattenedEditors: Map<string | glob.IRelativePattern, RegisteredEditors> = new Map();
	private _shouldReFlattenEditors: boolean = true;
	private cache: Set<string> | undefined;

	constructor(
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@INotificationService private readonly notificationService: INotificationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IStorageService private readonly storageService: IStorageService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		// Read in the cache on statup
		this.cache = new Set<string>(JSON.parse(this.storageService.get(EditorResolverService.cacheStorageID, StorageScope.PROFILE, JSON.stringify([]))));
		this.storageService.remove(EditorResolverService.cacheStorageID, StorageScope.PROFILE);

		this._register(this.storageService.onWillSaveState(() => {
			// We want to store the glob patterns we would activate on, this allows us to know if we need to await the ext host on startup for opening a resource
			this.cacheEditors();
		}));

		// When extensions have registered we no longer need the cache
		this.extensionService.onDidRegisterExtensions(() => {
			this.cache = undefined;
		});
	}

	private resolveUntypedInputAndGroup(editor: IUntypedEditorInput, preferredGroup: PreferredGroup | undefined): [IUntypedEditorInput, IEditorGroup, EditorActivation | undefined] | undefined {
		const untypedEditor = editor;

		// Use the untyped editor to find a group
		const [group, activation] = this.instantiationService.invokeFunction(findGroup, untypedEditor, preferredGroup);

		return [untypedEditor, group, activation];
	}

	async resolveEditor(editor: IUntypedEditorInput, preferredGroup: PreferredGroup | undefined): Promise<ResolvedEditor> {
		// Update the flattened editors
		this._flattenedEditors = this._flattenEditorsMap();

		// Special case: side by side editors requires us to
		// independently resolve both sides and then build
		// a side by side editor with the result
		if (isResourceSideBySideEditorInput(editor)) {
			return this.doResolveSideBySideEditor(editor, preferredGroup);
		}

		const resolvedUntypedAndGroup = this.resolveUntypedInputAndGroup(editor, preferredGroup);
		if (!resolvedUntypedAndGroup) {
			return ResolvedStatus.NONE;
		}
		// Get the resolved untyped editor, group, and activation
		const [untypedEditor, group, activation] = resolvedUntypedAndGroup;
		if (activation) {
			untypedEditor.options = { ...untypedEditor.options, activation };
		}

		let resource = EditorResourceAccessor.getCanonicalUri(untypedEditor, { supportSideBySide: SideBySideEditor.PRIMARY });

		// If it was resolved before we await for the extensions to activate and then proceed with resolution or else the backing extensions won't be registered
		if (this.cache && resource && this.resourceMatchesCache(resource)) {
			await this.extensionService.whenInstalledExtensionsRegistered();
		}

		// Undefined resource -> untilted. Other malformed URI's are unresolvable
		if (resource === undefined) {
			resource = URI.from({ scheme: Schemas.untitled });
		} else if (resource.scheme === undefined || resource === null) {
			return ResolvedStatus.NONE;
		}

		if (untypedEditor.options?.override === EditorResolution.PICK) {
			const picked = await this.doPickEditor(untypedEditor);
			// If the picker was cancelled we will stop resolving the editor
			if (!picked) {
				return ResolvedStatus.ABORT;
			}
			// Populate the options with the new ones
			untypedEditor.options = picked;
		}

		// Resolved the editor ID as much as possible, now find a given editor (cast here is ok because we resolve down to a string above)
		let { editor: selectedEditor, conflictingDefault } = this.getEditor(resource, untypedEditor.options?.override as (string | EditorResolution.EXCLUSIVE_ONLY | undefined));
		// If no editor was found and this was a typed editor or an editor with an explicit override we could not resolve it
		if (!selectedEditor && (untypedEditor.options?.override || isEditorInputWithOptions(editor))) {
			return ResolvedStatus.NONE;
		} else if (!selectedEditor) {
			// Simple untyped editors that we could not resolve will be resolved to the default editor
			const resolvedEditor = this.getEditor(resource, DEFAULT_EDITOR_ASSOCIATION.id);
			selectedEditor = resolvedEditor?.editor;
			conflictingDefault = resolvedEditor?.conflictingDefault;
			if (!selectedEditor) {
				return ResolvedStatus.NONE;
			}
		}

		// In the special case of diff editors we do some more work to determine the correct editor for both sides
		if (isResourceDiffEditorInput(untypedEditor) && untypedEditor.options?.override === undefined) {
			let resource2 = EditorResourceAccessor.getCanonicalUri(untypedEditor, { supportSideBySide: SideBySideEditor.SECONDARY });
			if (!resource2) {
				resource2 = URI.from({ scheme: Schemas.untitled });
			}
			const { editor: selectedEditor2 } = this.getEditor(resource2, undefined);
			if (!selectedEditor2 || selectedEditor.editorInfo.id !== selectedEditor2.editorInfo.id) {
				const { editor: selectedDiff, conflictingDefault: conflictingDefaultDiff } = this.getEditor(resource, DEFAULT_EDITOR_ASSOCIATION.id);
				selectedEditor = selectedDiff;
				conflictingDefault = conflictingDefaultDiff;
			}
			if (!selectedEditor) {
				return ResolvedStatus.NONE;
			}
		}

		// If no override we take the selected editor id so that matches works with the isActive check
		untypedEditor.options = { override: selectedEditor.editorInfo.id, ...untypedEditor.options };

		// Check if diff can be created based on prescene of factory function
		if (selectedEditor.editorFactoryObject.createDiffEditorInput === undefined && isResourceDiffEditorInput(untypedEditor)) {
			return ResolvedStatus.NONE;
		}

		const input = await this.doResolveEditor(untypedEditor, group, selectedEditor);
		if (conflictingDefault && input) {
			// Show the conflicting default dialog
			await this.doHandleConflictingDefaults(resource, selectedEditor.editorInfo.label, untypedEditor, input.editor, group);
		}

		if (input) {
			this.sendEditorResolutionTelemetry(input.editor);
			if (input.editor.editorId !== selectedEditor.editorInfo.id) {
				this.logService.warn(`Editor ID Mismatch: ${input.editor.editorId} !== ${selectedEditor.editorInfo.id}. This will cause bugs. Please ensure editorInput.editorId matches the registered id`);
			}
			return { ...input, group };
		}
		return ResolvedStatus.ABORT;
	}

	private async doResolveSideBySideEditor(editor: IResourceSideBySideEditorInput, preferredGroup: PreferredGroup | undefined): Promise<ResolvedEditor> {
		const primaryResolvedEditor = await this.resolveEditor(editor.primary, preferredGroup);
		if (!isEditorInputWithOptionsAndGroup(primaryResolvedEditor)) {
			return ResolvedStatus.NONE;
		}
		const secondaryResolvedEditor = await this.resolveEditor(editor.secondary, primaryResolvedEditor.group ?? preferredGroup);
		if (!isEditorInputWithOptionsAndGroup(secondaryResolvedEditor)) {
			return ResolvedStatus.NONE;
		}
		return {
			group: primaryResolvedEditor.group ?? secondaryResolvedEditor.group,
			editor: this.instantiationService.createInstance(SideBySideEditorInput, editor.label, editor.description, secondaryResolvedEditor.editor, primaryResolvedEditor.editor),
			options: editor.options
		};
	}

	bufferChangeEvents(callback: Function): void {
		this._onDidChangeEditorRegistrations.pause();
		try {
			callback();
		} finally {
			this._onDidChangeEditorRegistrations.resume();
		}
	}

	registerEditor(
		globPattern: string | glob.IRelativePattern,
		editorInfo: RegisteredEditorInfo,
		options: RegisteredEditorOptions,
		editorFactoryObject: EditorInputFactoryObject
	): IDisposable {
		let registeredEditor = this._editors.get(globPattern);
		if (registeredEditor === undefined) {
			registeredEditor = new Map<string, RegisteredEditors>();
			this._editors.set(globPattern, registeredEditor);
		}

		let editorsWithId = registeredEditor.get(editorInfo.id);
		if (editorsWithId === undefined) {
			editorsWithId = [];
		}
		const remove = insert(editorsWithId, {
			globPattern,
			editorInfo,
			options,
			editorFactoryObject
		});
		registeredEditor.set(editorInfo.id, editorsWithId);
		this._shouldReFlattenEditors = true;
		this._onDidChangeEditorRegistrations.fire();
		return toDisposable(() => {
			remove();
			if (editorsWithId && editorsWithId.length === 0) {
				registeredEditor?.delete(editorInfo.id);
			}
			this._shouldReFlattenEditors = true;
			this._onDidChangeEditorRegistrations.fire();
		});
	}

	getAssociationsForResource(resource: URI): EditorAssociations {
		const associations = this.getAllUserAssociations();
		let matchingAssociations = associations.filter(association => association.filenamePattern && globMatchesResource(association.filenamePattern, resource));
		// Sort matching associations based on glob length as a longer glob will be more specific
		matchingAssociations = matchingAssociations.sort((a, b) => (b.filenamePattern?.length ?? 0) - (a.filenamePattern?.length ?? 0));
		const allEditors: RegisteredEditors = this._registeredEditors;
		// Ensure that the settings are valid editors
		return matchingAssociations.filter(association => allEditors.find(c => c.editorInfo.id === association.viewType));
	}

	private getAllUserAssociations(): EditorAssociations {
		const inspectedEditorAssociations = this.configurationService.inspect<{ [fileNamePattern: string]: string }>(editorsAssociationsSettingId) || {};
    /* below codes are changed by github1s */
		const defaultAssociations = inspectedEditorAssociations.defaultValue ?? {};
		const workspaceAssociations = inspectedEditorAssociations.workspaceValue ?? {};
		const userAssociations = inspectedEditorAssociations.userValue ?? {};
		const rawAssociations: { [fileNamePattern: string]: string } = { ...workspaceAssociations };
		// We want to apply the default associations and user associations on top of the workspace associations but ignore duplicate keys.
    /* above codes are changed by github1s */
		for (const [key, value] of Object.entries({ ...defaultAssociations, ...userAssociations })) {
			if (rawAssociations[key] === undefined) {
				rawAssociations[key] = value;
			}
		}
		const associations = [];
		for (const [key, value] of Object.entries(rawAssociations)) {
			const association: EditorAssociation = {
				filenamePattern: key,
				viewType: value
			};
			associations.push(association);
		}
		return associations;
	}

	/**
	 * Given the nested nature of the editors map, we merge factories of the same glob and id to make it flat
	 * and easier to work with
	 */
	private _flattenEditorsMap() {
		// If we shouldn't be re-flattening (due to lack of update) then return early
		if (!this._shouldReFlattenEditors) {
			return this._flattenedEditors;
		}
		this._shouldReFlattenEditors = false;
		const editors = new Map<string | glob.IRelativePattern, RegisteredEditors>();
		for (const [glob, value] of this._editors) {
			const registeredEditors: RegisteredEditors = [];
			for (const editors of value.values()) {
				let registeredEditor: RegisteredEditor | undefined = undefined;
				// Merge all editors with the same id and glob pattern together
				for (const editor of editors) {
					if (!registeredEditor) {
						registeredEditor = {
							editorInfo: editor.editorInfo,
							globPattern: editor.globPattern,
							options: {},
							editorFactoryObject: {}
						};
					}
					// Merge options and factories
					registeredEditor.options = { ...registeredEditor.options, ...editor.options };
					registeredEditor.editorFactoryObject = { ...registeredEditor.editorFactoryObject, ...editor.editorFactoryObject };
				}
				if (registeredEditor) {
					registeredEditors.push(registeredEditor);
				}
			}
			editors.set(glob, registeredEditors);
		}
		return editors;
	}

	/**
	 * Returns all editors as an array. Possible to contain duplicates
	 */
	private get _registeredEditors(): RegisteredEditors {
		return flatten(Array.from(this._flattenedEditors.values()));
	}

	updateUserAssociations(globPattern: string, editorID: string): void {
		const newAssociation: EditorAssociation = { viewType: editorID, filenamePattern: globPattern };
		const currentAssociations = this.getAllUserAssociations();
		const newSettingObject = Object.create(null);
		// Form the new setting object including the newest associations
		for (const association of [...currentAssociations, newAssociation]) {
			if (association.filenamePattern) {
				newSettingObject[association.filenamePattern] = association.viewType;
			}
		}
		this.configurationService.updateValue(editorsAssociationsSettingId, newSettingObject);
	}

	private findMatchingEditors(resource: URI): RegisteredEditor[] {
		// The user setting should be respected even if the editor doesn't specify that resource in package.json
		const userSettings = this.getAssociationsForResource(resource);
		const matchingEditors: RegisteredEditor[] = [];
		// Then all glob patterns
		for (const [key, editors] of this._flattenedEditors) {
			for (const editor of editors) {
				const foundInSettings = userSettings.find(setting => setting.viewType === editor.editorInfo.id);
				if ((foundInSettings && editor.editorInfo.priority !== RegisteredEditorPriority.exclusive) || globMatchesResource(key, resource)) {
					matchingEditors.push(editor);
				}
			}
		}
		// Return the editors sorted by their priority
		return matchingEditors.sort((a, b) => {
			// Very crude if priorities match longer glob wins as longer globs are normally more specific
			if (priorityToRank(b.editorInfo.priority) === priorityToRank(a.editorInfo.priority) && typeof b.globPattern === 'string' && typeof a.globPattern === 'string') {
				return b.globPattern.length - a.globPattern.length;
			}
			return priorityToRank(b.editorInfo.priority) - priorityToRank(a.editorInfo.priority);
		});
	}

	public getEditors(resource?: URI): RegisteredEditorInfo[] {
		this._flattenedEditors = this._flattenEditorsMap();

		// By resource
		if (URI.isUri(resource)) {
			const editors = this.findMatchingEditors(resource);
			if (editors.find(e => e.editorInfo.priority === RegisteredEditorPriority.exclusive)) {
				return [];
			}
			return editors.map(editor => editor.editorInfo);
		}

		// All
		return distinct(this._registeredEditors.map(editor => editor.editorInfo), editor => editor.id);
	}

	/**
	 * Given a resource and an editorId selects the best possible editor
	 * @returns The editor and whether there was another default which conflicted with it
	 */
	private getEditor(resource: URI, editorId: string | EditorResolution.EXCLUSIVE_ONLY | undefined): { editor: RegisteredEditor | undefined; conflictingDefault: boolean } {

		const findMatchingEditor = (editors: RegisteredEditors, viewType: string) => {
			return editors.find((editor) => {
				if (editor.options && editor.options.canSupportResource !== undefined) {
					return editor.editorInfo.id === viewType && editor.options.canSupportResource(resource);
				}
				return editor.editorInfo.id === viewType;
			});
		};

		if (editorId && editorId !== EditorResolution.EXCLUSIVE_ONLY) {
			// Specific id passed in doesn't have to match the resource, it can be anything
			const registeredEditors = this._registeredEditors;
			return {
				editor: findMatchingEditor(registeredEditors, editorId),
				conflictingDefault: false
			};
		}

		const editors = this.findMatchingEditors(resource);

		const associationsFromSetting = this.getAssociationsForResource(resource);
		// We only want minPriority+ if no user defined setting is found, else we won't resolve an editor
		const minPriority = editorId === EditorResolution.EXCLUSIVE_ONLY ? RegisteredEditorPriority.exclusive : RegisteredEditorPriority.builtin;
		let possibleEditors = editors.filter(editor => priorityToRank(editor.editorInfo.priority) >= priorityToRank(minPriority) && editor.editorInfo.id !== DEFAULT_EDITOR_ASSOCIATION.id);
		if (possibleEditors.length === 0) {
			return {
				editor: associationsFromSetting[0] && minPriority !== RegisteredEditorPriority.exclusive ? findMatchingEditor(editors, associationsFromSetting[0].viewType) : undefined,
				conflictingDefault: false
			};
		}
		// If the editor is exclusive we use that, else use the user setting, else use the built-in+ editor
		const selectedViewType = possibleEditors[0].editorInfo.priority === RegisteredEditorPriority.exclusive ?
			possibleEditors[0].editorInfo.id :
			associationsFromSetting[0]?.viewType || possibleEditors[0].editorInfo.id;

		let conflictingDefault = false;

		// Filter out exclusive before we check for conflicts as exclusive editors cannot be manually chosen
		possibleEditors = possibleEditors.filter(editor => editor.editorInfo.priority !== RegisteredEditorPriority.exclusive);
		if (associationsFromSetting.length === 0 && possibleEditors.length > 1) {
			conflictingDefault = true;
		}

		return {
			editor: findMatchingEditor(editors, selectedViewType),
			conflictingDefault
		};
	}

	private async doResolveEditor(editor: IUntypedEditorInput, group: IEditorGroup, selectedEditor: RegisteredEditor): Promise<EditorInputWithOptions | undefined> {
		let options = editor.options;
		const resource = EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
		// If no activation option is provided, populate it.
		if (options && typeof options.activation === 'undefined') {
			options = { ...options, activation: options.preserveFocus ? EditorActivation.RESTORE : undefined };
		}

		// If it's a merge editor we trigger the create merge editor input
		if (isResourceMergeEditorInput(editor)) {
			if (!selectedEditor.editorFactoryObject.createMergeEditorInput) {
				return;
			}
			const inputWithOptions = await selectedEditor.editorFactoryObject.createMergeEditorInput(editor, group);
			return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
		}

		// If it's a diff editor we trigger the create diff editor input
		if (isResourceDiffEditorInput(editor)) {
			if (!selectedEditor.editorFactoryObject.createDiffEditorInput) {
				return;
			}
			const inputWithOptions = await selectedEditor.editorFactoryObject.createDiffEditorInput(editor, group);
			return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
		}

		if (isResourceSideBySideEditorInput(editor)) {
			throw new Error(`Untyped side by side editor input not supported here.`);
		}

		if (isUntitledResourceEditorInput(editor)) {
			if (!selectedEditor.editorFactoryObject.createUntitledEditorInput) {
				return;
			}
			const inputWithOptions = await selectedEditor.editorFactoryObject.createUntitledEditorInput(editor, group);
			return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
		}

		// Should no longer have an undefined resource so lets throw an error if that's somehow the case
		if (resource === undefined) {
			throw new Error(`Undefined resource on non untitled editor input.`);
		}

		// If the editor states it can only be opened once per resource we must close all existing ones except one and move the new one into the group
		const singleEditorPerResource = typeof selectedEditor.options?.singlePerResource === 'function' ? selectedEditor.options.singlePerResource() : selectedEditor.options?.singlePerResource;
		if (singleEditorPerResource) {
			const foundInput = await this.moveExistingEditorForResource(resource, selectedEditor.editorInfo.id, group);
			if (foundInput) {
				return { editor: foundInput, options };
			}
		}

		// If no factory is above, return flow back to caller letting them know we could not resolve it
		if (!selectedEditor.editorFactoryObject.createEditorInput) {
			return;
		}

		// Respect options passed back
		const inputWithOptions = await selectedEditor.editorFactoryObject.createEditorInput(editor, group);
		options = inputWithOptions.options ?? options;
		const input = inputWithOptions.editor;

		return { editor: input, options };
	}

	/**
	 * Moves an editor with the resource and viewtype to target group if one exists
	 * Additionally will close any other editors that are open for that resource and viewtype besides the first one found
	 * @param resource The resource of the editor
	 * @param viewType the viewtype of the editor
	 * @param targetGroup The group to move it to
	 * @returns An editor input if one exists, else undefined
	 */
	private async moveExistingEditorForResource(
		resource: URI,
		viewType: string,
		targetGroup: IEditorGroup,
	): Promise<EditorInput | undefined> {
		const editorInfoForResource = this.findExistingEditorsForResource(resource, viewType);
		if (!editorInfoForResource.length) {
			return;
		}

		const editorToUse = editorInfoForResource[0];

		// We should only have one editor but if there are multiple we close the others
		for (const { editor, group } of editorInfoForResource) {
			if (editor !== editorToUse.editor) {
				const closed = await group.closeEditor(editor);
				if (!closed) {
					return;
				}
			}
		}

		// Move the editor already opened to the target group
		if (targetGroup.id !== editorToUse.group.id) {
			editorToUse.group.moveEditor(editorToUse.editor, targetGroup);
			return editorToUse.editor;
		}
		return;
	}

	/**
	 * Given a resource and an editorId, returns all editors open for that resource and editorId.
	 * @param resource The resource specified
	 * @param editorId The editorID
	 * @returns A list of editors
	 */
	private findExistingEditorsForResource(
		resource: URI,
		editorId: string,
	): Array<{ editor: EditorInput; group: IEditorGroup }> {
		const out: Array<{ editor: EditorInput; group: IEditorGroup }> = [];
		const orderedGroups = distinct([
			...this.editorGroupService.groups,
		]);

		for (const group of orderedGroups) {
			for (const editor of group.editors) {
				if (isEqual(editor.resource, resource) && editor.editorId === editorId) {
					out.push({ editor, group });
				}
			}
		}
		return out;
	}

	private async doHandleConflictingDefaults(resource: URI, editorName: string, untypedInput: IUntypedEditorInput, currentEditor: EditorInput, group: IEditorGroup) {
		type StoredChoice = {
			[key: string]: string[];
		};
		const editors = this.findMatchingEditors(resource);
		const storedChoices: StoredChoice = JSON.parse(this.storageService.get(EditorResolverService.conflictingDefaultsStorageID, StorageScope.PROFILE, '{}'));
		const globForResource = `*${extname(resource)}`;
		// Writes to the storage service that a choice has been made for the currently installed editors
		const writeCurrentEditorsToStorage = () => {
			storedChoices[globForResource] = [];
			editors.forEach(editor => storedChoices[globForResource].push(editor.editorInfo.id));
			this.storageService.store(EditorResolverService.conflictingDefaultsStorageID, JSON.stringify(storedChoices), StorageScope.PROFILE, StorageTarget.MACHINE);
		};

		// If the user has already made a choice for this editor we don't want to ask them again
		if (storedChoices[globForResource] && storedChoices[globForResource].find(editorID => editorID === currentEditor.editorId)) {
			return;
		}

		const handle = this.notificationService.prompt(Severity.Warning,
			localize('editorResolver.conflictingDefaults', 'There are multiple default editors available for the resource.'),
			[{
				label: localize('editorResolver.configureDefault', 'Configure Default'),
				run: async () => {
					// Show the picker and tell it to update the setting to whatever the user selected
					const picked = await this.doPickEditor(untypedInput, true);
					if (!picked) {
						return;
					}
					untypedInput.options = picked;
					const replacementEditor = await this.resolveEditor(untypedInput, group);
					if (replacementEditor === ResolvedStatus.ABORT || replacementEditor === ResolvedStatus.NONE) {
						return;
					}
					// Replace the current editor with the picked one
					group.replaceEditors([
						{
							editor: currentEditor,
							replacement: replacementEditor.editor,
							options: replacementEditor.options ?? picked,
						}
					]);
				}
			},
			{
				label: localize('editorResolver.keepDefault', 'Keep {0}', editorName),
				run: writeCurrentEditorsToStorage
			}
			]);
		// If the user pressed X we assume they want to keep the current editor as default
		const onCloseListener = handle.onDidClose(() => {
			writeCurrentEditorsToStorage();
			onCloseListener.dispose();
		});
	}

	private mapEditorsToQuickPickEntry(resource: URI, showDefaultPicker?: boolean) {
		const currentEditor = firstOrDefault(this.editorGroupService.activeGroup.findEditors(resource));
		// If untitled, we want all registered editors
		let registeredEditors = resource.scheme === Schemas.untitled ? this._registeredEditors.filter(e => e.editorInfo.priority !== RegisteredEditorPriority.exclusive) : this.findMatchingEditors(resource);
		// We don't want duplicate Id entries
		registeredEditors = distinct(registeredEditors, c => c.editorInfo.id);
		const defaultSetting = this.getAssociationsForResource(resource)[0]?.viewType;
		// Not the most efficient way to do this, but we want to ensure the text editor is at the top of the quickpick
		registeredEditors = registeredEditors.sort((a, b) => {
			if (a.editorInfo.id === DEFAULT_EDITOR_ASSOCIATION.id) {
				return -1;
			} else if (b.editorInfo.id === DEFAULT_EDITOR_ASSOCIATION.id) {
				return 1;
			} else {
				return priorityToRank(b.editorInfo.priority) - priorityToRank(a.editorInfo.priority);
			}
		});
		const quickPickEntries: Array<QuickPickItem> = [];
		const currentlyActiveLabel = localize('promptOpenWith.currentlyActive', "Active");
		const currentDefaultLabel = localize('promptOpenWith.currentDefault', "Default");
		const currentDefaultAndActiveLabel = localize('promptOpenWith.currentDefaultAndActive', "Active and Default");
		// Default order = setting -> highest priority -> text
		let defaultViewType = defaultSetting;
		if (!defaultViewType && registeredEditors.length > 2 && registeredEditors[1]?.editorInfo.priority !== RegisteredEditorPriority.option) {
			defaultViewType = registeredEditors[1]?.editorInfo.id;
		}
		if (!defaultViewType) {
			defaultViewType = DEFAULT_EDITOR_ASSOCIATION.id;
		}
		// Map the editors to quickpick entries
		registeredEditors.forEach(editor => {
			const currentViewType = currentEditor?.editorId ?? DEFAULT_EDITOR_ASSOCIATION.id;
			const isActive = currentEditor ? editor.editorInfo.id === currentViewType : false;
			const isDefault = editor.editorInfo.id === defaultViewType;
			const quickPickEntry: IQuickPickItem = {
				id: editor.editorInfo.id,
				label: editor.editorInfo.label,
				description: isActive && isDefault ? currentDefaultAndActiveLabel : isActive ? currentlyActiveLabel : isDefault ? currentDefaultLabel : undefined,
				detail: editor.editorInfo.detail ?? editor.editorInfo.priority,
			};
			quickPickEntries.push(quickPickEntry);
		});
		if (!showDefaultPicker && extname(resource) !== '') {
			const separator: IQuickPickSeparator = { type: 'separator' };
			quickPickEntries.push(separator);
			const configureDefaultEntry = {
				id: EditorResolverService.configureDefaultID,
				label: localize('promptOpenWith.configureDefault', "Configure default editor for '{0}'...", `*${extname(resource)}`),
			};
			quickPickEntries.push(configureDefaultEntry);
		}
		return quickPickEntries;
	}

	private async doPickEditor(editor: IUntypedEditorInput, showDefaultPicker?: boolean): Promise<IEditorOptions | undefined> {

		type EditorPick = {
			readonly item: IQuickPickItem;
			readonly keyMods?: IKeyMods;
			readonly openInBackground: boolean;
		};

		let resource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });

		if (resource === undefined) {
			resource = URI.from({ scheme: Schemas.untitled });
		}

		// Get all the editors for the resource as quickpick entries
		const editorPicks = this.mapEditorsToQuickPickEntry(resource, showDefaultPicker);

		// Create the editor picker
		const editorPicker = this.quickInputService.createQuickPick<IQuickPickItem>();
		const placeHolderMessage = showDefaultPicker ?
			localize('promptOpenWith.updateDefaultPlaceHolder', "Select new default editor for '{0}'", `*${extname(resource)}`) :
			localize('promptOpenWith.placeHolder', "Select editor for '{0}'", basename(resource));
		editorPicker.placeholder = placeHolderMessage;
		editorPicker.canAcceptInBackground = true;
		editorPicker.items = editorPicks;
		const firstItem = editorPicker.items.find(item => item.type === 'item') as IQuickPickItem | undefined;
		if (firstItem) {
			editorPicker.selectedItems = [firstItem];
		}

		// Prompt the user to select an editor
		const picked: EditorPick | undefined = await new Promise<EditorPick | undefined>(resolve => {
			editorPicker.onDidAccept(e => {
				let result: EditorPick | undefined = undefined;

				if (editorPicker.selectedItems.length === 1) {
					result = {
						item: editorPicker.selectedItems[0],
						keyMods: editorPicker.keyMods,
						openInBackground: e.inBackground
					};
				}

				// If asked to always update the setting then update it even if the gear isn't clicked
				if (resource && showDefaultPicker && result?.item.id) {
					this.updateUserAssociations(`*${extname(resource)}`, result.item.id,);
				}

				resolve(result);
			});

			editorPicker.onDidHide(() => resolve(undefined));

			editorPicker.onDidTriggerItemButton(e => {

				// Trigger opening and close picker
				resolve({ item: e.item, openInBackground: false });

				// Persist setting
				if (resource && e.item && e.item.id) {
					this.updateUserAssociations(`*${extname(resource)}`, e.item.id,);
				}
			});

			editorPicker.show();
		});

		// Close picker
		editorPicker.dispose();

		// If the user picked an editor, look at how the picker was
		// used (e.g. modifier keys, open in background) and create the
		// options and group to use accordingly
		if (picked) {

			// If the user selected to configure default we trigger this picker again and tell it to show the default picker
			if (picked.item.id === EditorResolverService.configureDefaultID) {
				return this.doPickEditor(editor, true);
			}

			// Figure out options
			const targetOptions: IEditorOptions = {
				...editor.options,
				override: picked.item.id,
				preserveFocus: picked.openInBackground || editor.options?.preserveFocus,
			};

			return targetOptions;
		}

		return undefined;
	}

	private sendEditorResolutionTelemetry(chosenInput: EditorInput): void {
		type editorResolutionClassification = {
			viewType: { classification: 'PublicNonPersonalData'; purpose: 'FeatureInsight'; comment: 'The id of the editor opened. Used to gain an understanding of what editors are most popular' };
			owner: 'lramos15';
			comment: 'An event that fires when an editor type is picked';
		};
		type editorResolutionEvent = {
			viewType: string;
		};
		if (chosenInput.editorId) {
			this.telemetryService.publicLog2<editorResolutionEvent, editorResolutionClassification>('override.viewType', { viewType: chosenInput.editorId });
		}
	}

	private cacheEditors() {
		// Create a set to store glob patterns
		const cacheStorage: Set<string> = new Set<string>();

		// Store just the relative pattern pieces without any path info
		for (const [globPattern, contribPoint] of this._flattenedEditors) {
			const nonOptional = !!contribPoint.find(c => c.editorInfo.priority !== RegisteredEditorPriority.option && c.editorInfo.id !== DEFAULT_EDITOR_ASSOCIATION.id);
			// Don't keep a cache of the optional ones as those wouldn't be opened on start anyways
			if (!nonOptional) {
				continue;
			}
			if (glob.isRelativePattern(globPattern)) {
				cacheStorage.add(`${globPattern.pattern}`);
			} else {
				cacheStorage.add(globPattern);
			}
		}

		// Also store the users settings as those would have to activate on startup as well
		const userAssociations = this.getAllUserAssociations();
		for (const association of userAssociations) {
			if (association.filenamePattern) {
				cacheStorage.add(association.filenamePattern);
			}
		}
		this.storageService.store(EditorResolverService.cacheStorageID, JSON.stringify(Array.from(cacheStorage)), StorageScope.PROFILE, StorageTarget.MACHINE);
	}

	private resourceMatchesCache(resource: URI): boolean {
		if (!this.cache) {
			return false;
		}

		for (const cacheEntry of this.cache) {
			if (globMatchesResource(cacheEntry, resource)) {
				return true;
			}
		}
		return false;
	}
}

registerSingleton(IEditorResolverService, EditorResolverService, InstantiationType.Eager);
