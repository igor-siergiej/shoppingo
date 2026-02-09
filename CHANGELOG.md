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
