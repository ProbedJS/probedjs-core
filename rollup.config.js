import rollupTypescript from '@rollup/plugin-typescript';
import path from 'path';
import { terser } from 'rollup-plugin-terser';

export default [
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
        plugins: [rollupTypescript()],
    },

    // CJS:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.cjs.js',
            format: 'cjs',
        },
        plugins: [rollupTypescript()],
    },

    // UMD:
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/probeCore.umd.js',
            format: 'umd',
            name: 'probeCore',
        },
        plugins: [rollupTypescript(), terser()],
    },
];
