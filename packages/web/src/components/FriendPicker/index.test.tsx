import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FriendPicker } from './index';

const { mockUseFriends } = vi.hoisted(() => ({
    mockUseFriends: vi.fn(),
}));

vi.mock('../../hooks/useFriends', () => ({
    useFriends: mockUseFriends,
}));

const friends = [
    { id: 'f1', username: 'alice' },
    { id: 'f2', username: 'bob' },
];

describe('FriendPicker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseFriends.mockReturnValue({ friends, isLoading: false });
    });

    it('renders a row per friend', () => {
        render(<FriendPicker value={[]} onChange={vi.fn()} />);

        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('calls onChange with the updated id array when toggling a friend', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<FriendPicker value={['f2']} onChange={onChange} />);

        const switches = screen.getAllByRole('switch');
        await user.click(switches[0]);

        expect(onChange).toHaveBeenCalledWith(['f2', 'f1']);
    });

    it('seeds all friend ids via onChange when seedAllByDefault is set and value is empty', () => {
        const onChange = vi.fn();

        render(<FriendPicker value={[]} onChange={onChange} seedAllByDefault />);

        expect(onChange).toHaveBeenCalledWith(['f1', 'f2']);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('does not seed when value is already non-empty', () => {
        const onChange = vi.fn();

        render(<FriendPicker value={['f1']} onChange={onChange} seedAllByDefault />);

        expect(onChange).not.toHaveBeenCalled();
    });

    it('shows an empty-state message when there are no friends', () => {
        mockUseFriends.mockReturnValue({ friends: [], isLoading: false });

        render(<FriendPicker value={[]} onChange={vi.fn()} />);

        expect(screen.getByText(/no friends/i)).toBeInTheDocument();
    });
});
