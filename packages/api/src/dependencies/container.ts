import { DependencyContainer } from '@imapps/api-utils';

import type { Dependencies } from './types';

export const dependencyContainer = DependencyContainer.getInstance<Dependencies>();
