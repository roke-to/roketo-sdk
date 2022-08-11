import Package from "./package.json";
import { babel } from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

const plugins = [
  babel({
    extensions: [".ts"],
    babelHelpers: "bundled",
    presets: [
      [
        "@babel/preset-env",
        {
          targets: {
            node: "current",
          },
        },
      ],
    ],
  }),
  nodeResolve({
    extensions: [".ts", ".js"],
  }),
  commonjs(),
];

const external = [
  ...Object.keys(Package.dependencies),
  ...Object.keys(Package.devDependencies),
];

function createTypes({ input, output }) {
  return {
    input,
    output: {
      file: output,
      format: "es",
    },
    plugins: [nodeResolve(), dts()],
    external,
  };
}

function createBundle({ input, output }) {
  return {
    input,
    output: {
      file: output,
      format: "cjs",
      sourcemap: true,
    },
    plugins,
    external,
  };
}

export default [
  createBundle({
    input: "./src/index.ts",
    output: "./dist/index.js",
  }),
  createTypes({
    input: "./src/index.ts",
    output: "./dist/index.d.ts",
  }),
  createTypes({
    input: "./src/types.ts",
    output: "./dist/types.d.ts",
  }),
];
