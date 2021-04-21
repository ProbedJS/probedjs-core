# @probed/core

A single-pass JSX-friendly dynamic tree backend. Aka, React without rerenders.

[![npm](https://img.shields.io/npm/v/@probed/core.svg)](http://npm.im/@probed/core)
[![gzip size](http://img.badgesize.io/https://unpkg.com/@probed/core?compression=gzip&label=gzip)](https://unpkg.com/@probed/core)
[![brotli size](http://img.badgesize.io/https://unpkg.com/@probed/core?compression=brotli&label=brotli)](https://unpkg.com/@probed/core)

[![CI](https://github.com/ProbedJS/probedjs-core/actions/workflows/ci.yml/badge.svg)](https://github.com/ProbedJS/probedjs-core/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/ProbedJS/probedjs-core/badge.svg?branch=main)](https://coveralls.io/github/ProbedJS/probedjs-core?branch=main)

## Installation

```
npm i -D @probed/core
```

## Getting started

The **probed** core is intentionally fairly bare-bones, and this readme speaks only about the general principles at play. If you just want to dive in directly into writing DOM components using JSX, then head over [here](http://example.com).

### Writing components - Basics

Any function can be used as a component. Simple as that. 

Calling `probe()`on a component with a set of arguments will return a Node. Acessing a node's result will evaluate the component if it hasn't been yet.

**N.B.** While not strictly required, starting every component with an uppercase is a good practice for JSX compatibility.

```javascript
import {probe} from "@probe/core"

const Add = (x, y) => {
    return x + y;
}

const node = probe(Add, 1, 2);
console.log(node.result);
```

### Dynamic values

Component callbacks are evaluated **only once** at creation time. Dynamic behavior is accomplished through the use of *Dynamic Values*.

Creating a `Dynamic` is just a matter of calling `dynamic(init)`, and updating them is done by calling `set()`.

```javascript
const x = dynamic(12);
x.addListener((v)=>console.log(`x is now ${v}`));
x.set(13);
```

Reading from *potentially* dynamic values is done through `valueOf()` and `transform()`.

```javascript
import {dynamic, probe, transform} from "@probe/core"

const Add = (x, y) => {
    console.log(`Values at the time Add was called: ${x.valueOf()}, ${y.valueOf()} )`);
    
    const result = transform(x, y, (vx, vy)=>{
        console.log("recomputing Add result");
        vx+vy
    });
    return result;
}

const staticNode = probe(Add, 1, 2);
console.log(staticNode.result);

const dynamicVal = dynamic(1);
const dynamicNode = probe(Add, dynamicVal, 2);
console.log(dynamicNode.result);

dynamicVal = 3;
console.log(dynamicNode.result);
```

TypeScript users have the luxury of forcing parameters to be static:

```typescript
import {dynamic, Reader} from "@probe/core"

const add = (x: number, y: Reader<number>) => {
    console.log(`Values at the time add node was called: ${x}, ${ y.valueOf()} )`);
    
    const result = dependant(y, (vy)=>x+vy);
    return result;
}
```

## JSX - intrinsics

You can create a custom `probe()` function bound against a set of intrinsics using `createProber()`
While not strictly necessarry, we highly recommend that you use TypeScript for defining intrinsics mapping, 
it will ensure full IDE assistance.

```typescript
import {createProber} from "@probe/core"

const intrinsics = {
    "add" : (x:number, y:number):number => x+y,
    "mul" : (x:number, y:number):number => x*y,
}

const probe = createProber(intrinsics);

// You can probe by the keys of the map
probe("add", 1, 2);

// You can still probe by function
probe((x)=>x+4, 4);
```

N.B. JSX compatibility has a few other steps that are beyond the scope of this specific package. See [@probe/html](http://example.com) for an example of a fully realized JSX binding.
