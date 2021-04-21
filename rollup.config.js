import replace from '@rollup/plugin-replace';
import rollupTypescript from '@rollup/plugin-typescript';
import rollupCleanup from 'rollup-plugin-cleanup';
import rollupLicense from 'rollup-plugin-license';

import path from 'path';
import { terser } from 'rollup-plugin-terser';

const prod = replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
});

const cleanup = rollupCleanup({ comments: 'none', extensions: ['.ts', '.js'] });
const typescript = rollupTypescript({ tsconfig: 'tsconfig.prod.json', outDir: './dist' });
const typscriptES5 = rollupTypescript({ target: 'ES5', tsconfig: 'tsconfig.prod.json', outDir: './dist' });
const typscript2015 = rollupTypescript({ target: 'ES2015', tsconfig: 'tsconfig.prod.json', outDir: './dist' });
const mangle = terser({
    mangle: {
        properties: {
            regex: '^_[^_]',
        },
    },
});

const license = rollupLicense({
    banner: {
        content: {
            file: path.join(__dirname, 'LicenseBanner'),
        },
    },
});

export default [
    // ESM:
    {
        input: 'src/index.ts',
        output: {
            sourcemap: true,
            file: 'dist/esm/probe-core.js',
            format: 'es',
        },
        plugins: [typescript, cleanup, license],
    },
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/esm/probe-core.min.js',
            format: 'es',
        },
        plugins: [prod, typescript, cleanup, mangle, license],
    },

    // CJS:
    {
        input: 'src/index.ts',
        output: {
            sourcemap: true,
            file: 'dist/cjs/probe-core.js',
            format: 'cjs',
        },
        plugins: [typescript, cleanup, license],
    },
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/cjs/probe-core.min.js',
            format: 'cjs',
        },
        plugins: [prod, typescript, cleanup, mangle, license],
    },
    // UMD:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/umd/probe-core.legacy.js',
            format: 'umd',
            name: 'probeCore',
        },
        plugins: [prod, typscriptES5, mangle, cleanup, license],
    },
    // UMD:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/umd/probe-core.es6.js',
            format: 'umd',
            name: 'probeCore',
        },
        plugins: [prod, typscript2015, mangle, cleanup, license],
    },
    // UMD:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/umd/probe-core.modern.js',
            format: 'umd',
            name: 'probeCore',
        },
        plugins: [prod, typescript, mangle, cleanup, license],
    },
];
