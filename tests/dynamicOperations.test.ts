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

import { DisposeOp, popEnv, pushEnv } from '../src/Environment';

import { dynamic, listen, valType } from '../src';

let disposeQueue: DisposeOp[] = [];
const cleanup = () => {
    disposeQueue.forEach((v) => v());
    disposeQueue = [];
};

beforeEach(() => {
    pushEnv({
        _onDispose: (op: DisposeOp) => disposeQueue.push(op),
        _getProbingContext: () => ({ componentName: '' }),
    });
});

afterEach(() => {
    cleanup();
    popEnv();
});

describe('listen', () => {
    it('Works on regular values', () => {
        let y = 0;
        const cb = (v: number) => (y += v);
        const v = 12;
        listen(v, cb);
        expect(y).toBe(0);
    });

    it('Works on dynamic values', () => {
        let y = 0;
        const cb = (v: number) => (y += v);
        const v = dynamic(12);
        listen(v, cb);
        expect(y).toBe(0);

        v.current = 13;
        expect(y).toBe(13);

        v.current = 12;
        expect(y).toBe(25);
    });
});

describe('valType', () => {
    it('Works on regular values', () => {
        const v = 0;
        expect(valType(v)).toBe('number');
    });

    it('Works on dynamic values', () => {
        const v = dynamic(0);
        expect(valType(v)).toBe('number');
    });
});
