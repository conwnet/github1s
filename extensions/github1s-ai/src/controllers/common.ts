import type { ViewEvent, ViewMessage } from '@/common/protocol';
import type { Stores } from '@/stores';

type HandlerResult = ViewMessage | void;
type RegisteredEventHandler = readonly [ViewEvent['type'], (event: never) => HandlerResult | Promise<HandlerResult>];

export abstract class Controller {
	private readonly handlers: RegisteredEventHandler[] = [];

	constructor(protected readonly stores: Stores) {}

	eventHandlers(): readonly RegisteredEventHandler[] {
		return this.handlers;
	}

	static handler<K extends ViewEvent['type']>(eventType: K) {
		return <This extends Controller>(
			method: (this: This, event: ViewEvent<K>) => HandlerResult | Promise<HandlerResult>,
			context: ClassMethodDecoratorContext<
				This,
				(this: This, event: ViewEvent<K>) => HandlerResult | Promise<HandlerResult>
			>,
		): void => {
			context.addInitializer(function (this: This) {
				this.handlers.push([eventType, (event) => method.call(this, event)]);
			});
		};
	}
}
