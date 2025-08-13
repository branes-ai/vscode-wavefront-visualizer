\# package-lock.json



`package-lock.json` is a very important file that you \*\*should commit to source control\*\*.



\## What is package-lock.json?



Think of it as a \*\*dependency lockfile\*\* - like freezing the exact versions of all libraries and their sub-dependencies.



\### C++ Analogy

In C++, if you say "use OpenCV", you might get version 4.5.1 or 4.6.0 depending on when you build. `package-lock.json` is like saying "use OpenCV version 4.5.1 with exactly these specific versions of all its dependencies too."



\## package.json vs package-lock.json



```json

// package.json (what you want)

{

&nbsp; "dependencies": {

&nbsp;   "three": "^0.158.0"        // "Any version 0.158.x"

&nbsp; }

}



// package-lock.json (what you actually got)

{

&nbsp; "dependencies": {

&nbsp;   "three": {

&nbsp;     "version": "0.158.3",    // Exact version installed

&nbsp;     "resolved": "https://...", // Exact download URL

&nbsp;     "integrity": "sha512-..."  // Checksum for security

&nbsp;   }

&nbsp; }

}

```



\## Why It Matters



\*\*Without package-lock.json:\*\*

\- You run `npm install` → get three@0.158.3

\- Teammate runs `npm install` → gets three@0.158.5 (newer patch version)

\- Different behavior, potential bugs



\*\*With package-lock.json:\*\*

\- Everyone gets \*\*exactly\*\* the same versions

\- Reproducible builds

\- No "works on my machine" problems



\## What To Do With It



\### ✅ COMMIT package-lock.json to git

```bash

git add package-lock.json

git commit -m "Add package-lock.json for reproducible builds"

```



\### ✅ Updated .gitignore

```gitignore

\# Compiled output

out/

\*.vsix



\# Node.js dependencies  

node\_modules/           # DON'T commit this

\# package-lock.json     # DO commit this (commented out = we keep it)



\# ... rest of .gitignore

```



\## Common Scenarios



\### When package-lock.json gets updated:

\- You run `npm install new-package`

\- You run `npm update`

\- npm resolves different dependency versions



\### What teammates should do:

```bash

\# Use npm ci instead of npm install for exact reproduction

npm ci              # Installs exactly what's in package-lock.json

npm run compile     # Build with identical dependencies

```



\## npm install vs npm ci



| Command | When to use | What it does |

|---------|-------------|--------------|

| `npm install` | Development, adding packages | Respects package.json ranges, updates lock file |

| `npm ci` | CI/CD, teammates | Uses exact versions from lock file, faster |



\## Best Practices



1\. \*\*Always commit package-lock.json\*\*

2\. \*\*Use `npm ci` in CI/CD pipelines\*\*

3\. \*\*Use `npm install` when developing/adding packages\*\*

4\. \*\*Don't manually edit package-lock.json\*\*



\## Team Workflow



```bash

\# Developer A adds a new dependency

npm install some-library

git add package.json package-lock.json

git commit -m "Add some-library dependency"

git push



\# Developer B pulls changes

git pull

npm ci                    # Install exact same versions

npm run compile          # Guaranteed same build

```



\## Summary



\*\*package-lock.json = Commit it!\*\* It's like checking in a "this exact build configuration works" snapshot. It ensures everyone on your team gets identical dependency versions, preventing the classic "works on my machine" problem.



Think of it as the npm equivalent of committing a known-good build configuration that everyone can reproduce exactly.

