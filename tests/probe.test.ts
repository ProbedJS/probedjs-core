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

import { probe, createProber, PNode, useOnDispose, Component } from '../src';
import { expectThrowInNotProd } from './utils';

describe('Basic prober', () => {
    it('Works with function without arguments', () => {
        const result = probe(() => 2);

        expect(result.result).toBe(2);
    });

    it('Works with function with single argument', () => {
        const result = probe((v: number) => v + 1, 1);

        expect(result.result).toBe(2);
    });

    it('Works with function with multiple arguments', () => {
        const result = probe((v1: number, v2: number) => v1 + v2, 1, 2);

        expect(result.result).toBe(3);
    });

    it('Fails when using invalid CB', () => {
        //@ts-expect-error
        expectThrowInNotProd(() => probe(null));

        //@ts-expect-error
        expectThrowInNotProd(() => probe(undefined));

        //@ts-expect-error
        expectThrowInNotProd(() => probe(12));

        //@ts-expect-error
        expectThrowInNotProd(() => probe(true));

        //@ts-expect-error
        expectThrowInNotProd(() => probe([]));

        //@ts-expect-error
        expectThrowInNotProd(() => probe({}));
    });

    it('Fails when using an intrinsic', () => {
        //@ts-expect-error
        expectThrowInNotProd(() => probe('yo', {}));

        //@ts-expect-error
        expectThrowInNotProd(() => probe('', {}));
    });
});

describe('Prober with intrinsics', () => {
    const sutProbe = createProber({
        aaa: (v: number) => v + 1,
        bbb: (v: number) => v + 4,
    });

    it('Produces a payload', () => {
        const resultA = sutProbe('aaa', 1);
        const resultB = sutProbe('bbb', 1);

        expect(resultA.result).toBe(2);
        expect(resultB.result).toBe(5);
    });

    it('Fails when using wrong intrinsic', () => {
        //@ts-expect-error
        expectThrowInNotProd(() => sutProbe('xyz', {}));

        //@ts-expect-error
        expectThrowInNotProd(() => sutProbe('aa', {}));

        //@ts-expect-error
        expectThrowInNotProd(() => sutProbe('aaaa', {}));

        //@ts-expect-error
        expectThrowInNotProd(() => sutProbe('', {}));
    });
});

describe('Component With dispose', () => {
    interface ctx {
        v: number;
    }
    const component = (x: ctx) => {
        x.v += 1;

        useOnDispose(() => {
            x.v -= 1;
        });
    };

    it('disposes when requested', () => {
        const obj: ctx = { v: 0 };
        const node = probe(component, obj);
        node.finalize();
        expect(obj.v).toBe(1);

        node.dispose();

        expect(obj.v).toBe(0);
    });
});

describe('Component with no dispose', () => {
    const component = (x: number) => x * x;

    it('Disposing is harmless', () => {
        const node = probe(component, 2);
        expect(node.result).toBe(4);

        node.dispose();
    });
});

describe('Hierarchical components', () => {
    const Leaf = () => {
        return 3;
    };

    const Node = (v: { children: PNode<number>[] }) => {
        let total = 0;
        v.children.forEach((x) => (total += x.result));
        return total;
    };

    const Root = () => {
        return probe(Node, { children: [probe(Leaf), probe(Leaf), probe(Leaf)] });
    };

    it('Visited all children', () => {
        expect(probe(Root).result).toBe(9);
    });
});

describe('Proxy components', () => {
    let disposed = 0;

    const Sub = (v: number) => {
        useOnDispose(() => (disposed += 2));
        return v * v;
    };

    const Parent = (v: number) => {
        useOnDispose(() => (disposed += 3));
        return probe(Sub, v);
    };

    const node = probe(Parent, 4);
    const result = node.result;

    node.dispose();

    it('Produced the correct value', () => {
        expect(result).toBe(16);
    });

    it('Disposed correctly', () => {
        expect(disposed).toBe(5);
    });
});

describe('Pre-finalized components', () => {
    let disposed = 0;

    const Sub = (v: number) => {
        useOnDispose(() => (disposed += 2));
        return v * v;
    };

    const HarmlessSub = (v: number) => {
        return v * v;
    };

    const Parent = <T>(v: number, c: Component<[number], T>) => {
        useOnDispose(() => (disposed += 3));
        const subNode = probe(c, v);
        subNode.finalize();

        return subNode;
    };

    const node = probe(Parent, 4, Sub);
    const harmlessNode = probe(Parent, 5, HarmlessSub);

    const result = node.result;
    const harmlessResult = harmlessNode.result;

    node.dispose();
    harmlessNode.dispose();

    it('Produced the correct value', () => {
        expect(result).toBe(16);
        expect(harmlessResult).toBe(25);
    });

    it('Disposed correctly', () => {
        expect(disposed).toBe(8);
    });
});
