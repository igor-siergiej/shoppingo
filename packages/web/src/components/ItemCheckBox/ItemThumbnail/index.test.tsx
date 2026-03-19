import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Item } from '@shoppingo/types';
import { ListType } from '@shoppingo/types';
import { ItemThumbnail } from './index';

describe('ItemThumbnail', () => {
	const mockItem: Item = {
		id: '1',
		name: 'Test Item',
		quantity: '1',
		unit: 'piece',
		isSelected: false,
	};

	const createMockCallbacks = () => ({
		onImageLoad: () => {},
		onImageError: () => {},
	});

	describe('TODO list type', () => {
		it('renders checkbox for TODO list', () => {
			const callbacks = createMockCallbacks();
			const { container } = render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.TODO}
					hasLoadedImage={false}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const checkbox = container.querySelector('div[class*="rounded border-2"]');
			expect(checkbox).toBeInTheDocument();
		});

		it('shows checkmark when item is selected', () => {
			const callbacks = createMockCallbacks();
			const selectedItem: Item = { ...mockItem, isSelected: true };
			const { container } = render(
				<ItemThumbnail
					item={selectedItem}
					listType={ListType.TODO}
					hasLoadedImage={false}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const checkmark = container.querySelector('svg');
			expect(checkmark).toBeInTheDocument();
		});

		it('does not show checkmark when item is not selected', () => {
			const callbacks = createMockCallbacks();
			const { container } = render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.TODO}
					hasLoadedImage={false}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const checkmark = container.querySelector('svg[class*="text-white"]');
			expect(checkmark).not.toBeInTheDocument();
		});

		it('applies selected styling when isSelected is true', () => {
			const callbacks = createMockCallbacks();
			const selectedItem: Item = { ...mockItem, isSelected: true };
			const { container } = render(
				<ItemThumbnail
					item={selectedItem}
					listType={ListType.TODO}
					hasLoadedImage={false}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const checkbox = container.querySelector('div[class*="bg-primary"]');
			expect(checkbox).toBeInTheDocument();
		});

		it('shows loader when toggling', () => {
			const callbacks = createMockCallbacks();
			const { container } = render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.TODO}
					hasLoadedImage={false}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={true}
				/>
			);

			const loader = container.querySelector('svg[class*="animate-spin"]');
			expect(loader).toBeInTheDocument();
		});
	});

	describe('SHOPPING list type', () => {
		it('renders image when imageBlobUrl is provided', () => {
			const callbacks = createMockCallbacks();
			render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.SHOPPING}
					imageBlobUrl="blob:http://example.com/123"
					hasLoadedImage={true}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const img = screen.getByAltText('Test Item');
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute('src', 'blob:http://example.com/123');
		});

		it('shows skeleton when image is loading', () => {
			const callbacks = createMockCallbacks();
			const { container } = render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.SHOPPING}
					imageBlobUrl="blob:http://example.com/123"
					hasLoadedImage={false}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const skeleton = container.querySelector('[data-slot="skeleton"]');
			expect(skeleton).toBeInTheDocument();
		});

		it('shows image error icon when image fails', () => {
			const callbacks = createMockCallbacks();
			const { container } = render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.SHOPPING}
					imageBlobUrl="blob:http://example.com/123"
					hasLoadedImage={false}
					hasImageError={true}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const errorContainer = container.querySelector('div[class*="rounded-full"]');
			expect(errorContainer).toBeInTheDocument();
			const errorIcon = errorContainer?.querySelector('svg');
			expect(errorIcon).toBeInTheDocument();
		});

		it('hides image when not loaded', () => {
			const callbacks = createMockCallbacks();
			render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.SHOPPING}
					imageBlobUrl="blob:http://example.com/123"
					hasLoadedImage={false}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const img = screen.getByAltText('Test Item');
			expect(img).toHaveClass('opacity-0');
		});

		it('shows image when loaded successfully', () => {
			const callbacks = createMockCallbacks();
			render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.SHOPPING}
					imageBlobUrl="blob:http://example.com/123"
					hasLoadedImage={true}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const img = screen.getByAltText('Test Item');
			expect(img).toHaveClass('opacity-100');
		});

		it('shows loader overlay when toggling', () => {
			const callbacks = createMockCallbacks();
			const { container } = render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.SHOPPING}
					imageBlobUrl="blob:http://example.com/123"
					hasLoadedImage={true}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={true}
				/>
			);

			const loader = container.querySelector('svg[class*="animate-spin"]');
			expect(loader).toBeInTheDocument();
		});

		it('renders circular image with proper dimensions', () => {
			const callbacks = createMockCallbacks();
			render(
				<ItemThumbnail
					item={mockItem}
					listType={ListType.SHOPPING}
					imageBlobUrl="blob:http://example.com/123"
					hasLoadedImage={true}
					hasImageError={false}
					onImageLoad={callbacks.onImageLoad}
					onImageError={callbacks.onImageError}
					isToggling={false}
				/>
			);

			const img = screen.getByAltText('Test Item');
			expect(img).toHaveClass('h-12', 'w-12', 'rounded-full');
		});
	});
});
