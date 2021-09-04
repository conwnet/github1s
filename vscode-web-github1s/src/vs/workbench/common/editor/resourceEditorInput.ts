/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Verbosity, IEditorInputWithPreferredResource, EditorInputCapabilities } from 'vs/workbench/common/editor';
import { EditorInput } from 'vs/workbench/common/editor/editorInput';
import { URI } from 'vs/base/common/uri';
import { IFileService, FileSystemProviderCapabilities } from 'vs/platform/files/common/files';
import { ILabelService } from 'vs/platform/label/common/label';
import { dirname, isEqual } from 'vs/base/common/resources';

/**
 * The base class for all editor inputs that open resources.
 */
export abstract class AbstractResourceEditorInput extends EditorInput implements IEditorInputWithPreferredResource {

	override get capabilities(): EditorInputCapabilities {
		let capabilities = EditorInputCapabilities.None;

		if (this.fileService.canHandleResource(this.resource)) {
			if (this.fileService.hasCapability(this.resource, FileSystemProviderCapabilities.Readonly)) {
				capabilities |= EditorInputCapabilities.Readonly;
			}
		} else {
			capabilities |= EditorInputCapabilities.Untitled;
		}

		return capabilities;
	}

	private _preferredResource: URI;
	get preferredResource(): URI { return this._preferredResource; }

	constructor(
		readonly resource: URI,
		preferredResource: URI | undefined,
		@ILabelService protected readonly labelService: ILabelService,
		@IFileService protected readonly fileService: IFileService
	) {
		super();

		this._preferredResource = preferredResource || resource;

		this.registerListeners();
	}

	private registerListeners(): void {

		// Clear our labels on certain label related events
		this._register(this.labelService.onDidChangeFormatters(e => this.onLabelEvent(e.scheme)));
		this._register(this.fileService.onDidChangeFileSystemProviderRegistrations(e => this.onLabelEvent(e.scheme)));
		this._register(this.fileService.onDidChangeFileSystemProviderCapabilities(e => this.onLabelEvent(e.scheme)));
	}

	private onLabelEvent(scheme: string): void {
		if (scheme === this._preferredResource.scheme) {
			this.updateLabel();
		}
	}

	private updateLabel(): void {

		// Clear any cached labels from before
		this._name = undefined;
		this._shortDescription = undefined;
		this._mediumDescription = undefined;
		this._longDescription = undefined;
		this._shortTitle = undefined;
		this._mediumTitle = undefined;
		this._longTitle = undefined;

		// Trigger recompute of label
		this._onDidChangeLabel.fire();
	}

	setPreferredResource(preferredResource: URI): void {
		if (!isEqual(preferredResource, this._preferredResource)) {
			this._preferredResource = preferredResource;

			this.updateLabel();
		}
	}

	private _name: string | undefined = undefined;
	override getName(skipDecorate?: boolean): string {
		if (typeof this._name !== 'string') {
			this._name = this.labelService.getUriBasenameLabel(this._preferredResource);
		}

		return skipDecorate ? this._name : this.decorateLabel(this._name);
	}

	override getDescription(verbosity = Verbosity.MEDIUM): string | undefined {
		switch (verbosity) {
			case Verbosity.SHORT:
				return this.shortDescription;
			case Verbosity.LONG:
				return this.longDescription;
			case Verbosity.MEDIUM:
			default:
				return this.mediumDescription;
		}
	}

	private _shortDescription: string | undefined = undefined;
	private get shortDescription(): string {
		if (typeof this._shortDescription !== 'string') {
			this._shortDescription = this.labelService.getUriBasenameLabel(dirname(this._preferredResource));
		}

		return this._shortDescription;
	}

	private _mediumDescription: string | undefined = undefined;
	private get mediumDescription(): string {
		if (typeof this._mediumDescription !== 'string') {
			this._mediumDescription = this.labelService.getUriLabel(dirname(this._preferredResource), { relative: true });
		}

		return this._mediumDescription;
	}

	private _longDescription: string | undefined = undefined;
	private get longDescription(): string {
		if (typeof this._longDescription !== 'string') {
			this._longDescription = this.labelService.getUriLabel(dirname(this._preferredResource));
		}

		return this._longDescription;
	}

	private _shortTitle: string | undefined = undefined;
	private get shortTitle(): string {
		if (typeof this._shortTitle !== 'string') {
			this._shortTitle = this.getName(true /* skip decorations */);
		}

		return this._shortTitle;
	}

	private _mediumTitle: string | undefined = undefined;
	private get mediumTitle(): string {
		if (typeof this._mediumTitle !== 'string') {
			this._mediumTitle = this.labelService.getUriLabel(this._preferredResource, { relative: true });
		}

		return this._mediumTitle;
	}

	private _longTitle: string | undefined = undefined;
	private get longTitle(): string {
		if (typeof this._longTitle !== 'string') {
			this._longTitle = this.labelService.getUriLabel(this._preferredResource);
		}

		return this._longTitle;
	}

	override getTitle(verbosity?: Verbosity): string {
		switch (verbosity) {
			case Verbosity.SHORT:
				return this.decorateLabel(this.shortTitle);
			case Verbosity.LONG:
				return this.decorateLabel(this.longTitle);
			default:
			case Verbosity.MEDIUM:
				return this.decorateLabel(this.mediumTitle);
		}
	}

	private decorateLabel(label: string): string {
		// below codes are changed by github1s
		// remove read-only tips
		return decorateFileEditorLabel(label, { orphaned: false, readonly: false });
		// above codes are changed by github1s
	}

	isOrphaned(): boolean {
		return false;
	}
}

export function decorateFileEditorLabel(label: string, state: { orphaned: boolean, readonly: boolean }): string {
	if (state.orphaned && state.readonly) {
		return localize('orphanedReadonlyFile', "{0} (deleted, read-only)", label);
	}

	if (state.orphaned) {
		return localize('orphanedFile', "{0} (deleted)", label);
	}

	if (state.readonly) {
		return localize('readonlyFile', "{0} (read-only)", label);
	}

	return label;
}
