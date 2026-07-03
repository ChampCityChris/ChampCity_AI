# Environment

## Workspace

`<PROJECT_REPO>`

## Git Status Discovered During Audit

- Initial audit found no valid Git repository.
- An empty or non-functional `.git` entry was present.
- Git has since been initialized locally for active Alpha app development.

## Git Remote Status

- Remote repository URL: `https://github.com/ChampCityChris/ChampCity_AI`.
- Repository visibility decision: public.

## Runtime and Tooling

- Package manager: npm.
- Runtime: Node/Electron.
- Language: TypeScript.

## Commands

- Install: `npm install`
- Start: `npm start`
- Build: `npm run build`
- Test: `npm test`
- Typecheck: `npm run typecheck`

## Validation Limits

- `npm test` currently runs the TypeScript typecheck.
- `npm run test:work-cards` builds the app and runs deterministic Work Card fixture verification.
- Manual Electron launch validation may still be required after build/typecheck for UI acceptance.
