import { web } from 'projen';
import { TypeScriptJsxMode } from 'projen/lib/javascript';
const project = new web.NextJsTypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'murderboard-blog',
  projenrcTs: true,

  deps: [
    'gray-matter',
    'remark',
    'remark-html',
    'tailwindcss@^3',
    'preline@2',
    'postcss',
    'autoprefixer',
    'react-markdown',
    'next-seo',
  ] /* Runtime dependencies of this module. */,
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: ['gh-pages'], /* Build dependencies for this module. */
  packageName: 'murderboard-blog' /* The "name" in package.json. */,
  tailwind: false /* Setup Tailwind CSS as a PostCSS plugin. */,
  eslint: true,
  eslintOptions: {
    dirs: ['.', 'src'],
  },
  tsconfig: {
    compilerOptions: {
      jsx: TypeScriptJsxMode.REACT_JSX,
      esModuleInterop: true,
      alwaysStrict: true,
      declaration: true,
      experimentalDecorators: true,
      inlineSourceMap: true,
      inlineSources: true,
      lib: ['es2018', 'DOM', 'DOM.Iterable'],
      module: 'preserve',
      noEmitOnError: false,
      noFallthroughCasesInSwitch: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noImplicitThis: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      resolveJsonModule: true,
      strict: true,
      strictNullChecks: true,
      strictPropertyInitialization: true,
      stripInternal: true,
      target: 'ES2018',
      rootDir: './src',
      outDir: './out',
    },
  },
});

project.addTask('deploy:build', {
  exec: 'next build',
});

project.addTask('deploy:export', {
  exec: 'next export',
});
project.addTask('deploy:gh', {
  exec: 'gh-pages -d out',
});

project.gitignore.addPatterns(
  'out/',
);

project.synth();
