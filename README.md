# Airfoil Connector Kit

This repository contains the Airfoil Connector Kit and Connectors.

## Structure

- `connectors/`: connector implementations.
- `templates/`: templates to quickly scaffold new connectors.
- `packages/`: core packages, including effect.ts wrappers of external dependencies.

## Checks

- `pnpm lint`: lint with oxlint.
- `pnpm format`: format with oxformat.
- `pnpm build`: build all packages.
- `pnpm typecheck`: typecheck all packages.
- `pnpm test:ci`: run non-interactive tests.
- `pnpm beachball check`: check change files.

## License

    Copyright 2026 GNC Labs Limited

    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software distributed
    under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
    CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
