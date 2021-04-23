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

import { probe, createProber, PNode, useOnDispose, ProbingContext, Component, useProbingContext } from '../src';
import { expectThrowInCheck, expectThrowInNotProd } from './utils';

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

    // These cannot be made into runtime tests, because there's
    // No way to determine at runtime if a function expects a context
    // or not.
    it('Fails when not passing enough arguments', () => {
        //@ts-expect-error
        () => probe((v1: number, v2: number) => v1 + v2, 12);
    });

    it('Fails when passing too many arguments', () => {
        //@ts-expect-error
        () => expectThrowInNotProd(() => probe((v1: number) => v1, 12, 13));

        //@ts-expect-error
        () => expectThrowInNotProd(() => probe((v1: number, _ctx: ProbingContext) => v1, 12, 13));
    });
});

describe('Prober with intrinsics', () => {
    const mapping = {
        aaa: (v: number) => {
            expect(useProbingContext().componentName).toBe('aaa');
            return v + 1;
        },
        bbb: (v: number) => v + 4,
    };

    const sutProbe = createProber(mapping);

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

    it('Still handles functional', () => {
        const result = sutProbe((v: number) => v + 1, 1);
        expect(result.result).toBe(2);
    });

    it('works with higher-order components', () => {
        const HOC = (c: Component<[number], unknown>) => sutProbe(c, 12);

        expect(sutProbe(HOC, mapping.aaa).result).toBe(13);
        expect(sutProbe(HOC, mapping.bbb).result).toBe(16);
    });
});

describe('Dynamic intrinsic lookup', () => {
    it('works', () => {
        interface Base {
            x: string;
        }

        interface Specialized extends Base {
            y: number;
        }

        interface TypeInfo {
            aaa: (v: number) => Base;
            bbb: (v: string) => Specialized;
        }

        const componentImpl = (_: number | string): Base | Specialized => {
            return { x: useProbingContext().componentName };
        };

        const sutProbe = createProber<TypeInfo>({}, componentImpl);

        expect(sutProbe('aaa', 0).result.x).toBe('aaa');
        expect(sutProbe('bbb', 'allo').result.x).toBe('bbb');
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

describe('Weird cases', () => {
    it('catches out of context finalization', () => {
        const prober = createProber({});

        //This actually takes a surprising effort to pull off...
        interface TMP {
            x?: PNode<number>;
        }
        const tmp: TMP = {};

        const a = prober((v: TMP) => v.x!.result, tmp);
        tmp.x = prober(() => 12);

        expectThrowInCheck(() => {
            return a.result;
        });
    });

    it('Wildly out of order valid evaluation', () => {
        //This actually takes a surprising effort to pull off...

        const Comp = (x: number) => x + x;
        const data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const nodes = data.map((v) => probe(Comp, v));

        expect(nodes[5].result).toBe(10);
        expect(nodes[2].result).toBe(4);
        expect(nodes[9].result).toBe(18);
        expect(nodes[0].result).toBe(0);
    });
});
