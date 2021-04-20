/**
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

import { DisposeOp, pop as popContext, push as pushContext } from '../src/Environment';

import { dynamic, isDynamic } from '../src';

let disposeQueue: DisposeOp[] = [];
const cleanup = () => {
    disposeQueue.forEach((v) => v());
    disposeQueue = [];
};

beforeEach(() => {
    pushContext({
        _onDispose: (op: DisposeOp) => disposeQueue.push(op),
    });
});

afterEach(() => {
    cleanup();
    popContext();
});

describe('Static array', () => {
    it('is not seen as dynamic', () => {
        expect(isDynamic([])).toBeFalsy();
        expect(isDynamic([12])).toBeFalsy();
    });
});

describe('Dynamic Array', () => {
    it('Initialized correctly', () => {
        const x = dynamic([1, 2]);
        expect(x.current).toEqual([1, 2]);
    });

    it('Can Be Mapped', () => {
        const x = dynamic([1, 2, 3]);
        const y = x.map((x: number): number => x * x);

        expect(y.current).toEqual([1, 4, 9]);

        x.push(4);
        expect(y.current).toEqual([1, 4, 9, 16]);

        x.current = [2, 2, 2];
        expect(y.current).toEqual([4, 4, 4]);
    });
});
