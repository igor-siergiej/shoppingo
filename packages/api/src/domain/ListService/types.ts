import { User } from '@shoppingo/types';

export interface AuthClient {
    getUsersByUsernames(usernames: Array<string>): Promise<Array<User>>;
}
