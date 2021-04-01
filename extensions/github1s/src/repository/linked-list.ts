/**
 * @file a bidirectional linked list
 */

class ListNode {
	id: string;
	prev: ListNode;
	next: ListNode;

	constructor(id: string) {
		this.id = id;
		this.prev = null;
		this.next = null;
	}
}

const linkNodes = (prevNode: ListNode, currentNode: ListNode) => {
	if (prevNode && currentNode) {
		prevNode.next = currentNode;
		currentNode.prev = prevNode;
	}
};

export enum LinkedListDirection {
	PREVIOUS = -1,
	CURRENT = 0,
	NEXT = 1,
}

export class LinkedList {
	private _nodeMap: Map<string, ListNode>;

	constructor() {
		this._nodeMap = new Map();
	}

	private createNode(id: string) {
		const node = new ListNode(id);
		this._nodeMap.set(node.id, node);
		return node;
	}

	private getNode(id: string) {
		return this._nodeMap.get(id);
	}

	public update(idList: string[]) {
		for (let i = 0, len = idList.length; i < len; i++) {
			const currentNode = this.getNode(idList[i]) || this.createNode(idList[i]);
			i > 0 && linkNodes(this.getNode(idList[i - 1]), currentNode);
		}
	}

	public getNodeId(id: string, direction: LinkedListDirection) {
		if (direction === LinkedListDirection.PREVIOUS) {
			return this.getNode(id)?.prev?.id;
		}

		if (direction === LinkedListDirection.CURRENT) {
			return this.getNode(id)?.id;
		}

		if (direction === LinkedListDirection.NEXT) {
			return this.getNode(id)?.next?.id;
		}
	}
}
