/*
 * Copyright 2021 Francois Chabot
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ProbingContext } from './ApiTypes';

export type DisposeOp = () => void;
export interface Environment {
    _onDispose: (op: DisposeOp) => void;
    _getProbingContext: () => ProbingContext;
}

let _currentEnv: Environment | null = null;
const _envStack: (Environment | null)[] = [];

export const pushEnv = (ctx: Environment): void => {
    _envStack.push(_currentEnv);
    _currentEnv = ctx;
};

export const popEnv = (): void => {
    if (process.env.NODE_ENV !== 'production' && _envStack.length === 0) {
        throw new Error('Environment underflow');
    }
    _currentEnv = _envStack.pop()!;
};

export const useOnDispose = (op: DisposeOp): void => {
    if (process.env.NODE_ENV !== 'production' && !_currentEnv) {
        throw new Error('Environment underflow');
    }

    _currentEnv!._onDispose(op);
};

export function useProbingContext(): ProbingContext {
    if (process.env.NODE_ENV !== 'production' && !_currentEnv) {
        throw new Error('Environment underflow');
    }

    return _currentEnv!._getProbingContext();
}
