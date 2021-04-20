import replace from '@rollup/plugin-replace';
import rollupTypescript from '@rollup/plugin-typescript';
import rollupCleanup from 'rollup-plugin-cleanup';
import rollupLicense from 'rollup-plugin-license';
import dts from 'rollup-plugin-dts';

import path from 'path';
import { terser } from 'rollup-plugin-terser';

const prod = replace({
    preventAssignment: true,
    'process.env.NODE_ENV': JSON.stringify('production'),
});

// We strip every comment from the source because the typings files "should" have everything covered
// If something is missing, it needs to be fixed in the typings.
const cleanup = rollupCleanup({ comments: 'none', extensions: ['.ts'] });
const typescript = rollupTypescript({ tsconfig: 'tsconfig.prod.json' });

const license = rollupLicense({
    banner: {
        content: {
            file: path.join(__dirname, 'LicenseBanner'),
        },
    },
});

const mangle = {
    properties: {
        regex: '^_[^_]',
    },
};

export default [
    // TYPES:
    {
        input: './lib/index.d.ts',
        output: [{ file: 'types/generated_index.d.ts', format: 'es' }],
        plugins: [dts()],
    },

    // ESM:
    // The esm build is intentionally not minified in any way shape or form, it's expacted
    // that users will be packing it themselves somehow.
    {
        input: 'src/index.ts',
        output: {
            sourcemap: true,
            sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
                // TODO: I have no idea whatsoever why the relative source path is coming in with an extra ../
                // There's clearly a problem somewhere, either in this project, or rollup's typescript integration
                // This is just a nasty kludge
                const realAbsolutePath = path.resolve(path.dirname(sourcemapPath) + '/a', relativeSourcePath);
                return path.relative(path.dirname(sourcemapPath), realAbsolutePath);
            },
            file: 'dist/index.esm.js',
            format: 'es',
        },
        plugins: [typescript, cleanup, license],
    },

    // CJS:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.cjs.js',
            format: 'cjs',
        },
        plugins: [typescript, cleanup, license],
    },

    // UMD:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/probeCore.legacy.umd.js',
            format: 'umd',
            name: 'probeCore',
        },
        plugins: [prod, typescript, terser({ ecma: 5, mangle }), license],
    },
    // UMD:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/probeCore.modern.umd.js',
            format: 'umd',
            name: 'probeCore',
        },
        plugins: [prod, typescript, terser({ mangle }), license],
    },
];
