# [1.22.0](https://github.com/igor-siergiej/shoppingo/compare/v1.21.9...v1.22.0) (2026-03-19)


### Bug Fixes

* add security-events:write permission for SARIF upload ([#26](https://github.com/igor-siergiej/shoppingo/issues/26)) ([b09e7b0](https://github.com/igor-siergiej/shoppingo/commit/b09e7b083016f4464e2423a64366efa60665a2f5))
* **ci:** add security-events:write permission to semgrep job in main pipeline ([#28](https://github.com/igor-siergiej/shoppingo/issues/28)) ([6fb1f12](https://github.com/igor-siergiej/shoppingo/commit/6fb1f12eca648201a23e291d09f9fcb9f04f9b37))
* **docker:** resolve sharp native bindings issue by running TypeScript directly with bun ([#20](https://github.com/igor-siergiej/shoppingo/issues/20)) ([67294d7](https://github.com/igor-siergiej/shoppingo/commit/67294d74174ea285a65b08dca1c04042fcb0fcff))


### Features

* **ci:** add automatic Dokploy deployment webhook trigger ([#27](https://github.com/igor-siergiej/shoppingo/issues/27)) ([f08875f](https://github.com/igor-siergiej/shoppingo/commit/f08875f5fd30eacd0ed0560e6750ed16467c3351))
* **ci:** add pull request workflow with coverage and semgrep checks ([#22](https://github.com/igor-siergiej/shoppingo/issues/22)) ([64a68a7](https://github.com/igor-siergiej/shoppingo/commit/64a68a7d7a0ad71debadc97284301691d0384c58))

## [1.21.9](https://github.com/igor-siergiej/shoppingo/compare/v1.21.8...v1.21.9) (2026-03-18)


### Bug Fixes

* **docker:** consolidate sharp to root node_modules before copy to runner ([d405914](https://github.com/igor-siergiej/shoppingo/commit/d405914ae1c7443f9163de3a98406b4f26987af0))
* **docker:** copy sharp from packages/api/node_modules instead of consolidating ([6a6a89f](https://github.com/igor-siergiej/shoppingo/commit/6a6a89f118477213a80b141c445bcf30e0da2d35))
* **docker:** install sharp directly in runner stage ([4340048](https://github.com/igor-siergiej/shoppingo/commit/434004850292e4c26129e1ac086c64446ea45cbe))
* **tests:** fix linting errors and bun:test compatibility issues ([efd066f](https://github.com/igor-siergiej/shoppingo/commit/efd066f2a933e5fb79ef1f7d241d12dafc536b56))

## [1.21.8](https://github.com/igor-siergiej/shoppingo/compare/v1.21.7...v1.21.8) (2026-03-18)


### Bug Fixes

* update Dockerfile references from bun.lockb to bun.lock ([c44246f](https://github.com/igor-siergiej/shoppingo/commit/c44246fcd5747d8ca645b050a19a6c9a6e13ad5f))

## [1.21.7](https://github.com/igor-siergiej/shoppingo/compare/v1.21.6...v1.21.7) (2026-03-18)


### Bug Fixes

* copy sharp native binaries from builder stage in Dockerfile ([5baeac6](https://github.com/igor-siergiej/shoppingo/commit/5baeac67117edf1a491d96ace5b376954db3fa0d))
* use bun in runner stage instead of node/npm ([72c0ac0](https://github.com/igor-siergiej/shoppingo/commit/72c0ac088c286f8d3c1fe86c9cae6cf2675bb627))

## [1.21.6](https://github.com/igor-siergiej/shoppingo/compare/v1.21.5...v1.21.6) (2026-03-18)


### Bug Fixes

* add workbox-window as explicit dependency for vite-plugin-pwa ([8dbfedc](https://github.com/igor-siergiej/shoppingo/commit/8dbfedc7834ff47581f9af9a79cb8dab5f574d6c))

## [1.21.5](https://github.com/igor-siergiej/shoppingo/compare/v1.21.4...v1.21.5) (2026-03-18)


### Bug Fixes

* update GitHub Actions to Node.js 24 compatible versions ([f211820](https://github.com/igor-siergiej/shoppingo/commit/f2118203ec613bdefe8c582b1442ba7404ebf56e))

## [1.21.4](https://github.com/igor-siergiej/shoppingo/compare/v1.21.3...v1.21.4) (2026-03-18)


### Bug Fixes

* resolve build-publish pipeline failures ([14e1a55](https://github.com/igor-siergiej/shoppingo/commit/14e1a5599c2d929d73b251d5ba599c96edf7ff85))

## [1.21.3](https://github.com/igor-siergiej/shoppingo/compare/v1.21.2...v1.21.3) (2026-03-18)


### Bug Fixes

* update Dockerfiles to use bun.lock instead of bun.lockb ([30a3777](https://github.com/igor-siergiej/shoppingo/commit/30a3777558cf581f3fa958cfc0e1b63e065b51a6))

## [1.21.2](https://github.com/igor-siergiej/shoppingo/compare/v1.21.1...v1.21.2) (2026-03-18)


### Bug Fixes

* biome linting issues ([ab4f0cc](https://github.com/igor-siergiej/shoppingo/commit/ab4f0ccbdd24dc5991e833521a8ef53b79a89f8a))
* replace Yarn workspace versioning with Bun-compatible Node script ([63b4f55](https://github.com/igor-siergiej/shoppingo/commit/63b4f5558c6c3e5eaf8d3c76524ec8b75ac84c9c))
* resolve all linting warnings ([067da54](https://github.com/igor-siergiej/shoppingo/commit/067da5475d8049d7d2ab72656ae7a792ab51f765))
* update biome-config reference to [@imapps](https://github.com/imapps) namespace in root biome.json ([b98c62a](https://github.com/igor-siergiej/shoppingo/commit/b98c62a3a67d60b78d703b0d2a4d9b02f0a8b7c6))

## [1.21.1](https://github.com/igor-siergiej/shoppingo/compare/v1.21.0...v1.21.1) (2026-03-12)


### Bug Fixes

* **ci-cd:** add contents:read permission for checkout action ([058b1c3](https://github.com/igor-siergiej/shoppingo/commit/058b1c336d35de033db2434fe4fdf40274a74c81))
* **ci-cd:** use GITHUB_TOKEN instead of GH_TOKEN ([854615e](https://github.com/igor-siergiej/shoppingo/commit/854615e6f40b08ed33eeae1ca52c85cebe45fd78))
* suppress biome linting warnings for Elysia context typing and ConfigService unknown types ([03d5a7a](https://github.com/igor-siergiej/shoppingo/commit/03d5a7a4daf0368b9f61ed2dda321f27c7435467))
* use Docker Hub credentials instead of GHCR for image push ([9ac2841](https://github.com/igor-siergiej/shoppingo/commit/9ac2841e0cd259174de9c238cffc54c01356dbda))
* use GitHub Container Registry (ghcr.io) instead of Docker Hub ([3ca5351](https://github.com/igor-siergiej/shoppingo/commit/3ca5351bf134029e4cbe1b6e9c8596cceb107f8e))

# [1.21.0](https://github.com/igor-siergiej/shoppingo/compare/v1.20.4...v1.21.0) (2026-03-12)


### Bug Fixes

* **ci-cd:** correct version extraction for GitHub Actions ([8ddf3d1](https://github.com/igor-siergiej/shoppingo/commit/8ddf3d1d76165aa6d3a06e45b7e72d4df1b36f64))


### Features

* add utils submodule for shared CI/CD pipelines ([8944f9c](https://github.com/igor-siergiej/shoppingo/commit/8944f9c5a1153e2432061c68382f3ccb4b8aee9f))

## [1.20.4](https://github.com/igor-siergiej/shoppingo/compare/v1.20.3...v1.20.4) (2026-03-11)


### Bug Fixes

* install dependencies before workspaces focus in runner stage ([78acb52](https://github.com/igor-siergiej/shoppingo/commit/78acb52dac6922303baf762bd23866d5d4e393f6))
* pass NODE_AUTH_TOKEN to runner stage for GitHub Packages auth ([e186374](https://github.com/igor-siergiej/shoppingo/commit/e1863741fc2fcb9040ea4d431062d89695108bb0))

## [1.20.3](https://github.com/igor-siergiej/shoppingo/compare/v1.20.2...v1.20.3) (2026-03-11)


### Bug Fixes

* remove .yarn from dockerfile copy (not in repo) ([e3dea2b](https://github.com/igor-siergiej/shoppingo/commit/e3dea2bfc214a6c5dd699f7abb08b8fa9a642406))

## [1.20.2](https://github.com/igor-siergiej/shoppingo/compare/v1.20.1...v1.20.2) (2026-03-11)


### Bug Fixes

* add NODE_AUTH_TOKEN to yarn install and change release condition to success ([3aa35a5](https://github.com/igor-siergiej/shoppingo/commit/3aa35a5a598ef8f7bcd188ac5a9e542b9eda661c))
* add npmAuthToken to .yarnrc.yml for GitHub Packages authentication ([11b8e92](https://github.com/igor-siergiej/shoppingo/commit/11b8e921f695f6942632a4f914d2d56a6d01fffc))
* add packages:read permission to jobs for GitHub Packages access ([cf5dcf3](https://github.com/igor-siergiej/shoppingo/commit/cf5dcf354d9afe6d0ea37f2220538cc652e4ad9b))
* downgrade to 0.4.5 which is published to GitHub Packages ([3afe061](https://github.com/igor-siergiej/shoppingo/commit/3afe06168e3919496e6806464c579a43aa2236c2))
* pass NODE_AUTH_TOKEN env var to yarn install in Dockerfiles ([3b79855](https://github.com/igor-siergiej/shoppingo/commit/3b79855c1ed1a418a949cb2f66132eda41a5b01a))
* remove circular dependency and add git pull to build-publish ([ed96084](https://github.com/igor-siergiej/shoppingo/commit/ed9608490245d2dba11dce73aa000d373543b697))
* serial dependencies and version extraction from package.json ([ae29557](https://github.com/igor-siergiej/shoppingo/commit/ae29557a7e0c8ee2283009c3e048885d7654a0ef))
* update yarn lock and utils versions ([52fb99c](https://github.com/igor-siergiej/shoppingo/commit/52fb99c4cbfd7abc2b7110bf26edd7ee5cae6a7d))
* use GH_TOKEN which has explicit read:packages permission ([efda9a6](https://github.com/igor-siergiej/shoppingo/commit/efda9a61c78f1815205f393d646fb22e818941a3))
* use GITHUB_TOKEN instead of GH_TOKEN secret ([557124b](https://github.com/igor-siergiej/shoppingo/commit/557124b07f95e9b6b17c1d961e6bea6d8d2bdc42))
* use NODE_AUTH_TOKEN in .yarnrc.yml to match workflow ([28cac7d](https://github.com/igor-siergiej/shoppingo/commit/28cac7d3314054c488c77a796787416a54086745))

## [1.20.1](https://github.com/igor-siergiej/shoppingo/compare/v1.20.0...v1.20.1) (2026-03-11)


### Bug Fixes

* correct reusable workflow org reference ([d6f1811](https://github.com/igor-siergiej/shoppingo/commit/d6f181118ec0b8efb79e1b5d3af911d917dd4281))

# [1.20.0](https://github.com/igor-siergiej/shoppingo/compare/v1.19.0...v1.20.0) (2026-03-11)


### Bug Fixes

* add mime.types include to nginx config for correct MIME type serving ([e19cf50](https://github.com/igor-siergiej/shoppingo/commit/e19cf5046a1a32a081f6e8321c6960dd06b99a16))
* correct Docker build output paths for web (build) and api (build) ([15b262d](https://github.com/igor-siergiej/shoppingo/commit/15b262d7d95fe043bb168b14278da6dcc8b975ef))
* correct repository URL to igor-siergiej org ([67a40a2](https://github.com/igor-siergiej/shoppingo/commit/67a40a2ff7df3fc27b6ee8303b1265213e06c17d))
* Improve dark mode colors for Appbar and theme toggle button ([2a87f6e](https://github.com/igor-siergiej/shoppingo/commit/2a87f6e29517e1bcde72efbcb76da2482309eb4a))
* make NODE_AUTH_TOKEN optional in yarn config ([0c1e094](https://github.com/igor-siergiej/shoppingo/commit/0c1e0948a156ed374d4e7ba023d5207dbd79790c))


### Features

* Add dark mode toggle to Shoppingo ([2be4d7a](https://github.com/igor-siergiej/shoppingo/commit/2be4d7aecfb808ec5f9d211b1cc0a3fb886f0dd4))
* add separate Dockerfiles for API and web services ([dcfd45d](https://github.com/igor-siergiej/shoppingo/commit/dcfd45d50aa148aa51ccfd05a325072fc92c2bb5))
* Adjust card color to better match cream background ([b73136a](https://github.com/igor-siergiej/shoppingo/commit/b73136a16703005ec73e41c9934fb157aadbbfd2))
* Different green shades for light and dark modes ([37e0820](https://github.com/igor-siergiej/shoppingo/commit/37e0820d8f0ee5757b0e28bc080c04f9b26a9f87))
* Make app bar green in both light and dark modes ([5f44a28](https://github.com/igor-siergiej/shoppingo/commit/5f44a28c6ca9785b42a181537c57155a9993f044))
* Replace green color scheme with neutral gray ([2b9f29e](https://github.com/igor-siergiej/shoppingo/commit/2b9f29ee69650a05be885bc2d98dba96923c200d))
* Restore green app bar in light mode ([0708e05](https://github.com/igor-siergiej/shoppingo/commit/0708e05c8c5f0ee8aa6d6ce8c23bd15e4635cb34))
* Use cream color for light mode background ([6969dcb](https://github.com/igor-siergiej/shoppingo/commit/6969dcb30ebb903d8fdc496cda5ef2dd8ca1d017))
* Use darker green for primary color ([b07d13f](https://github.com/igor-siergiej/shoppingo/commit/b07d13f5ce5b0282df23872a92a193ff358053f6))

# [1.20.0](https://gitlab.com/imapps/shoppingo/compare/v1.19.0...v1.20.0) (2026-02-13)


### Bug Fixes

* Improve dark mode colors for Appbar and theme toggle button ([2a87f6e](https://gitlab.com/imapps/shoppingo/commit/2a87f6e29517e1bcde72efbcb76da2482309eb4a))


### Features

* Add dark mode toggle to Shoppingo ([2be4d7a](https://gitlab.com/imapps/shoppingo/commit/2be4d7aecfb808ec5f9d211b1cc0a3fb886f0dd4))
* Adjust card color to better match cream background ([b73136a](https://gitlab.com/imapps/shoppingo/commit/b73136a16703005ec73e41c9934fb157aadbbfd2))
* Different green shades for light and dark modes ([37e0820](https://gitlab.com/imapps/shoppingo/commit/37e0820d8f0ee5757b0e28bc080c04f9b26a9f87))
* Make app bar green in both light and dark modes ([5f44a28](https://gitlab.com/imapps/shoppingo/commit/5f44a28c6ca9785b42a181537c57155a9993f044))
* Replace green color scheme with neutral gray ([2b9f29e](https://gitlab.com/imapps/shoppingo/commit/2b9f29ee69650a05be885bc2d98dba96923c200d))
* Restore green app bar in light mode ([0708e05](https://gitlab.com/imapps/shoppingo/commit/0708e05c8c5f0ee8aa6d6ce8c23bd15e4635cb34))
* Use cream color for light mode background ([6969dcb](https://gitlab.com/imapps/shoppingo/commit/6969dcb30ebb903d8fdc496cda5ef2dd8ca1d017))
* Use darker green for primary color ([b07d13f](https://gitlab.com/imapps/shoppingo/commit/b07d13f5ce5b0282df23872a92a193ff358053f6))

# [1.19.0](https://gitlab.com/imapps/shoppingo/compare/v1.18.1...v1.19.0) (2026-02-13)


### Features

* Add confirmation dialog for clear selected items and disable buttons ([6113809](https://gitlab.com/imapps/shoppingo/commit/6113809ac055e6c0d0a588839e1005e5b67bb6fa))
* Add confirmation dialogs for delete operations ([adaab22](https://gitlab.com/imapps/shoppingo/commit/adaab2247e077f5e23fa286a9129b5b289d14eca))

## [1.18.1](https://gitlab.com/imapps/shoppingo/compare/v1.18.0...v1.18.1) (2026-02-13)


### Bug Fixes

* Include ownerId in getListsForUser response ([1b5d870](https://gitlab.com/imapps/shoppingo/commit/1b5d8700ea157a767c6dea1f1f5eb17963c63583))
* Make list cards consistent height ([51c29e1](https://gitlab.com/imapps/shoppingo/commit/51c29e198a35c490ff2e4b2b6c75cf8199e91e59))

# [1.18.0](https://gitlab.com/imapps/shoppingo/compare/v1.17.2...v1.18.0) (2026-02-12)


### Features

* Update toast styling and add list ownership controls ([b43e753](https://gitlab.com/imapps/shoppingo/commit/b43e753782c67aba5366e7f0c74dda771362cc24)), closes [#10b981](https://gitlab.com/imapps/shoppingo/issues/10b981)

## [1.17.2](https://gitlab.com/imapps/shoppingo/compare/v1.17.1...v1.17.2) (2026-02-09)


### Bug Fixes

* Properly extract and log error messages in user management endpoints ([7c4b595](https://gitlab.com/imapps/shoppingo/commit/7c4b5955d4f5f7fef4d5afcde09ece64be143c2f))

## [1.17.1](https://gitlab.com/imapps/shoppingo/compare/v1.17.0...v1.17.1) (2026-02-08)


### Bug Fixes

* improve Kubernetes pod scheduling by optimizing kubelet resources ([9e93339](https://gitlab.com/imapps/shoppingo/commit/9e9333946161a5cb19bd7968655d993a022cd9be))

# [1.17.0](https://gitlab.com/imapps/shoppingo/compare/v1.16.1...v1.17.0) (2026-02-08)


### Bug Fixes

* improve Docker daemon startup timeout in CI pipelines ([56f4682](https://gitlab.com/imapps/shoppingo/commit/56f46828fb4b629b2642fa81edf0580a0b2652f4))
* improve error handling and messaging for user sharing and list creation ([2788988](https://gitlab.com/imapps/shoppingo/commit/27889888142173832216d936800ec442192e8561))


### Features

* manage users menu ([acbc14c](https://gitlab.com/imapps/shoppingo/commit/acbc14c5ec5cb39afb6e4eef6837b356a8687796))

## [1.16.1](https://gitlab.com/imapps/shoppingo/compare/v1.16.0...v1.16.1) (2026-01-30)


### Bug Fixes

* ensure gitops jobs receive VERSION artifact from version-release ([b9a76a8](https://gitlab.com/imapps/shoppingo/commit/b9a76a83415aef28a142458cd0599aa8a2a5e3a4))

# [1.16.0](https://gitlab.com/imapps/shoppingo/compare/v1.15.0...v1.16.0) (2026-01-29)


### Bug Fixes

* not being able to add shopping list items ([86a4000](https://gitlab.com/imapps/shoppingo/commit/86a40003a71de0a981548741be23a0151a231af6))


### Features

* added support for openai models for image generation ([64aa415](https://gitlab.com/imapps/shoppingo/commit/64aa415325f8a8cfd9ab224246c9df9a8ed75629))

# [1.15.0](https://gitlab.com/imapps/shoppingo/compare/v1.14.0...v1.15.0) (2026-01-05)


### Features

* add Origin header to kivo /verify requests ([3e2f8df](https://gitlab.com/imapps/shoppingo/commit/3e2f8df909eecb40ec34f25efb61d29df85f47f6))

# [1.14.0](https://gitlab.com/imapps/shoppingo/compare/v1.13.0...v1.14.0) (2026-01-05)


### Features

* fix types package external dependency ([5978217](https://gitlab.com/imapps/shoppingo/commit/59782170912e75b80e829e7cc4af417635b8db34))

# [1.13.0](https://gitlab.com/imapps/shoppingo/compare/v1.12.0...v1.13.0) (2026-01-05)


### Bug Fixes

* apply linting auto-fixes for formatting ([223b53d](https://gitlab.com/imapps/shoppingo/commit/223b53d75e6341e68499d4f24123943dc942d2b5))
* match exact shadcn date-picker example implementation ([af3f23f](https://gitlab.com/imapps/shoppingo/commit/af3f23f380cbc6c47ffdd8f6c6a48698e2a97852))
* resolve 3 linting errors ([235927a](https://gitlab.com/imapps/shoppingo/commit/235927a9f86dc0f59bcd76ea6ec6ae36af93f0b5))
* resolve Calendar identifier conflict ([edb3e92](https://gitlab.com/imapps/shoppingo/commit/edb3e920c514d65f65ba888fb09d2a0830dfb61e))
* resolve date picker in drawer by increasing z-index ([ddac632](https://gitlab.com/imapps/shoppingo/commit/ddac63223bc16ce717faeea9a330647ef4110550))
* resolve TODO list checkbox error and calendar styling ([45d7b17](https://gitlab.com/imapps/shoppingo/commit/45d7b178d873872abc54316015be6041cbad3f31))
* use shadcn date-picker pattern with proper state management ([dca8eed](https://gitlab.com/imapps/shoppingo/commit/dca8eede35a8bf05452a474ee3552b0e07aa56c2))


### Features

* add date picker popover for TODO items ([8ff5b98](https://gitlab.com/imapps/shoppingo/commit/8ff5b98f2d76073b14e6b16164dd275b38534691))
* complete TODO list feature with context-aware UI and date picker ([bb78c73](https://gitlab.com/imapps/shoppingo/commit/bb78c7384e16c7e78446c86dc6c3f201149c4939))
* fix calendar padding ([6a9d9ea](https://gitlab.com/imapps/shoppingo/commit/6a9d9eaa7ace2dff424e57d65e829250ed0eeaae))

# [1.12.0](https://gitlab.com/imapps/shoppingo/compare/v1.11.0...v1.12.0) (2026-01-04)


### Bug Fixes

* include listType in getListsForUser response ([32bf518](https://gitlab.com/imapps/shoppingo/commit/32bf518a928d75cd44943c134d502ec29f39a304))


### Features

* add conditional empty state messages for list types ([10e67bd](https://gitlab.com/imapps/shoppingo/commit/10e67bd54c9a302359c2f3423aedb2288840974c))
* improve add item/task modal UI ([416546d](https://gitlab.com/imapps/shoppingo/commit/416546df10e702f0f40c526e5f89c3df32d7c113))
* replace CheckSquare with ListTodo icon for TODO lists ([2958d6c](https://gitlab.com/imapps/shoppingo/commit/2958d6c29c48cc896625283e2aa238d777749414))

# [1.11.0](https://gitlab.com/imapps/shoppingo/compare/v1.10.3...v1.11.0) (2026-01-04)


### Bug Fixes

* update ListHandlers tests for TODO list feature ([9a959ac](https://gitlab.com/imapps/shoppingo/commit/9a959ac8f00dcfecb7993f91807de45edc02ea3d))


### Features

* add todo list feature with due dates support ([be6e8a8](https://gitlab.com/imapps/shoppingo/commit/be6e8a8e9c664038bf8c5d4f3b9f3e2106467bd2))

## [1.10.3](https://gitlab.com/imapps/shoppingo/compare/v1.10.2...v1.10.3) (2026-01-03)


### Bug Fixes

* add missing getList method to ListService for access control checks ([56a5d93](https://gitlab.com/imapps/shoppingo/commit/56a5d939b6930e1c2f9c7f03614563713558bc37))

## [1.10.2](https://gitlab.com/imapps/shoppingo/compare/v1.10.1...v1.10.2) (2026-01-02)


### Bug Fixes

* implement phase 1 web security hardening and sanitized logging ([7f912de](https://gitlab.com/imapps/shoppingo/commit/7f912de3152cd53fdce04fe6d639c4069c0eaf6e))

## [1.10.1](https://gitlab.com/imapps/shoppingo/compare/v1.10.0...v1.10.1) (2026-01-02)


### Bug Fixes

* implement authorization layer for Shoppingo API ([9c714d3](https://gitlab.com/imapps/shoppingo/commit/9c714d36165f9acd8cbd74eea59f339713527647))
* implement authorization layer for Shoppingo API ([a8bffc1](https://gitlab.com/imapps/shoppingo/commit/a8bffc19317b367c33761b199a4821f9dbf24f72))

# [1.10.0](https://gitlab.com/imapps/shoppingo/compare/v1.9.1...v1.10.0) (2026-01-01)


### Features

* implement end-to-end JWT authentication with Kivo integration ([daa50ee](https://gitlab.com/imapps/shoppingo/commit/daa50eedbc673c476b523b92d17813a92043910c))

## [1.9.1](https://gitlab.com/imapps/shoppingo/compare/v1.9.0...v1.9.1) (2025-12-29)


### Bug Fixes

* add .env to .gitignore to prevent credential leaks ([babab97](https://gitlab.com/imapps/shoppingo/commit/babab97fdae5d5d6aa6f0393e195de94cc52b04e))

# [1.9.0](https://gitlab.com/imapps/shoppingo/compare/v1.8.1...v1.9.0) (2025-12-19)


### Features

* add frontend and backend logging pipeline to Loki ([e9aabc4](https://gitlab.com/imapps/shoppingo/commit/e9aabc447637298269a6534b169d71c754b86c5e))

## [1.8.1](https://gitlab.com/imapps/shoppingo/compare/v1.8.0...v1.8.1) (2025-12-18)


### Bug Fixes

* **ci:** update helm values paths for proper image tag configuration ([0d1e251](https://gitlab.com/imapps/shoppingo/commit/0d1e2515c0b835eed1b82be322b685c767039b86))

# [1.8.0](https://gitlab.com/imapps/shoppingo/compare/v1.7.0...v1.8.0) (2025-12-18)


### Features

* add comprehensive audit logging to shoppingo API ([77763b3](https://gitlab.com/imapps/shoppingo/commit/77763b36dd9bd8f02571ef632057b6db33237878))

# [1.7.0](https://gitlab.com/imapps/shoppingo/compare/v1.6.0...v1.7.0) (2025-12-09)


### Features

* migrate CI/CD pipeline to Helm chart GitOps templates ([02ae5b5](https://gitlab.com/imapps/shoppingo/commit/02ae5b5fe7f44069cf1452984885e6ee42633419))

# [1.6.0](https://gitlab.com/imapps/shoppingo/compare/v1.5.0...v1.6.0) (2025-12-04)


### Features

* move the add button to the middle ([71e1170](https://gitlab.com/imapps/shoppingo/commit/71e1170796649f21d6d465eb353dc1732e343922))

# [1.5.0](https://gitlab.com/imapps/shoppingo/compare/v1.4.0...v1.5.0) (2025-11-17)


### Features

* add commitlint for conventional commits ([eb14c67](https://gitlab.com/imapps/shoppingo/commit/eb14c677885fbdf6ef0195690f3442edd5e6ab77))
* fix commit lint linting lol ([fd644c4](https://gitlab.com/imapps/shoppingo/commit/fd644c468254280ea48fa26270ac1f03e93fc577))
* get commit hook working ([771176a](https://gitlab.com/imapps/shoppingo/commit/771176a09d41326443f74664e2c7ad5cc5bce485))
* new version ([feaea12](https://gitlab.com/imapps/shoppingo/commit/feaea1261a5cf0fb53d5aae32de4810c81fb298f))

# [1.4.0](https://gitlab.com/imapps/shoppingo/compare/v1.3.0...v1.4.0) (2025-11-14)


### Features

* deploy new version ([c0b1d57](https://gitlab.com/imapps/shoppingo/commit/c0b1d570e38541727c83a191a5210b55a0546d0b))

# [1.3.0](https://gitlab.com/imapps/shoppingo/compare/v1.2.1...v1.3.0) (2025-11-04)


### Bug Fixes

* lint ([86ecf14](https://gitlab.com/imapps/shoppingo/commit/86ecf149415212c47c2f5ef79e7c22016ed4e972))


### Features

* added optimistic state changes with tanstack ([f51a259](https://gitlab.com/imapps/shoppingo/commit/f51a25950c92cc74bc51f0e222f395bf1c1bd9e5))
* added swiping to show edit and delete ([0185b9f](https://gitlab.com/imapps/shoppingo/commit/0185b9fb6441801e2898c44945e099bb8a17ddaa))
* move edit to a dialog ([7db30b6](https://gitlab.com/imapps/shoppingo/commit/7db30b6586ffb4f769cb0b97d3595275d615124c))

## [1.2.1](https://gitlab.com/imapps/shoppingo/compare/v1.2.0...v1.2.1) (2025-10-31)


### Bug Fixes

* **ci:** configure publish jobs to allow insecure registry ([443e30c](https://gitlab.com/imapps/shoppingo/commit/443e30c93dffad6bd5f516a58d75d2463782017e))

# [1.2.0](https://gitlab.com/imapps/shoppingo/compare/v1.1.2...v1.2.0) (2025-10-31)


### Features

* add clean orphanes tags script ([a168329](https://gitlab.com/imapps/shoppingo/commit/a16832914ad08eb9e4080c63c14e90f3ed04dcf7))
* use jewellery-catalogue pipeline ([69d8d2e](https://gitlab.com/imapps/shoppingo/commit/69d8d2ec6be2e5d48355ef64d73ca311d859306e))

## [1.1.2](https://gitlab.com/imapps/shoppingo/compare/v1.1.1...v1.1.2) (2025-10-04)


### Bug Fixes

* remove some tests ([929011a](https://gitlab.com/imapps/shoppingo/commit/929011a0042fbd70b08071438829261851f9fc3c))

## [1.1.1](https://gitlab.com/imapps/shoppingo/compare/v1.1.0...v1.1.1) (2025-10-03)


### Bug Fixes

* update package versions too ([69ace70](https://gitlab.com/imapps/shoppingo/commit/69ace70f7449e6cf6e35f50c259064b3805c1d54))

# [1.1.0](https://gitlab.com/imapps/shoppingo/compare/v1.0.0...v1.1.0) (2025-10-03)


### Bug Fixes

* yarn lock and use eslint-config 0.2 ([0097da7](https://gitlab.com/imapps/shoppingo/commit/0097da7465c9b17619730288fb69d7fc6d4ed225))


### Features

* update empty components and some toolbar fixes ([78cff8b](https://gitlab.com/imapps/shoppingo/commit/78cff8b747e4ebc35ffca297fa89243d0f303a36))

# 1.0.0 (2025-09-30)


### Bug Fixes

* make sure prod gitops job has version ([330c93c](https://gitlab.com/imapps/shoppingo/commit/330c93c017b9251f7d9eaa0a2fb1ce8142758da4))
* use new util package versions ([ec5640b](https://gitlab.com/imapps/shoppingo/commit/ec5640b7f5d8fe27c33da3811126ece3ee46dada))
* use version-release steps instead ([d79719e](https://gitlab.com/imapps/shoppingo/commit/d79719e9522c1dd92f339df894c2de942f0deaba))


### Features

* add semantic-release for automated versioning ([43fa720](https://gitlab.com/imapps/shoppingo/commit/43fa720ed16849c836b82adc9534000c498ed54a))
* use semantic versions here too ([9370c27](https://gitlab.com/imapps/shoppingo/commit/9370c27f7be842e841b790b475d2aeb288134bfc))
