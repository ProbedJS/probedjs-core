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

import { isPNode } from '../src/Node';
import { probe, createProber, PNode, useOnDispose } from '../src';

describe('Basic prober', () => {
  it('Works with function without arguments', () => {
    const result = probe(() => 2);

    expect(isPNode(result)).toBe(true);
    expect(result.result).toBe(2);
  });

  it('Works with function with single argument', () => {
    const result = probe((v: number) => v + 1, 1);

    expect(isPNode(result)).toBe(true);
    expect(result.result).toBe(2);
  });

  it('Works with function with multiple arguments', () => {
    const result = probe((v1: number, v2: number) => v1 + v2, 1, 2);

    expect(isPNode(result)).toBe(true);
    expect(result.result).toBe(3);
  });

  it('Fails when using invalid CB', () => {
    expect(() => {
      //@ts-expect-error
      probe(null);
    }).toThrow();

    expect(() => {
      //@ts-ignore
      probe(undefined);
    }).toThrow();

    expect(() => {
      //@ts-expect-error
      probe(12);
    }).toThrow();

    expect(() => {
      //@ts-expect-error
      probe(true);
    }).toThrow();

    expect(() => {
      //@ts-expect-error
      probe([]);
    }).toThrow();

    expect(() => {
      //@ts-expect-error
      probe({});
    }).toThrow();
  });

  it('Fails when using an intrinsic', () => {
    expect(() => {
      //@ts-expect-error
      probe('yo', {});
    }).toThrow();

    expect(() => {
      //@ts-expect-error
      probe('', {});
    }).toThrow();
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

    expect(isPNode(resultA)).toBe(true);
    expect(isPNode(resultB)).toBe(true);

    expect(resultA.result).toBe(2);
    expect(resultB.result).toBe(5);
  });

  it('Fails when using wrong intrinsic', () => {
    expect(() => {
      //@ts-expect-error
      sutProbe('aab', {});
    }).toThrow();

    expect(() => {
      //@ts-expect-error
      sutProbe('', {});
    }).toThrow();
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
