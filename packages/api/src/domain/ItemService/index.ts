import type { Logger } from '@imapps/api-utils';

import type { Item, List, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import type { IdGenerator } from '../IdGenerator';
import type { ListRepository } from '../ListRepository';

export class ItemService {
	constructor(
		private readonly repo: ListRepository,
		private readonly idGenerator: IdGenerator,
		private readonly logger?: Logger
	) {}

	async addItem(
		title: string,
		itemName: string,
		dateAdded: Date,
		quantity?: number,
		unit?: string,
		dueDate?: Date
	) {
		try {
			const list = await this.repo.getByTitle(title);

			if (!list) {
				throw Object.assign(new Error('List not found'), { status: 404 });
			}

			if (list.listType === ListTypeEnum.TODO && (quantity !== undefined || unit !== undefined)) {
				throw Object.assign(new Error('TODO lists cannot have quantity or unit'), { status: 400 });
			}

			if (list.listType === ListTypeEnum.SHOPPING && dueDate !== undefined) {
				throw Object.assign(new Error('Shopping lists cannot have due dates'), { status: 400 });
			}

			const existingItem = list.items.find((item) => item.name.toLowerCase() === itemName.toLowerCase());

			if (existingItem) {
				throw Object.assign(new Error('An item with that name already exists in this list'), { status: 409 });
			}

			const item: Item = {
				id: this.idGenerator.generate(),
				name: itemName,
				dateAdded,
				isSelected: false,
				...(quantity !== undefined && { quantity }),
				...(unit !== undefined && { unit }),
				...(dueDate !== undefined && { dueDate }),
			};

			await this.repo.pushItem(title, item);
			this.logger?.info('Item added to list', {
				listTitle: title,
				itemName,
				itemId: item.id,
				quantity,
				unit,
			});

			return item;
		} catch (error) {
			this.logger?.error('Failed to add item to list', { listTitle: title, itemName, error });
			throw error;
		}
	}

	async deleteItem(title: string, itemName: string) {
		try {
			const list = await this.repo.getByTitle(title);

			if (!list) {
				throw Object.assign(new Error('List not found'), { status: 404 });
			}

			list.items = list.items.filter((item) => item.name !== itemName);
			await this.repo.replaceByTitle(title, list);

			this.logger?.info('Item deleted from list', {
				listTitle: title,
				itemName,
				remainingItemCount: list.items.length,
			});

			return list;
		} catch (error) {
			this.logger?.error('Failed to delete item', { listTitle: title, itemName, error });
			throw error;
		}
	}

	async updateItemName(title: string, itemName: string, newItemName: string) {
		try {
			if (!newItemName || newItemName.trim() === '') {
				throw Object.assign(new Error('New title cannot be empty'), {
					status: 400,
				});
			}

			if (newItemName.trim() === itemName) {
				throw Object.assign(new Error('New item name must be different from current name'), { status: 400 });
			}

			const list = await this.repo.getByTitle(title);

			if (!list) {
				throw Object.assign(new Error('List not found'), { status: 404 });
			}

			const existingItem = list.items.find((item) => item.name === newItemName.trim());

			if (existingItem) {
				throw Object.assign(new Error('An item with that name already exists in this list'), { status: 409 });
			}

			list.items = list.items.map((item) =>
				item.name === itemName ? { ...item, name: newItemName.trim() } : item
			);

			await this.repo.replaceByTitle(title, list);

			this.logger?.info('Item name updated', {
				listTitle: title,
				oldItemName: itemName,
				newItemName: newItemName.trim(),
			});

			return {
				message: 'Item updated successfully',
				newItemName: newItemName.trim(),
			};
		} catch (error) {
			this.logger?.error('Failed to update item name', {
				listTitle: title,
				oldItemName: itemName,
				newItemName,
				error,
			});
			throw error;
		}
	}

	async updateItemQuantity(title: string, itemName: string, quantity?: number, unit?: string) {
		try {
			const list = await this.repo.getByTitle(title);

			if (!list) {
				throw Object.assign(new Error('List not found'), { status: 404 });
			}

			list.items = list.items.map((item) =>
				item.name === itemName
					? {
							...item,
							...(quantity !== undefined && { quantity }),
							...(unit !== undefined && { unit }),
						}
					: item
			);

			await this.repo.replaceByTitle(title, list);

			this.logger?.info('Item quantity updated', {
				listTitle: title,
				itemName,
				quantity,
				unit,
			});

			return { message: 'Quantity updated successfully' };
		} catch (error) {
			this.logger?.error('Failed to update item quantity', {
				listTitle: title,
				itemName,
				quantity,
				unit,
				error,
			});
			throw error;
		}
	}

	async updateItemDueDate(title: string, itemName: string, dueDate?: Date) {
		try {
			const list = await this.repo.getByTitle(title);

			if (!list) {
				throw Object.assign(new Error('List not found'), { status: 404 });
			}

			if (list.listType !== ListTypeEnum.TODO) {
				throw Object.assign(new Error('Due dates only available for TODO lists'), { status: 400 });
			}

			list.items = list.items.map((item) => (item.name === itemName ? { ...item, dueDate } : item));

			await this.repo.replaceByTitle(title, list);

			this.logger?.info('Item due date updated', {
				listTitle: title,
				itemName,
				dueDate,
			});

			return { message: 'Due date updated successfully' };
		} catch (error) {
			this.logger?.error('Failed to update item due date', {
				listTitle: title,
				itemName,
				dueDate,
				error,
			});
			throw error;
		}
	}

	async setItemSelected(title: string, itemName: string, isSelected: boolean) {
		try {
			const list = await this.repo.getByTitle(title);

			if (!list) {
				throw Object.assign(new Error('List not found'), { status: 404 });
			}

			list.items = list.items.map((item) => (item.name === itemName ? { ...item, isSelected } : item));

			await this.repo.replaceByTitle(title, list);

			this.logger?.info('Item selection updated', {
				listTitle: title,
				itemName,
				isSelected,
			});

			return { message: 'Updated Successfully' };
		} catch (error) {
			this.logger?.error('Failed to update item selection', {
				listTitle: title,
				itemName,
				isSelected,
				error,
			});
			throw error;
		}
	}

	async clearSelectedItems(title: string) {
		try {
			const list = await this.repo.getByTitle(title);

			if (!list) {
				throw Object.assign(new Error('List not found'), { status: 404 });
			}

			const selectedCount = list.items.filter((item) => item.isSelected).length;
			list.items = list.items.filter((item) => !item.isSelected);
			await this.repo.replaceByTitle(title, list);

			this.logger?.info('Selected items cleared from list', {
				listTitle: title,
				clearedItemCount: selectedCount,
				remainingItemCount: list.items.length,
			});

			return list;
		} catch (error) {
			this.logger?.error('Failed to clear selected items', { listTitle: title, error });
			throw error;
		}
	}
}
