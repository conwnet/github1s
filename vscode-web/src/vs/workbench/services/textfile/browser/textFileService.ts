/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { URI } from 'vs/base/common/uri';
import { IEncodingSupport, ITextFileService, ITextFileStreamContent, ITextFileContent, IResourceEncodings, IReadTextFileOptions, IWriteTextFileOptions, toBufferOrReadable, TextFileOperationError, TextFileOperationResult, ITextFileSaveOptions, ITextFileEditorModelManager, IResourceEncoding, stringToSnapshot, ITextFileSaveAsOptions, IReadTextFileEncodingOptions, TextFileEditorModelState } from 'vs/workbench/services/textfile/common/textfiles';
import { IRevertOptions, SaveSourceRegistry } from 'vs/workbench/common/editor';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IFileService, FileOperationError, FileOperationResult, IFileStatWithMetadata, ICreateFileOptions, IFileStreamContent } from 'vs/platform/files/common/files';
import { Disposable } from 'vs/base/common/lifecycle';
import { extname as pathExtname } from 'vs/base/common/path';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IUntitledTextEditorService, IUntitledTextEditorModelManager } from 'vs/workbench/services/untitled/common/untitledTextEditorService';
import { UntitledTextEditorModel } from 'vs/workbench/services/untitled/common/untitledTextEditorModel';
import { TextFileEditorModelManager } from 'vs/workbench/services/textfile/common/textFileEditorModelManager';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { Schemas } from 'vs/base/common/network';
import { createTextBufferFactoryFromSnapshot, createTextBufferFactoryFromStream } from 'vs/editor/common/model/textModel';
import { IModelService } from 'vs/editor/common/services/model';
import { joinPath, dirname, basename, toLocalResource, extname, isEqual } from 'vs/base/common/resources';
import { IDialogService, IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { VSBuffer, VSBufferReadable, bufferToStream, VSBufferReadableStream } from 'vs/base/common/buffer';
import { ITextSnapshot, ITextModel } from 'vs/editor/common/model';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfiguration';
import { PLAINTEXT_LANGUAGE_ID } from 'vs/editor/common/languages/modesRegistry';
import { IFilesConfigurationService } from 'vs/workbench/services/filesConfiguration/common/filesConfigurationService';
import { IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { BaseTextEditorModel } from 'vs/workbench/common/editor/textEditorModel';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IPathService } from 'vs/workbench/services/path/common/pathService';
import { IWorkingCopyFileService, IFileOperationUndoRedoInfo, ICreateFileOperation } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { IUriIdentityService } from 'vs/platform/uriIdentity/common/uriIdentity';
import { IWorkspaceContextService, WORKSPACE_EXTENSION } from 'vs/platform/workspace/common/workspace';
import { UTF8, UTF8_with_bom, UTF16be, UTF16le, encodingExists, toEncodeReadable, toDecodeStream, IDecodeStreamResult, DecodeStreamError, DecodeStreamErrorKind } from 'vs/workbench/services/textfile/common/encoding';
import { consumeStream, ReadableStream } from 'vs/base/common/stream';
import { ILanguageService } from 'vs/editor/common/languages/language';
import { ILogService } from 'vs/platform/log/common/log';
import { CancellationToken, CancellationTokenSource } from 'vs/base/common/cancellation';
import { IElevatedFileService } from 'vs/workbench/services/files/common/elevatedFileService';
import { IDecorationData, IDecorationsProvider, IDecorationsService } from 'vs/workbench/services/decorations/common/decorations';
import { Emitter } from 'vs/base/common/event';
import { Codicon } from 'vs/base/common/codicons';
import { listErrorForeground } from 'vs/platform/theme/common/colorRegistry';
import { withNullAsUndefined } from 'vs/base/common/types';
import { firstOrDefault } from 'vs/base/common/arrays';

/**
 * The workbench file service implementation implements the raw file service spec and adds additional methods on top.
 */
export abstract class AbstractTextFileService extends Disposable implements ITextFileService {

	declare readonly _serviceBrand: undefined;

	private static readonly TEXTFILE_SAVE_CREATE_SOURCE = SaveSourceRegistry.registerSource('textFileCreate.source', localize('textFileCreate.source', "File Created"));
	private static readonly TEXTFILE_SAVE_REPLACE_SOURCE = SaveSourceRegistry.registerSource('textFileOverwrite.source', localize('textFileOverwrite.source', "File Replaced"));

	readonly files: ITextFileEditorModelManager = this._register(this.instantiationService.createInstance(TextFileEditorModelManager));

	readonly untitled: IUntitledTextEditorModelManager = this.untitledTextEditorService;

	constructor(
		@IFileService protected readonly fileService: IFileService,
		@IUntitledTextEditorService private untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService protected readonly lifecycleService: ILifecycleService,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@IModelService private readonly modelService: IModelService,
		@IWorkbenchEnvironmentService protected readonly environmentService: IWorkbenchEnvironmentService,
		@IDialogService private readonly dialogService: IDialogService,
		@IFileDialogService private readonly fileDialogService: IFileDialogService,
		@ITextResourceConfigurationService protected readonly textResourceConfigurationService: ITextResourceConfigurationService,
		@IFilesConfigurationService protected readonly filesConfigurationService: IFilesConfigurationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService,
		@IPathService private readonly pathService: IPathService,
		@IWorkingCopyFileService private readonly workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService,
		@ILanguageService private readonly languageService: ILanguageService,
		@ILogService protected readonly logService: ILogService,
		@IElevatedFileService private readonly elevatedFileService: IElevatedFileService,
		@IDecorationsService private readonly decorationsService: IDecorationsService
	) {
		super();

		/* below codes are changed by github1s */
		if (!window?.vscodeWeb?.hideTextFileLabelDecorations) {
			this.provideDecorations();
		}
		/* above codes are changed by github1s */
	}

	//#region decorations

	private provideDecorations(): void {

		// Text file model decorations
		this.decorationsService.registerDecorationsProvider(new class extends Disposable implements IDecorationsProvider {

			readonly label = localize('textFileModelDecorations', "Text File Model Decorations");

			private readonly _onDidChange = this._register(new Emitter<URI[]>());
			readonly onDidChange = this._onDidChange.event;

			constructor(private readonly files: ITextFileEditorModelManager) {
				super();

				this.registerListeners();
			}

			private registerListeners(): void {

				// Creates
				this._register(this.files.onDidResolve(({ model }) => {
					if (model.isReadonly() || model.hasState(TextFileEditorModelState.ORPHAN)) {
						this._onDidChange.fire([model.resource]);
					}
				}));

				// Removals: once a text file model is no longer
				// under our control, make sure to signal this as
				// decoration change because from this point on we
				// have no way of updating the decoration anymore.
				this._register(this.files.onDidRemove(modelUri => this._onDidChange.fire([modelUri])));

				// Changes
				this._register(this.files.onDidChangeReadonly(model => this._onDidChange.fire([model.resource])));
				this._register(this.files.onDidChangeOrphaned(model => this._onDidChange.fire([model.resource])));
			}

			provideDecorations(uri: URI): IDecorationData | undefined {
				const model = this.files.get(uri);
				if (!model || model.isDisposed()) {
					return undefined;
				}

				const isReadonly = model.isReadonly();
				const isOrphaned = model.hasState(TextFileEditorModelState.ORPHAN);

				// Readonly + Orphaned
				if (isReadonly && isOrphaned) {
					return {
						color: listErrorForeground,
						letter: Codicon.lockSmall,
						strikethrough: true,
						tooltip: localize('readonlyAndDeleted', "Deleted, Read Only"),
					};
				}

				// Readonly
				else if (isReadonly) {
					return {
						letter: Codicon.lockSmall,
						tooltip: localize('readonly', "Read Only"),
					};
				}

				// Orphaned
				else if (isOrphaned) {
					return {
						color: listErrorForeground,
						strikethrough: true,
						tooltip: localize('deleted', "Deleted"),
					};
				}

				return undefined;
			}
		}(this.files));
	}

	//#endregin

	//#region text file read / write / create

	private _encoding: EncodingOracle | undefined;

	get encoding(): EncodingOracle {
		if (!this._encoding) {
			this._encoding = this._register(this.instantiationService.createInstance(EncodingOracle));
		}

		return this._encoding;
	}

	async read(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileContent> {
		const [bufferStream, decoder] = await this.doRead(resource, {
			...options,
			// optimization: since we know that the caller does not
			// care about buffering, we indicate this to the reader.
			// this reduces all the overhead the buffered reading
			// has (open, read, close) if the provider supports
			// unbuffered reading.
			preferUnbuffered: true
		});

		return {
			...bufferStream,
			encoding: decoder.detected.encoding || UTF8,
			value: await consumeStream(decoder.stream, strings => strings.join(''))
		};
	}

	async readStream(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileStreamContent> {
		const [bufferStream, decoder] = await this.doRead(resource, options);

		return {
			...bufferStream,
			encoding: decoder.detected.encoding || UTF8,
			value: await createTextBufferFactoryFromStream(decoder.stream)
		};
	}

	private async doRead(resource: URI, options?: IReadTextFileOptions & { preferUnbuffered?: boolean }): Promise<[IFileStreamContent, IDecodeStreamResult]> {
		const cts = new CancellationTokenSource();

		// read stream raw (either buffered or unbuffered)
		let bufferStream: IFileStreamContent;
		if (options?.preferUnbuffered) {
			const content = await this.fileService.readFile(resource, options, cts.token);
			bufferStream = {
				...content,
				value: bufferToStream(content.value)
			};
		} else {
			bufferStream = await this.fileService.readFileStream(resource, options, cts.token);
		}

		// read through encoding library
		try {
			const decoder = await this.doGetDecodedStream(resource, bufferStream.value, options);

			return [bufferStream, decoder];
		} catch (error) {

			// Make sure to cancel reading on error to
			// stop file service activity as soon as
			// possible. When for example a large binary
			// file is read we want to cancel the read
			// instantly.
			// Refs:
			// - https://github.com/microsoft/vscode/issues/138805
			// - https://github.com/microsoft/vscode/issues/132771
			cts.dispose(true);

			// special treatment for streams that are binary
			if ((<DecodeStreamError>error).decodeStreamErrorKind === DecodeStreamErrorKind.STREAM_IS_BINARY) {
				throw new TextFileOperationError(localize('fileBinaryError', "File seems to be binary and cannot be opened as text"), TextFileOperationResult.FILE_IS_BINARY, options);
			}

			// re-throw any other error as it is
			else {
				throw error;
			}
		}
	}

	async create(operations: { resource: URI; value?: string | ITextSnapshot; options?: ICreateFileOptions }[], undoInfo?: IFileOperationUndoRedoInfo): Promise<readonly IFileStatWithMetadata[]> {
		const operationsWithContents: ICreateFileOperation[] = await Promise.all(operations.map(async operation => {
			const contents = await this.getEncodedReadable(operation.resource, operation.value);
			return {
				resource: operation.resource,
				contents,
				overwrite: operation.options?.overwrite
			};
		}));

		return this.workingCopyFileService.create(operationsWithContents, CancellationToken.None, undoInfo);
	}

	async write(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<IFileStatWithMetadata> {
		const readable = await this.getEncodedReadable(resource, value, options);

		if (options?.writeElevated && this.elevatedFileService.isSupported(resource)) {
			return this.elevatedFileService.writeFileElevated(resource, readable, options);
		}

		return this.fileService.writeFile(resource, readable, options);
	}

	async getEncodedReadable(resource: URI, value: ITextSnapshot): Promise<VSBufferReadable>;
	async getEncodedReadable(resource: URI, value: string): Promise<VSBuffer>;
	async getEncodedReadable(resource: URI, value?: ITextSnapshot): Promise<VSBufferReadable | undefined>;
	async getEncodedReadable(resource: URI, value?: string): Promise<VSBuffer | undefined>;
	async getEncodedReadable(resource: URI, value?: string | ITextSnapshot): Promise<VSBuffer | VSBufferReadable | undefined>;
	async getEncodedReadable(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<VSBuffer | VSBufferReadable>;
	async getEncodedReadable(resource: URI, value?: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<VSBuffer | VSBufferReadable | undefined> {

		// check for encoding
		const { encoding, addBOM } = await this.encoding.getWriteEncoding(resource, options);

		// when encoding is standard skip encoding step
		if (encoding === UTF8 && !addBOM) {
			return typeof value === 'undefined'
				? undefined
				: toBufferOrReadable(value);
		}

		// otherwise create encoded readable
		value = value || '';
		const snapshot = typeof value === 'string' ? stringToSnapshot(value) : value;
		return toEncodeReadable(snapshot, encoding, { addBOM });
	}

	async getDecodedStream(resource: URI, value: VSBufferReadableStream, options?: IReadTextFileEncodingOptions): Promise<ReadableStream<string>> {
		return (await this.doGetDecodedStream(resource, value, options)).stream;
	}

	private doGetDecodedStream(resource: URI, stream: VSBufferReadableStream, options?: IReadTextFileEncodingOptions): Promise<IDecodeStreamResult> {

		// read through encoding library
		return toDecodeStream(stream, {
			acceptTextOnly: options?.acceptTextOnly ?? false,
			guessEncoding: options?.autoGuessEncoding || this.textResourceConfigurationService.getValue(resource, 'files.autoGuessEncoding'),
			overwriteEncoding: async detectedEncoding => {
				const { encoding } = await this.encoding.getPreferredReadEncoding(resource, options, withNullAsUndefined(detectedEncoding));

				return encoding;
			}
		});
	}

	//#endregion


	//#region save

	async save(resource: URI, options?: ITextFileSaveOptions): Promise<URI | undefined> {

		// Untitled
		if (resource.scheme === Schemas.untitled) {
			const model = this.untitled.get(resource);
			if (model) {
				let targetUri: URI | undefined;

				// Untitled with associated file path don't need to prompt
				if (model.hasAssociatedFilePath) {
					targetUri = await this.suggestSavePath(resource);
				}

				// Otherwise ask user
				else {
					targetUri = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(resource), options?.availableFileSystems);
				}

				// Save as if target provided
				if (targetUri) {
					return this.saveAs(resource, targetUri, options);
				}
			}
		}

		// File
		else {
			const model = this.files.get(resource);
			if (model) {
				return await model.save(options) ? resource : undefined;
			}
		}

		return undefined;
	}

	async saveAs(source: URI, target?: URI, options?: ITextFileSaveAsOptions): Promise<URI | undefined> {

		// Get to target resource
		if (!target) {
			target = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(options?.suggestedTarget ?? source), options?.availableFileSystems);
		}

		if (!target) {
			return; // user canceled
		}

		// Just save if target is same as models own resource
		if (isEqual(source, target)) {
			return this.save(source, { ...options, force: true  /* force to save, even if not dirty (https://github.com/microsoft/vscode/issues/99619) */ });
		}

		// If the target is different but of same identity, we
		// move the source to the target, knowing that the
		// underlying file system cannot have both and then save.
		// However, this will only work if the source exists
		// and is not orphaned, so we need to check that too.
		if (this.fileService.hasProvider(source) && this.uriIdentityService.extUri.isEqual(source, target) && (await this.fileService.exists(source))) {
			await this.workingCopyFileService.move([{ file: { source, target } }], CancellationToken.None);

			// At this point we don't know whether we have a
			// model for the source or the target URI so we
			// simply try to save with both resources.
			const success = await this.save(source, options);
			if (!success) {
				await this.save(target, options);
			}

			return target;
		}

		// Do it
		return this.doSaveAs(source, target, options);
	}

	private async doSaveAs(source: URI, target: URI, options?: ITextFileSaveOptions): Promise<URI | undefined> {
		let success = false;

		// If the source is an existing text file model, we can directly
		// use that model to copy the contents to the target destination
		const textFileModel = this.files.get(source);
		if (textFileModel?.isResolved()) {
			success = await this.doSaveAsTextFile(textFileModel, source, target, options);
		}

		// Otherwise if the source can be handled by the file service
		// we can simply invoke the copy() function to save as
		else if (this.fileService.hasProvider(source)) {
			await this.fileService.copy(source, target, true);

			success = true;
		}

		// Finally we simply check if we can find a editor model that
		// would give us access to the contents.
		else {
			const textModel = this.modelService.getModel(source);
			if (textModel) {
				success = await this.doSaveAsTextFile(textModel, source, target, options);
			}
		}

		if (!success) {
			return undefined;
		}

		// Revert the source
		try {
			await this.revert(source);
		} catch (error) {

			// It is possible that reverting the source fails, for example
			// when a remote is disconnected and we cannot read it anymore.
			// However, this should not interrupt the "Save As" flow, so
			// we gracefully catch the error and just log it.

			this.logService.error(error);
		}

		return target;
	}

	private async doSaveAsTextFile(sourceModel: IResolvedTextEditorModel | ITextModel, source: URI, target: URI, options?: ITextFileSaveOptions): Promise<boolean> {

		// Find source encoding if any
		let sourceModelEncoding: string | undefined = undefined;
		const sourceModelWithEncodingSupport = (sourceModel as unknown as IEncodingSupport);
		if (typeof sourceModelWithEncodingSupport.getEncoding === 'function') {
			sourceModelEncoding = sourceModelWithEncodingSupport.getEncoding();
		}

		// Prefer an existing model if it is already resolved for the given target resource
		let targetExists: boolean = false;
		let targetModel = this.files.get(target);
		if (targetModel?.isResolved()) {
			targetExists = true;
		}

		// Otherwise create the target file empty if it does not exist already and resolve it from there
		else {
			targetExists = await this.fileService.exists(target);

			// create target file adhoc if it does not exist yet
			if (!targetExists) {
				await this.create([{ resource: target, value: '' }]);
			}

			try {
				targetModel = await this.files.resolve(target, { encoding: sourceModelEncoding });
			} catch (error) {
				// if the target already exists and was not created by us, it is possible
				// that we cannot resolve the target as text model if it is binary or too
				// large. in that case we have to delete the target file first and then
				// re-run the operation.
				if (targetExists) {
					if (
						(<TextFileOperationError>error).textFileOperationResult === TextFileOperationResult.FILE_IS_BINARY ||
						(<FileOperationError>error).fileOperationResult === FileOperationResult.FILE_TOO_LARGE
					) {
						await this.fileService.del(target);

						return this.doSaveAsTextFile(sourceModel, source, target, options);
					}
				}

				throw error;
			}
		}

		// Confirm to overwrite if we have an untitled file with associated file where
		// the file actually exists on disk and we are instructed to save to that file
		// path. This can happen if the file was created after the untitled file was opened.
		// See https://github.com/microsoft/vscode/issues/67946
		let write: boolean;
		if (sourceModel instanceof UntitledTextEditorModel && sourceModel.hasAssociatedFilePath && targetExists && this.uriIdentityService.extUri.isEqual(target, toLocalResource(sourceModel.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme))) {
			write = await this.confirmOverwrite(target);
		} else {
			write = true;
		}

		if (!write) {
			return false;
		}

		let sourceTextModel: ITextModel | undefined = undefined;
		if (sourceModel instanceof BaseTextEditorModel) {
			if (sourceModel.isResolved()) {
				sourceTextModel = sourceModel.textEditorModel;
			}
		} else {
			sourceTextModel = sourceModel as ITextModel;
		}

		let targetTextModel: ITextModel | undefined = undefined;
		if (targetModel.isResolved()) {
			targetTextModel = targetModel.textEditorModel;
		}

		// take over model value, encoding and language (only if more specific) from source model
		if (sourceTextModel && targetTextModel) {

			// encoding
			targetModel.updatePreferredEncoding(sourceModelEncoding);

			// content
			this.modelService.updateModel(targetTextModel, createTextBufferFactoryFromSnapshot(sourceTextModel.createSnapshot()));

			// language
			const sourceLanguageId = sourceTextModel.getLanguageId();
			const targetLanguageId = targetTextModel.getLanguageId();
			if (sourceLanguageId !== PLAINTEXT_LANGUAGE_ID && targetLanguageId === PLAINTEXT_LANGUAGE_ID) {
				targetTextModel.setLanguage(sourceLanguageId); // only use if more specific than plain/text
			}

			// transient properties
			const sourceTransientProperties = this.codeEditorService.getTransientModelProperties(sourceTextModel);
			if (sourceTransientProperties) {
				for (const [key, value] of sourceTransientProperties) {
					this.codeEditorService.setTransientModelProperty(targetTextModel, key, value);
				}
			}
		}

		// set source options depending on target exists or not
		if (!options?.source) {
			options = {
				...options,
				source: targetExists ? AbstractTextFileService.TEXTFILE_SAVE_REPLACE_SOURCE : AbstractTextFileService.TEXTFILE_SAVE_CREATE_SOURCE
			};
		}

		// save model
		return targetModel.save(options);
	}

	private async confirmOverwrite(resource: URI): Promise<boolean> {
		const { confirmed } = await this.dialogService.confirm({
			type: 'warning',
			message: localize('confirmOverwrite', "'{0}' already exists. Do you want to replace it?", basename(resource)),
			detail: localize('irreversible', "A file or folder with the name '{0}' already exists in the folder '{1}'. Replacing it will overwrite its current contents.", basename(resource), basename(dirname(resource))),
			primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
		});

		return confirmed;
	}

	private async suggestSavePath(resource: URI): Promise<URI> {

		// Just take the resource as is if the file service can handle it
		if (this.fileService.hasProvider(resource)) {
			return resource;
		}

		const remoteAuthority = this.environmentService.remoteAuthority;
		const defaultFilePath = await this.fileDialogService.defaultFilePath();

		// Otherwise try to suggest a path that can be saved
		let suggestedFilename: string | undefined = undefined;
		if (resource.scheme === Schemas.untitled) {
			const model = this.untitled.get(resource);
			if (model) {

				// Untitled with associated file path
				if (model.hasAssociatedFilePath) {
					return toLocalResource(resource, remoteAuthority, this.pathService.defaultUriScheme);
				}

				// Untitled without associated file path: use name
				// of untitled model if it is a valid path name and
				// figure out the file extension from the mode if any.

				let nameCandidate: string;
				if (await this.pathService.hasValidBasename(joinPath(defaultFilePath, model.name), model.name)) {
					nameCandidate = model.name;
				} else {
					nameCandidate = basename(resource);
				}

				const languageId = model.getLanguageId();
				if (languageId && languageId !== PLAINTEXT_LANGUAGE_ID) {
					suggestedFilename = this.suggestFilename(languageId, nameCandidate);
				} else {
					suggestedFilename = nameCandidate;
				}
			}
		}

		// Fallback to basename of resource
		if (!suggestedFilename) {
			suggestedFilename = basename(resource);
		}

		// Try to place where last active file was if any
		// Otherwise fallback to user home
		return joinPath(defaultFilePath, suggestedFilename);
	}

	suggestFilename(languageId: string, untitledName: string) {
		const languageName = this.languageService.getLanguageName(languageId);
		if (!languageName) {
			return untitledName; // unknown language, so we cannot suggest a better name
		}

		const untitledExtension = pathExtname(untitledName);

		const extensions = this.languageService.getExtensions(languageId);
		if (extensions.includes(untitledExtension)) {
			return untitledName; // preserve extension if it is compatible with the mode
		}

		const primaryExtension = firstOrDefault(extensions);
		if (primaryExtension) {
			if (untitledExtension) {
				return `${untitledName.substring(0, untitledName.indexOf(untitledExtension))}${primaryExtension}`;
			}

			return `${untitledName}${primaryExtension}`;
		}

		const filenames = this.languageService.getFilenames(languageId);
		if (filenames.includes(untitledName)) {
			return untitledName; // preserve name if it is compatible with the mode
		}

		return firstOrDefault(filenames) ?? untitledName;
	}

	//#endregion

	//#region revert

	async revert(resource: URI, options?: IRevertOptions): Promise<void> {

		// Untitled
		if (resource.scheme === Schemas.untitled) {
			const model = this.untitled.get(resource);
			if (model) {
				return model.revert(options);
			}
		}

		// File
		else {
			const model = this.files.get(resource);
			if (model && (model.isDirty() || options?.force)) {
				return model.revert(options);
			}
		}
	}

	//#endregion

	//#region dirty

	isDirty(resource: URI): boolean {
		const model = resource.scheme === Schemas.untitled ? this.untitled.get(resource) : this.files.get(resource);
		if (model) {
			return model.isDirty();
		}

		return false;
	}

	//#endregion
}

export interface IEncodingOverride {
	parent?: URI;
	extension?: string;
	encoding: string;
}

export class EncodingOracle extends Disposable implements IResourceEncodings {

	private _encodingOverrides: IEncodingOverride[];
	protected get encodingOverrides(): IEncodingOverride[] { return this._encodingOverrides; }
	protected set encodingOverrides(value: IEncodingOverride[]) { this._encodingOverrides = value; }

	constructor(
		@ITextResourceConfigurationService private textResourceConfigurationService: ITextResourceConfigurationService,
		@IWorkbenchEnvironmentService private environmentService: IWorkbenchEnvironmentService,
		@IWorkspaceContextService private contextService: IWorkspaceContextService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		super();

		this._encodingOverrides = this.getDefaultEncodingOverrides();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Workspace Folder Change
		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.encodingOverrides = this.getDefaultEncodingOverrides()));
	}

	private getDefaultEncodingOverrides(): IEncodingOverride[] {
		const defaultEncodingOverrides: IEncodingOverride[] = [];

		// Global settings
		defaultEncodingOverrides.push({ parent: this.environmentService.userRoamingDataHome, encoding: UTF8 });

		// Workspace files (via extension and via untitled workspaces location)
		defaultEncodingOverrides.push({ extension: WORKSPACE_EXTENSION, encoding: UTF8 });
		defaultEncodingOverrides.push({ parent: this.environmentService.untitledWorkspacesHome, encoding: UTF8 });

		// Folder Settings
		this.contextService.getWorkspace().folders.forEach(folder => {
			defaultEncodingOverrides.push({ parent: joinPath(folder.uri, '.vscode'), encoding: UTF8 });
		});

		return defaultEncodingOverrides;
	}

	async getWriteEncoding(resource: URI, options?: IWriteTextFileOptions): Promise<{ encoding: string; addBOM: boolean }> {
		const { encoding, hasBOM } = await this.getPreferredWriteEncoding(resource, options ? options.encoding : undefined);

		return { encoding, addBOM: hasBOM };
	}

	async getPreferredWriteEncoding(resource: URI, preferredEncoding?: string): Promise<IResourceEncoding> {
		const resourceEncoding = await this.getEncodingForResource(resource, preferredEncoding);

		return {
			encoding: resourceEncoding,
			hasBOM: resourceEncoding === UTF16be || resourceEncoding === UTF16le || resourceEncoding === UTF8_with_bom // enforce BOM for certain encodings
		};
	}

	async getPreferredReadEncoding(resource: URI, options?: IReadTextFileEncodingOptions, detectedEncoding?: string): Promise<IResourceEncoding> {
		let preferredEncoding: string | undefined;

		// Encoding passed in as option
		if (options?.encoding) {
			if (detectedEncoding === UTF8_with_bom && options.encoding === UTF8) {
				preferredEncoding = UTF8_with_bom; // indicate the file has BOM if we are to resolve with UTF 8
			} else {
				preferredEncoding = options.encoding; // give passed in encoding highest priority
			}
		}

		// Encoding detected
		else if (typeof detectedEncoding === 'string') {
			preferredEncoding = detectedEncoding;
		}

		// Encoding configured
		else if (this.textResourceConfigurationService.getValue(resource, 'files.encoding') === UTF8_with_bom) {
			preferredEncoding = UTF8; // if we did not detect UTF 8 BOM before, this can only be UTF 8 then
		}

		const encoding = await this.getEncodingForResource(resource, preferredEncoding);

		return {
			encoding,
			hasBOM: encoding === UTF16be || encoding === UTF16le || encoding === UTF8_with_bom // enforce BOM for certain encodings
		};
	}

	private async getEncodingForResource(resource: URI, preferredEncoding?: string): Promise<string> {
		let fileEncoding: string;

		const override = this.getEncodingOverride(resource);
		if (override) {
			fileEncoding = override; // encoding override always wins
		} else if (preferredEncoding) {
			fileEncoding = preferredEncoding; // preferred encoding comes second
		} else {
			fileEncoding = this.textResourceConfigurationService.getValue(resource, 'files.encoding'); // and last we check for settings
		}

		if (fileEncoding !== UTF8) {
			if (!fileEncoding || !(await encodingExists(fileEncoding))) {
				fileEncoding = UTF8; // the default is UTF-8
			}
		}

		return fileEncoding;
	}

	private getEncodingOverride(resource: URI): string | undefined {
		if (this.encodingOverrides?.length) {
			for (const override of this.encodingOverrides) {

				// check if the resource is child of encoding override path
				if (override.parent && this.uriIdentityService.extUri.isEqualOrParent(resource, override.parent)) {
					return override.encoding;
				}

				// check if the resource extension is equal to encoding override
				if (override.extension && extname(resource) === `.${override.extension}`) {
					return override.encoding;
				}
			}
		}

		return undefined;
	}
}
