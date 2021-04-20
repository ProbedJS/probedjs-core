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

import { dispose, isPNode } from '../src/Node';
import { createProber, PNode, finalize, useOnDispose } from '../src';

describe('Basic prober', () => {
  const probe = createProber({});

  it('Works with function without arguments', () => {
    const result = probe(() => 2);

    expect(isPNode(result)).toBe(true);
    expect(finalize(result)).toBe(2);
  });

  it('Works with function with single argument', () => {
    const result = probe((v: number) => v + 1, 1);

    expect(isPNode(result)).toBe(true);
    expect(finalize(result)).toBe(2);
  });

  it('Works with function with multiple arguments', () => {
    const result = probe((v1: number, v2: number) => v1 + v2, 1, 2);

    expect(isPNode(result)).toBe(true);
    expect(finalize(result)).toBe(3);
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
  const probe = createProber({
    aaa: (v: number) => v + 1,
    bbb: (v: number) => v + 4,
  });

  it('Produces a payload', () => {
    const resultA = probe('aaa', 1);
    const resultB = probe('bbb', 1);

    expect(isPNode(resultA)).toBe(true);
    expect(isPNode(resultB)).toBe(true);

    expect(finalize(resultA)).toBe(2);
    expect(finalize(resultB)).toBe(5);
  });

  it('Fails when using wrong intrinsic', () => {
    expect(() => {
      //@ts-expect-error
      probe('aab', {});
    }).toThrow();

    expect(() => {
      //@ts-expect-error
      probe('', {});
    }).toThrow();
  });
});

describe('Component With dispose', () => {
  const probe = createProber({});

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
    finalize(node);
    expect(obj.v).toBe(1);

    dispose(node);

    expect(obj.v).toBe(0);
  });
});

describe('Hierarchical components', () => {
  const probe = createProber({});

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
    expect(finalize(probe(Root))).toBe(9);
  });
});
