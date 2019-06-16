// import {noop, trimStart} from '../utils';
import {join, noop, uniqueId} from '../utils';
import {URI} from 'vs/base/common/uri';
import {Event} from 'vs/base/common/event';
import {
	FileSystemProviderCapabilities,
	IFileSystemProvider,
	IFileChange,
	IStat,
	FileType
} from 'vs/platform/files/common/files';

class GithubFileSystemProvider implements IFileSystemProvider {
	private fileRoot: any = {
		name: '',
		path: '/',
		children: [],
		type: FileType.Directory,
	};
	private fileSet: Set<string> = new Set();
	private fileMap: Map<number, any> = new Map();

	// constructor(private options)

	private get repo(){
		const matches = location.pathname.match(/^\/([^/]+\/[^/]+)/);

		if (matches) {
			return matches[1];
		}

		// location.href = 'https://github.com/conwnet/github1s';
		return 'conwnet/github1s';
	};

	capabilities: FileSystemProviderCapabilities
		= FileSystemProviderCapabilities.FileOpenReadWriteClose | FileSystemProviderCapabilities.Readonly;

	onDidChangeCapabilities: Event<void> = Event.None;

	onDidErrorOccur?: Event<Error> | undefined;
	onDidChangeFile: Event<IFileChange[]> = Event.None;

	resolveFile(path: string) {
		const segments = path.split('/').filter(Boolean);

		return segments.reduce((dir, current) => {
			if (dir.type !== FileType.Directory) {
				throw new Error(`${dir.path} is not a directory`);
			}

			const result = dir.children.find((file: any) => file.name === current);

			if (!result) {
				throw new Error(`${dir.path}/${current} is not exists`);
			}
			return result;
		}, this.fileRoot);
	}

	watch = <any>noop;
	mkdir = <any>noop;
	delete = <any>noop;
	rename = <any>noop;
	close = <any>noop;

	async open(resource: URI, opts: any): Promise<number> {
		const file = this.resolveFile(resource.path);

		return file ? file.id : 0;
	}

	async read(fd: number, pos: number, data: Uint8Array, offset: number, length: number): Promise<any> {
		const encoder = new TextEncoder();
		const file = this.fileMap.get(fd);

		return fetch(`https://api.github.com/repos/${this.repo}/git/blobs/${file.sha}`)
			.then(response => response.json())
			.then(blob => {
				const u8a = encoder.encode(atob(blob.content)).slice(offset);

				if (u8a.length > length) {
					data.set(u8a.slice(0, length), pos);

					return length;
				}

				data.set(u8a, pos);
				return u8a.length;
			});
	}

	async stat(resource: URI): Promise<IStat> {
		const now = Date.now();
		const file = this.resolveFile(resource.path);

		if (file) {
			return {
				type: file.type,
				mtime: now,
				ctime: now,
				size: 0,
			}
		}

		throw new Error(`${resource.path} is not exists`);
	}

	readdir(resource: URI): Promise<[string, FileType][]> {
		const parent = this.resolveFile(resource.path);

		return fetch(`https://api.github.com/repos/${this.repo}/git/trees/master${resource.path.replace(/^\//, ':')}`)
			.then(response => response.json())
			.then((data: any) => {
				return data.tree.map((item: any) => {
					const type = item.type === 'tree' ? FileType.Directory : FileType.File;

					if (!this.fileSet.has(item.sha)) {
						const id = uniqueId();
						const file = {
							id,
							type,
							name: item.path,
							path: join(resource.path, item.path),
							sha: item.sha,
							...(type === FileType.Directory ? {children: []} : {}),
						};

						this.fileSet.add(item.sha);
						this.fileMap.set(id, file);
						parent.children.push(file);
					}
					return [item.path, type];
				});
			});
	}

}

export default GithubFileSystemProvider;
