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

export default [
  {
    input: "./src/ft/index.ts",
    output: {
      file: "./dist/ft.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins,
    external,
  },
  {
    input: "./src/ft/index.ts",
    output: {
      file: "./dist/ft.d.ts",
      format: "es",
    },
    plugins: [nodeResolve(), dts()],
    external,
  },
  {
    input: "./src/roketo/index.ts",
    output: {
      file: "./dist/roketo.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins,
    external,
  },
  {
    input: "./src/roketo/index.ts",
    output: {
      file: "./dist/roketo.d.ts",
      format: "es",
    },
    plugins: [nodeResolve(), dts()],
    external,
  },
];
