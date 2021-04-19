# @probed/core

Core functionality for the probed system

[![CI](https://github.com/ProbedJS/probejs-core/actions/workflows/ci.yml/badge.svg)](https://github.com/ProbedJS/probejs-core/actions/workflows/ci.yml)


## Installation

```
npm i -D @probed/core
```

## Usage

The **probed** core is intentionally fairly bare-bones, and this README speaks only about the general principles at play. If you just want to dive in directly into writing DOM components using JSX, then head over (here)[http://example.com].

## A Note about TypeScript

This library has been designed with the presence of TypeScript's safety net in mind. It works fine with regular
JavaScript, but be wary that there are will be some possible footguns present without the static checker.

### Writing components - Basics

Any function can be used as a Component. Simple as that. 

**N.B.** While not strictly required, starting every component with an uppercase is a good practice for JSX compatibility.

```javascript
const Add = (x, y) => {
    return x + y;
}
```

### Writing components - Intrinsic mappings

Intrinsics maps are very important when dealing with JSX. There define components
that can be reffered to by through a string key.

**N.B.** While not strictly required, starting every intrinsic key with an lowercase is a good practice for JSX compatibility.

```javascript
const intrinsics = {
    "add" : (x, y)=> x+y,
    "mul" : (x, y)=> x*y,
}
```

### Dynamic values

Component callbacks are evaluated **only once** at creation time. Dynamic behavior is accomplished through the use of *Dynamic Values*.

Creating a `Dynamic` is just a matter of calling `dynamic(init)`, and updating them is done by changing their `value` property.

```javascript
const x = dynamic(12);
x.addListener((v)=>console.log(`x is now ${v}`));
x.value = 13;
```

Reading from *potentially* dynamic values is done through `extract()` and `dependant()`.

```javascript
const add = (x, y) => {
    const xRightNow = extract(x);
    const yRightNow = extract(y);
    console.log(`Values at the time add node was called: ${xRightNow}, ${yRightNow} )`);
    
    const result = dependant(x, y, (vx, vy)=>vx+vy);
    return result;
}
```

Typescript users have the option of enforcing that a value be static:

```typescript
const add = (x: number, y:Reader<number>) => {
    const yRightNow = extract(y);
    console.log(`Values at the time add node was called: ${x}, ${yRightNow} )`);
    
    const result = dependant(y, (vy)=>x+vy);
    return result;
}
```

### Evaluating Components - Probers

Components are evaluated via a `probe()` or `rootProbe()` function that serves the same role as react's
`createElement()`. These functions will return a `Node` with a data member that will contain the return value of the node once it has been fully evaluated.

The difference between `probe()` and `rootProbe()` is that `rootProbe()` is *guaranteed* to have populated the `data` by the time it returns.

Rule of thumb:
- By default: use `probe()`
- If you absolutly need to consume the result of a node immediately, and you are code that may be called from within a component, use `rootProbe()` instead.
- Never use `rootProbe()` within a recursive code path. (we'll almost certainly add a check for that.)
 

```javascript
import {probe} from '@probed/core`

const Add = (x, y)=> x*y;
const result = probe(Add, 1, 2);

console.log(result.data);
```

You can obtain a `probe()` and `rootProbe()` bound against a set of intrinsics via `createProber()`. 

```javascript
import {createProber} from '@probed/core`

const intrinsics = {
    "add" : (x, y)=> x+y,
}

const {probe} = createProber(intrinsics);

```

You might be wondering: "Why wouldn't I simply always use `rootProbe()`?". The answer is that it would
lead to very deep callstacks. Using `probe()` allows for arbitrarily deep nested nodes, memory allowing.

### Compound components

...

### Putting it all together

...
