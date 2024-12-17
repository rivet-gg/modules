# Changelog

## [1.0.0-rc.1](https://github.com/OpenGameBackend/OpenGameBackend/compare/v1.0.0-rc.1...v1.0.0-rc.1) (2024-12-17)


### ⚠ BREAKING CHANGES

* rename scripts get -> fetch ([#113](https://github.com/OpenGameBackend/OpenGameBackend/issues/113))

### Features

* add identity providers for `email`, `email_link`, `email_password`, `email_passwordless`, and `username_password` ([#144](https://github.com/OpenGameBackend/OpenGameBackend/issues/144)) ([0f9152f](https://github.com/OpenGameBackend/OpenGameBackend/commit/0f9152f4ce57f694e9f5367d1da6039c13257dc3))
* **CI:** Create CI for testing all modules based on a known-good engine commit ([a9d20d0](https://github.com/OpenGameBackend/OpenGameBackend/commit/a9d20d05221cff1673eb8baed319fabb34406c6c))
* **CI:** Create CI for testing all modules based on a known-good engine commit ([#56](https://github.com/OpenGameBackend/OpenGameBackend/issues/56)) ([9d0a07d](https://github.com/OpenGameBackend/OpenGameBackend/commit/9d0a07d7080e119779044bcada8c7c436d5ded74))
* Create `uploads` module ([#76](https://github.com/OpenGameBackend/OpenGameBackend/issues/76)) ([442cbb3](https://github.com/OpenGameBackend/OpenGameBackend/commit/442cbb3ff1669774f1ba614400b1fe7584c581cd))
* Create the `identites` module ([#121](https://github.com/OpenGameBackend/OpenGameBackend/issues/121)) ([ba39943](https://github.com/OpenGameBackend/OpenGameBackend/commit/ba39943b74877721bffd368e221ef546483b46b7))
* Create the `user_passwords` module ([#127](https://github.com/OpenGameBackend/OpenGameBackend/issues/127)) ([7d12d24](https://github.com/OpenGameBackend/OpenGameBackend/commit/7d12d24836919621622bd4073289a8066c03deb4))
* **currency:** Add tests for currency module ([b148e99](https://github.com/OpenGameBackend/OpenGameBackend/commit/b148e995a012e104d3ff7fa24056170fd74b8f73))
* **currency:** Add tests for currency module ([#47](https://github.com/OpenGameBackend/OpenGameBackend/issues/47)) ([c898d1f](https://github.com/OpenGameBackend/OpenGameBackend/commit/c898d1f85e531937586de9e9d35e72fa29cddb13))
* impl basic auth ([#62](https://github.com/OpenGameBackend/OpenGameBackend/issues/62)) ([a2a1150](https://github.com/OpenGameBackend/OpenGameBackend/commit/a2a11506173d0818d19eb4fb6b06eab1ef1b1da4))
* impl rate limit ([#63](https://github.com/OpenGameBackend/OpenGameBackend/issues/63)) ([04f7685](https://github.com/OpenGameBackend/OpenGameBackend/commit/04f7685a6f06e497fdafce2930b62e90384bf866))
* **lobbies:** add admin api ([#589](https://github.com/OpenGameBackend/OpenGameBackend/issues/589)) ([fdeec74](https://github.com/OpenGameBackend/OpenGameBackend/commit/fdeec74d2644c2fca4be1a18b19835f31ff7efaa))
* **lobbies:** return region with find lobby ([#592](https://github.com/OpenGameBackend/OpenGameBackend/issues/592)) ([60c69de](https://github.com/OpenGameBackend/OpenGameBackend/commit/60c69de13fda517d2706aac8321ceadf2d1d4d1a))
* **sandbox:** create sandbox foundation ([#133](https://github.com/OpenGameBackend/OpenGameBackend/issues/133)) ([692d68a](https://github.com/OpenGameBackend/OpenGameBackend/commit/692d68a671a80bfeb4b8e895ac0d8b4f193484fd))
* **tokens:** Add script to extend token life ([#73](https://github.com/OpenGameBackend/OpenGameBackend/issues/73)) ([ad1b37d](https://github.com/OpenGameBackend/OpenGameBackend/commit/ad1b37d23bb642373c3d5402f693fbf2dfb73151))
* update readme ([9c03df3](https://github.com/OpenGameBackend/OpenGameBackend/commit/9c03df3ca4dccc2b9aa77c6873fe6278724e5a1f))
* **users:** optionally return `user` in `authenticate_token` ([01d9791](https://github.com/OpenGameBackend/OpenGameBackend/commit/01d9791b4a1955b373e7aef933b2ea67bf3ecf54))


### Bug Fixes

* add dependencies ([fe5c663](https://github.com/OpenGameBackend/OpenGameBackend/commit/fe5c663e48efb539a1dca2ead1c7b6dc3363f0e3))
* add dependencies ([#59](https://github.com/OpenGameBackend/OpenGameBackend/issues/59)) ([8e5fbca](https://github.com/OpenGameBackend/OpenGameBackend/commit/8e5fbca24703f7bed040bc831eb580754a50c883))
* **auth.auth_email_passwordless:** fix broken login functionality ([#85](https://github.com/OpenGameBackend/OpenGameBackend/issues/85)) ([8fb6f44](https://github.com/OpenGameBackend/OpenGameBackend/commit/8fb6f445e9a5b441235cbc94504b4c88d1795732))
* **currency:** add in missing await ([2fd29b4](https://github.com/OpenGameBackend/OpenGameBackend/commit/2fd29b441c95c2c0586712d2ef4f14cb117e0d1f))
* **currency:** Fix tests + make errors more consistent ([596c668](https://github.com/OpenGameBackend/OpenGameBackend/commit/596c668783c8d18b6bcd8bf57775d1110c6a4cb2))
* **currency:** Fix tests + make errors more consistent ([#58](https://github.com/OpenGameBackend/OpenGameBackend/issues/58)) ([cb0f9c5](https://github.com/OpenGameBackend/OpenGameBackend/commit/cb0f9c580318be4340550757cd26c8e5d06c20f9))
* **currency:** Rename expected error codes in `currency` tests to fit with the correct casing ([#75](https://github.com/OpenGameBackend/OpenGameBackend/issues/75)) ([dd6b2bd](https://github.com/OpenGameBackend/OpenGameBackend/commit/dd6b2bddbadf780bbaf6646a904c2a78f1e7b98d))
* **currency:** test casing ([f28b9c0](https://github.com/OpenGameBackend/OpenGameBackend/commit/f28b9c0ddbb69fcc092dfff12a18707065a69251))
* **currency:** test casing ([#54](https://github.com/OpenGameBackend/OpenGameBackend/issues/54)) ([84e2926](https://github.com/OpenGameBackend/OpenGameBackend/commit/84e2926c2f9e00d9f9b36cb0737672041a902bb7))
* format ([936a850](https://github.com/OpenGameBackend/OpenGameBackend/commit/936a8507d7d84904e1bb585275fb2304b1ed2774))
* format ([#60](https://github.com/OpenGameBackend/OpenGameBackend/issues/60)) ([cd58433](https://github.com/OpenGameBackend/OpenGameBackend/commit/cd584338097f61632345feaee2fa709eb6123b64))
* import urls in tests ([#46](https://github.com/OpenGameBackend/OpenGameBackend/issues/46)) ([1361b9a](https://github.com/OpenGameBackend/OpenGameBackend/commit/1361b9a951c19ffdfb9422161dec2b91c8e69ce3))
* **lobbies:** make list_regions public ([#159](https://github.com/OpenGameBackend/OpenGameBackend/issues/159)) ([a97095b](https://github.com/OpenGameBackend/OpenGameBackend/commit/a97095bc3d865be8783c1b53027313448f8495a2))
* temporary disable rate limit ([#101](https://github.com/OpenGameBackend/OpenGameBackend/issues/101)) ([b9171fa](https://github.com/OpenGameBackend/OpenGameBackend/commit/b9171fa5fda1f1b854083f6d79c5b7f5d62fc794))
* tests ([#67](https://github.com/OpenGameBackend/OpenGameBackend/issues/67)) ([b5c0823](https://github.com/OpenGameBackend/OpenGameBackend/commit/b5c082379c7dc9ba0e97c2cb0f3a53062573f004))
* wrong import in rate_limit.throttle ([#65](https://github.com/OpenGameBackend/OpenGameBackend/issues/65)) ([2f15035](https://github.com/OpenGameBackend/OpenGameBackend/commit/2f15035fd793e0d2d80007df5091ac7df31670a6))


### Documentation

* bring back docs ([#609](https://github.com/OpenGameBackend/OpenGameBackend/issues/609)) ([69228ea](https://github.com/OpenGameBackend/OpenGameBackend/commit/69228ead2b822a78a58996f08bd4bb6bb958e88c))


### Code Refactoring

* **rate_limit:** migrate to actors ([#116](https://github.com/OpenGameBackend/OpenGameBackend/issues/116)) ([8c83495](https://github.com/OpenGameBackend/OpenGameBackend/commit/8c83495bcb29011121eddd56540cbb11054a7530))


### Tests

* **tokens:** add a test for the `meta` field. ([#117](https://github.com/OpenGameBackend/OpenGameBackend/issues/117)) ([7bc0a69](https://github.com/OpenGameBackend/OpenGameBackend/commit/7bc0a6905151ca6e99c0d44baec9626b42ff0ce8))


### Continuous Integration

* add release-please github action ([679fed7](https://github.com/OpenGameBackend/OpenGameBackend/commit/679fed74f41ba3c9069b2b82d3cf8ea570341103))


### Chores

* add `dependencies` to existing modules ([e18ba64](https://github.com/OpenGameBackend/OpenGameBackend/commit/e18ba64bd45d246dbcd8bfaf1f104208c4408a7f))
* add `dependencies` to existing modules ([#55](https://github.com/OpenGameBackend/OpenGameBackend/issues/55)) ([83ce5b8](https://github.com/OpenGameBackend/OpenGameBackend/commit/83ce5b8189509efebf6b09f7719b5d4a47b3747f))
* add coming soon modules ([#120](https://github.com/OpenGameBackend/OpenGameBackend/issues/120)) ([5f71917](https://github.com/OpenGameBackend/OpenGameBackend/commit/5f7191716fde37c042cf7a54bae508d943c8bb23))
* add early access links ([#149](https://github.com/OpenGameBackend/OpenGameBackend/issues/149)) ([7b1fdce](https://github.com/OpenGameBackend/OpenGameBackend/commit/7b1fdce5efee9523878797ce3a12a917d14aa6f4))
* add engine docs ([#611](https://github.com/OpenGameBackend/OpenGameBackend/issues/611)) ([653f790](https://github.com/OpenGameBackend/OpenGameBackend/commit/653f790ccceeb4d45e25e1e2bda5ad55dee943cb))
* add metadata for uploads module ([#108](https://github.com/OpenGameBackend/OpenGameBackend/issues/108)) ([4ef61d5](https://github.com/OpenGameBackend/OpenGameBackend/commit/4ef61d5999b6c33fbf5101c523d66995435a03f8))
* add rivet-gg to authors of first-party modules ([#151](https://github.com/OpenGameBackend/OpenGameBackend/issues/151)) ([9d99d23](https://github.com/OpenGameBackend/OpenGameBackend/commit/9d99d2341695a8adf7b3d2914eb05847ece388a0))
* add sandbox scripts ([#141](https://github.com/OpenGameBackend/OpenGameBackend/issues/141)) ([cab6396](https://github.com/OpenGameBackend/OpenGameBackend/commit/cab6396f9f36cae76b4581db5fe545b1fef6a439))
* add strict compiler options ([#129](https://github.com/OpenGameBackend/OpenGameBackend/issues/129)) ([7bb4e9e](https://github.com/OpenGameBackend/OpenGameBackend/commit/7bb4e9e48874bb103a2f789f46709e9034cd72c6))
* bootstrap releases for path: . ([#105](https://github.com/OpenGameBackend/OpenGameBackend/issues/105)) ([9582f3a](https://github.com/OpenGameBackend/OpenGameBackend/commit/9582f3abaee7d49914bd3fae380e7d2cdff3f08b))
* change favicon, logo and invalid redirects ([#610](https://github.com/OpenGameBackend/OpenGameBackend/issues/610)) ([1774c1c](https://github.com/OpenGameBackend/OpenGameBackend/commit/1774c1cc198704e9489a719aafbb68ad40960802))
* Convert old modules to camelCase and register `RuntimeErrors` ([116761f](https://github.com/OpenGameBackend/OpenGameBackend/commit/116761f07b8b323baa99c05e1db31d166fca1656))
* Convert old modules to camelCase and register `RuntimeErrors` ([#52](https://github.com/OpenGameBackend/OpenGameBackend/issues/52)) ([035a138](https://github.com/OpenGameBackend/OpenGameBackend/commit/035a138ebfb00f41a2bc06f8772603eb8ff4ce06))
* fix modules ([794dbeb](https://github.com/OpenGameBackend/OpenGameBackend/commit/794dbeb6668a528467ff8a79581e12edc9443c2b))
* fix modules ([#45](https://github.com/OpenGameBackend/OpenGameBackend/issues/45)) ([fff4081](https://github.com/OpenGameBackend/OpenGameBackend/commit/fff4081aa1d6c326185e50e7c567c8d21e9e2124))
* format ([#128](https://github.com/OpenGameBackend/OpenGameBackend/issues/128)) ([6b2d0e3](https://github.com/OpenGameBackend/OpenGameBackend/commit/6b2d0e31a7e553c1d37d6872d339312b02e964be))
* generate migrations ([#146](https://github.com/OpenGameBackend/OpenGameBackend/issues/146)) ([4381160](https://github.com/OpenGameBackend/OpenGameBackend/commit/4381160e15bbf51d5229cfa4910490b31902172b))
* **lobbies:** add lnd-* region prefixes ([#139](https://github.com/OpenGameBackend/OpenGameBackend/issues/139)) ([205f841](https://github.com/OpenGameBackend/OpenGameBackend/commit/205f841ab3d6bd54c98ecaa21cd24202e1e69bb9))
* **lobbies:** await poll servers in tick in order to cleanly throw error ([#596](https://github.com/OpenGameBackend/OpenGameBackend/issues/596)) ([bc0eabd](https://github.com/OpenGameBackend/OpenGameBackend/commit/bc0eabd0fc05ec7236243bc7837d3adf13537734))
* **lobbies:** crash on fail to create server ([#579](https://github.com/OpenGameBackend/OpenGameBackend/issues/579)) ([27e435a](https://github.com/OpenGameBackend/OpenGameBackend/commit/27e435adaa97f89e9c0db5c26ff03a7a0eab0670))
* **lobbies:** disable fetch state by default ([#583](https://github.com/OpenGameBackend/OpenGameBackend/issues/583)) ([566b0fe](https://github.com/OpenGameBackend/OpenGameBackend/commit/566b0feaf5f6aa0b5f74f9179cbbd39252c41d57))
* **lobbies:** fix tests with stricter validation ([#162](https://github.com/OpenGameBackend/OpenGameBackend/issues/162)) ([330f63e](https://github.com/OpenGameBackend/OpenGameBackend/commit/330f63e1de89904a7a7354c5efd262596ec3132e))
* **lobbies:** fix warnings ([#595](https://github.com/OpenGameBackend/OpenGameBackend/issues/595)) ([2d3b607](https://github.com/OpenGameBackend/OpenGameBackend/commit/2d3b607bd633b517076db6146caa65059b72c5d2))
* **lobbies:** remove crash on invalid transport ([#165](https://github.com/OpenGameBackend/OpenGameBackend/issues/165)) ([47deee2](https://github.com/OpenGameBackend/OpenGameBackend/commit/47deee24d4d72980cc6a2088dec4d6c285aa1ed4))
* **lobbies:** rename BACKEND_ENDPOINT -&gt; RIVET_BACKEND_ENDPOINT ([#580](https://github.com/OpenGameBackend/OpenGameBackend/issues/580)) ([7f8b5e3](https://github.com/OpenGameBackend/OpenGameBackend/commit/7f8b5e32c03bda6f5dd17bae8efb6bca61f559d9))
* **lobbies:** rename region id -&gt; region slug ([#591](https://github.com/OpenGameBackend/OpenGameBackend/issues/591)) ([ed8f262](https://github.com/OpenGameBackend/OpenGameBackend/commit/ed8f26251907c54fb50cbefabeeeef0d28b31c94))
* **lobbies:** upgrade multiplayer manager sdk addon ([#160](https://github.com/OpenGameBackend/OpenGameBackend/issues/160)) ([88c0be5](https://github.com/OpenGameBackend/OpenGameBackend/commit/88c0be5bc15abb195acfe160aa695445de3a47e3))
* **main:** release 0.1.0 ([#106](https://github.com/OpenGameBackend/OpenGameBackend/issues/106)) ([98c722c](https://github.com/OpenGameBackend/OpenGameBackend/commit/98c722cc2a765b14cb35390cd7e5ad4e9b42eb32))
* **main:** release 0.1.1 ([#109](https://github.com/OpenGameBackend/OpenGameBackend/issues/109)) ([412d5c0](https://github.com/OpenGameBackend/OpenGameBackend/commit/412d5c0769ecd8b9543d943fc3cf42765c0ef987))
* **main:** release 1.0.0-rc.1 ([#112](https://github.com/OpenGameBackend/OpenGameBackend/issues/112)) ([0a06f6b](https://github.com/OpenGameBackend/OpenGameBackend/commit/0a06f6ba878b8a85d6454bd2d6d56dfb76e2a0f4))
* make errors lowercase ([#64](https://github.com/OpenGameBackend/OpenGameBackend/issues/64)) ([cc9b388](https://github.com/OpenGameBackend/OpenGameBackend/commit/cc9b3880acb3102e37dbde8154c7a44000232e1d))
* Migrate all existing tests and modules to `camelCase` and fix some lint errors ([fff6345](https://github.com/OpenGameBackend/OpenGameBackend/commit/fff6345bda73fb991425d05e3f821ffc8b34106c))
* Migrate all existing tests and modules to `camelCase` and fix some lint errors ([#61](https://github.com/OpenGameBackend/OpenGameBackend/issues/61)) ([174206b](https://github.com/OpenGameBackend/OpenGameBackend/commit/174206b85747cb5e9392a0db20719623efb317a8))
* migrate database query api ([#140](https://github.com/OpenGameBackend/OpenGameBackend/issues/140)) ([d03bd83](https://github.com/OpenGameBackend/OpenGameBackend/commit/d03bd83dda3ce39b3bea1980d6dff65e92aa5a3a))
* migrate from yaml to json ([#103](https://github.com/OpenGameBackend/OpenGameBackend/issues/103)) ([54ce087](https://github.com/OpenGameBackend/OpenGameBackend/commit/54ce08766d477ce332c9f41b97f058ca921da189))
* migrate modules from ogse ([6fa408e](https://github.com/OpenGameBackend/OpenGameBackend/commit/6fa408e9f3f2d081a9d16ab38deb7e89184761df))
* migrate modules from ogse ([#44](https://github.com/OpenGameBackend/OpenGameBackend/issues/44)) ([a99d546](https://github.com/OpenGameBackend/OpenGameBackend/commit/a99d5462c9b57a1b9274d517c0ffac0d2b293bee))
* name scripts ([b81597a](https://github.com/OpenGameBackend/OpenGameBackend/commit/b81597ab946c190f32df9eed03b7c690658eecd4))
* **rate_limit:** remove db ([#137](https://github.com/OpenGameBackend/OpenGameBackend/issues/137)) ([a2f5af1](https://github.com/OpenGameBackend/OpenGameBackend/commit/a2f5af1983e97c0314fa4649d32ce27e95e54012))
* re-enable rate_limit module ([#107](https://github.com/OpenGameBackend/OpenGameBackend/issues/107)) ([c7a6789](https://github.com/OpenGameBackend/OpenGameBackend/commit/c7a67897c5056ac6cf7fdb00b200b617e71887da))
* release 0.1.0 ([1e2a0ca](https://github.com/OpenGameBackend/OpenGameBackend/commit/1e2a0ca23f05effe919e8aad2cdbaa316b9659f7))
* release 1.0.0-rc.1 ([8c8c34f](https://github.com/OpenGameBackend/OpenGameBackend/commit/8c8c34fb6b7ae5c05f135501da586fa76b24097f))
* remove enable from auth* configs ([#145](https://github.com/OpenGameBackend/OpenGameBackend/issues/145)) ([22132b7](https://github.com/OpenGameBackend/OpenGameBackend/commit/22132b748f0af1e2e473e20625fba65b3da4d679))
* remove placeholder db from presence ([#153](https://github.com/OpenGameBackend/OpenGameBackend/issues/153)) ([0f251d4](https://github.com/OpenGameBackend/OpenGameBackend/commit/0f251d434e2e39a3685871f6bc91efa01c82da4d))
* rename ogs to opengb ([7321766](https://github.com/OpenGameBackend/OpenGameBackend/commit/7321766cf71c54478ec38274dc8f87dcea23f975))
* rename ogs to opengb ([#51](https://github.com/OpenGameBackend/OpenGameBackend/issues/51)) ([a6fef01](https://github.com/OpenGameBackend/OpenGameBackend/commit/a6fef0114aa8f044ae74b3a06e11992a6134ba35))
* rename scripts get -&gt; fetch ([#113](https://github.com/OpenGameBackend/OpenGameBackend/issues/113)) ([01d9791](https://github.com/OpenGameBackend/OpenGameBackend/commit/01d9791b4a1955b373e7aef933b2ea67bf3ecf54))
* rename users.authenticate_user ([9c03df3](https://github.com/OpenGameBackend/OpenGameBackend/commit/9c03df3ca4dccc2b9aa77c6873fe6278724e5a1f))
* rename users.authenticate_user ([#66](https://github.com/OpenGameBackend/OpenGameBackend/issues/66)) ([9c03df3](https://github.com/OpenGameBackend/OpenGameBackend/commit/9c03df3ca4dccc2b9aa77c6873fe6278724e5a1f))
* **sandbox:** update to new rivet.json schema ([#164](https://github.com/OpenGameBackend/OpenGameBackend/issues/164)) ([20878ff](https://github.com/OpenGameBackend/OpenGameBackend/commit/20878ff1a24bf8fd50286bcd937d6b7c836df013))
* **sandobx:** clean up sdk gen ([#590](https://github.com/OpenGameBackend/OpenGameBackend/issues/590)) ([21c37a6](https://github.com/OpenGameBackend/OpenGameBackend/commit/21c37a656683dc54d31f56849e580e3fd67ab530))
* Standardize `types` folder -&gt; `utils` ([#80](https://github.com/OpenGameBackend/OpenGameBackend/issues/80)) ([1317b2b](https://github.com/OpenGameBackend/OpenGameBackend/commit/1317b2b7fefee3674751ec0f8bd91457dd25f51a))
* **tests:** move backend.json -&gt; rivet.json ([#163](https://github.com/OpenGameBackend/OpenGameBackend/issues/163)) ([f37cfdf](https://github.com/OpenGameBackend/OpenGameBackend/commit/f37cfdfde7199108458c60f68881665e2f56aca0))
* update `ctx.userConfig` -&gt; `ctx.config` ([#111](https://github.com/OpenGameBackend/OpenGameBackend/issues/111)) ([c9e0f72](https://github.com/OpenGameBackend/OpenGameBackend/commit/c9e0f72c950b267a654980de4fe0308495769a00))
* Update deno.lock and fix `tokens` import issue ([#87](https://github.com/OpenGameBackend/OpenGameBackend/issues/87)) ([0aaf9ca](https://github.com/OpenGameBackend/OpenGameBackend/commit/0aaf9ca0605f995a0474f4e512e3b0b69eb08f92))
* update imports for module.gen.ts ([#89](https://github.com/OpenGameBackend/OpenGameBackend/issues/89)) ([9db8e08](https://github.com/OpenGameBackend/OpenGameBackend/commit/9db8e0873bdb5fc25fa134b7470b9ce445704b03))
* update lobbies docs ([#148](https://github.com/OpenGameBackend/OpenGameBackend/issues/148)) ([e7cf600](https://github.com/OpenGameBackend/OpenGameBackend/commit/e7cf600216250e634c6696d3743888f99c08abe2))
* update logging ([#126](https://github.com/OpenGameBackend/OpenGameBackend/issues/126)) ([12a5cf1](https://github.com/OpenGameBackend/OpenGameBackend/commit/12a5cf19e9ae27719c5a5639a3593db3d15e97e4))
* update module list ([#155](https://github.com/OpenGameBackend/OpenGameBackend/issues/155)) ([a5c1e37](https://github.com/OpenGameBackend/OpenGameBackend/commit/a5c1e37e5171fd7922013bbb6ec7259befbef236))
* update opengb-registry -&gt; opengb-modules ([#104](https://github.com/OpenGameBackend/OpenGameBackend/issues/104)) ([99724f7](https://github.com/OpenGameBackend/OpenGameBackend/commit/99724f767c2da6a44cd6c63a88e23b93dda15b1e))
* update raw queries to use explicit schemas for OpenGB 0.2 ([#115](https://github.com/OpenGameBackend/OpenGameBackend/issues/115)) ([28f260f](https://github.com/OpenGameBackend/OpenGameBackend/commit/28f260f776111841da3240a286c2d0f1a36ed8f5))
* update sandbox ([#582](https://github.com/OpenGameBackend/OpenGameBackend/issues/582)) ([0ba04b5](https://github.com/OpenGameBackend/OpenGameBackend/commit/0ba04b59ecad5c5a18889be5dfc13767153111a3))
* update sandbox endpoint ([#588](https://github.com/OpenGameBackend/OpenGameBackend/issues/588)) ([d64816b](https://github.com/OpenGameBackend/OpenGameBackend/commit/d64816b77fa7eb0cf91416f28a2c71c7a99ee0cf))
* update uploads to read from correct env ([#130](https://github.com/OpenGameBackend/OpenGameBackend/issues/130)) ([6a7b08e](https://github.com/OpenGameBackend/OpenGameBackend/commit/6a7b08ee32f7478ec89f7c7ca531e0cd78eb7326))
* **uploads:** add missing script name ([#147](https://github.com/OpenGameBackend/OpenGameBackend/issues/147)) ([579507a](https://github.com/OpenGameBackend/OpenGameBackend/commit/579507a341016e197757365649dae5192cfbff0d))
* **user_passwords:** temporarily disable hashing to work around wasm bug ([#150](https://github.com/OpenGameBackend/OpenGameBackend/issues/150)) ([3e92580](https://github.com/OpenGameBackend/OpenGameBackend/commit/3e92580e5b344b15c8f6f945de756cd13e84069a))

## [1.0.0-rc.1](https://github.com/rivet-gg/opengb-modules/compare/v0.1.1...v1.0.0-rc.1) (2024-08-07)


### ⚠ BREAKING CHANGES

* rename scripts get -> fetch ([#113](https://github.com/rivet-gg/opengb-modules/issues/113))

### Features

* **users:** optionally return `user` in `authenticate_token` ([01d9791](https://github.com/rivet-gg/opengb-modules/commit/01d9791b4a1955b373e7aef933b2ea67bf3ecf54))


### Code Refactoring

* **rate_limit:** migrate to actors ([#116](https://github.com/rivet-gg/opengb-modules/issues/116)) ([8c83495](https://github.com/rivet-gg/opengb-modules/commit/8c83495bcb29011121eddd56540cbb11054a7530))


### Chores

* add strict compiler options ([#129](https://github.com/rivet-gg/opengb-modules/issues/129)) ([7bb4e9e](https://github.com/rivet-gg/opengb-modules/commit/7bb4e9e48874bb103a2f789f46709e9034cd72c6))
* format ([#128](https://github.com/rivet-gg/opengb-modules/issues/128)) ([6b2d0e3](https://github.com/rivet-gg/opengb-modules/commit/6b2d0e31a7e553c1d37d6872d339312b02e964be))
* release 1.0.0-rc.1 ([8c8c34f](https://github.com/rivet-gg/opengb-modules/commit/8c8c34fb6b7ae5c05f135501da586fa76b24097f))
* rename scripts get -&gt; fetch ([#113](https://github.com/rivet-gg/opengb-modules/issues/113)) ([01d9791](https://github.com/rivet-gg/opengb-modules/commit/01d9791b4a1955b373e7aef933b2ea67bf3ecf54))
* update `ctx.userConfig` -&gt; `ctx.config` ([#111](https://github.com/rivet-gg/opengb-modules/issues/111)) ([c9e0f72](https://github.com/rivet-gg/opengb-modules/commit/c9e0f72c950b267a654980de4fe0308495769a00))
* update logging ([#126](https://github.com/rivet-gg/opengb-modules/issues/126)) ([12a5cf1](https://github.com/rivet-gg/opengb-modules/commit/12a5cf19e9ae27719c5a5639a3593db3d15e97e4))
* update raw queries to use explicit schemas for OpenGB 0.2 ([#115](https://github.com/rivet-gg/opengb-modules/issues/115)) ([28f260f](https://github.com/rivet-gg/opengb-modules/commit/28f260f776111841da3240a286c2d0f1a36ed8f5))
* update uploads to read from correct env ([#130](https://github.com/rivet-gg/opengb-modules/issues/130)) ([6a7b08e](https://github.com/rivet-gg/opengb-modules/commit/6a7b08ee32f7478ec89f7c7ca531e0cd78eb7326))

## [0.1.1](https://github.com/rivet-gg/opengb-modules/compare/v0.1.0...v0.1.1) (2024-06-10)


### Chores

* add metadata for uploads module ([#108](https://github.com/rivet-gg/opengb-modules/issues/108)) ([4ef61d5](https://github.com/rivet-gg/opengb-modules/commit/4ef61d5999b6c33fbf5101c523d66995435a03f8))

## 0.1.0 (2024-06-10)


### Features

* **CI:** Create CI for testing all modules based on a known-good engine commit ([a9d20d0](https://github.com/rivet-gg/opengb-modules/commit/a9d20d05221cff1673eb8baed319fabb34406c6c))
* **CI:** Create CI for testing all modules based on a known-good engine commit ([#56](https://github.com/rivet-gg/opengb-modules/issues/56)) ([9d0a07d](https://github.com/rivet-gg/opengb-modules/commit/9d0a07d7080e119779044bcada8c7c436d5ded74))
* Create `uploads` module ([#76](https://github.com/rivet-gg/opengb-modules/issues/76)) ([442cbb3](https://github.com/rivet-gg/opengb-modules/commit/442cbb3ff1669774f1ba614400b1fe7584c581cd))
* **currency:** Add tests for currency module ([b148e99](https://github.com/rivet-gg/opengb-modules/commit/b148e995a012e104d3ff7fa24056170fd74b8f73))
* **currency:** Add tests for currency module ([#47](https://github.com/rivet-gg/opengb-modules/issues/47)) ([c898d1f](https://github.com/rivet-gg/opengb-modules/commit/c898d1f85e531937586de9e9d35e72fa29cddb13))
* impl basic auth ([#62](https://github.com/rivet-gg/opengb-modules/issues/62)) ([a2a1150](https://github.com/rivet-gg/opengb-modules/commit/a2a11506173d0818d19eb4fb6b06eab1ef1b1da4))
* impl rate limit ([#63](https://github.com/rivet-gg/opengb-modules/issues/63)) ([04f7685](https://github.com/rivet-gg/opengb-modules/commit/04f7685a6f06e497fdafce2930b62e90384bf866))
* **tokens:** Add script to extend token life ([#73](https://github.com/rivet-gg/opengb-modules/issues/73)) ([ad1b37d](https://github.com/rivet-gg/opengb-modules/commit/ad1b37d23bb642373c3d5402f693fbf2dfb73151))
* update readme ([9c03df3](https://github.com/rivet-gg/opengb-modules/commit/9c03df3ca4dccc2b9aa77c6873fe6278724e5a1f))


### Bug Fixes

* add dependencies ([fe5c663](https://github.com/rivet-gg/opengb-modules/commit/fe5c663e48efb539a1dca2ead1c7b6dc3363f0e3))
* add dependencies ([#59](https://github.com/rivet-gg/opengb-modules/issues/59)) ([8e5fbca](https://github.com/rivet-gg/opengb-modules/commit/8e5fbca24703f7bed040bc831eb580754a50c883))
* **auth.auth_email_passwordless:** fix broken login functionality ([#85](https://github.com/rivet-gg/opengb-modules/issues/85)) ([8fb6f44](https://github.com/rivet-gg/opengb-modules/commit/8fb6f445e9a5b441235cbc94504b4c88d1795732))
* **currency:** add in missing await ([2fd29b4](https://github.com/rivet-gg/opengb-modules/commit/2fd29b441c95c2c0586712d2ef4f14cb117e0d1f))
* **currency:** Fix tests + make errors more consistent ([596c668](https://github.com/rivet-gg/opengb-modules/commit/596c668783c8d18b6bcd8bf57775d1110c6a4cb2))
* **currency:** Fix tests + make errors more consistent ([#58](https://github.com/rivet-gg/opengb-modules/issues/58)) ([cb0f9c5](https://github.com/rivet-gg/opengb-modules/commit/cb0f9c580318be4340550757cd26c8e5d06c20f9))
* **currency:** Rename expected error codes in `currency` tests to fit with the correct casing ([#75](https://github.com/rivet-gg/opengb-modules/issues/75)) ([dd6b2bd](https://github.com/rivet-gg/opengb-modules/commit/dd6b2bddbadf780bbaf6646a904c2a78f1e7b98d))
* **currency:** test casing ([f28b9c0](https://github.com/rivet-gg/opengb-modules/commit/f28b9c0ddbb69fcc092dfff12a18707065a69251))
* **currency:** test casing ([#54](https://github.com/rivet-gg/opengb-modules/issues/54)) ([84e2926](https://github.com/rivet-gg/opengb-modules/commit/84e2926c2f9e00d9f9b36cb0737672041a902bb7))
* format ([936a850](https://github.com/rivet-gg/opengb-modules/commit/936a8507d7d84904e1bb585275fb2304b1ed2774))
* format ([#60](https://github.com/rivet-gg/opengb-modules/issues/60)) ([cd58433](https://github.com/rivet-gg/opengb-modules/commit/cd584338097f61632345feaee2fa709eb6123b64))
* import urls in tests ([#46](https://github.com/rivet-gg/opengb-modules/issues/46)) ([1361b9a](https://github.com/rivet-gg/opengb-modules/commit/1361b9a951c19ffdfb9422161dec2b91c8e69ce3))
* temporary disable rate limit ([#101](https://github.com/rivet-gg/opengb-modules/issues/101)) ([b9171fa](https://github.com/rivet-gg/opengb-modules/commit/b9171fa5fda1f1b854083f6d79c5b7f5d62fc794))
* tests ([#67](https://github.com/rivet-gg/opengb-modules/issues/67)) ([b5c0823](https://github.com/rivet-gg/opengb-modules/commit/b5c082379c7dc9ba0e97c2cb0f3a53062573f004))
* wrong import in rate_limit.throttle ([#65](https://github.com/rivet-gg/opengb-modules/issues/65)) ([2f15035](https://github.com/rivet-gg/opengb-modules/commit/2f15035fd793e0d2d80007df5091ac7df31670a6))


### Continuous Integration

* add release-please github action ([679fed7](https://github.com/rivet-gg/opengb-modules/commit/679fed74f41ba3c9069b2b82d3cf8ea570341103))


### Chores

* add `dependencies` to existing modules ([e18ba64](https://github.com/rivet-gg/opengb-modules/commit/e18ba64bd45d246dbcd8bfaf1f104208c4408a7f))
* add `dependencies` to existing modules ([#55](https://github.com/rivet-gg/opengb-modules/issues/55)) ([83ce5b8](https://github.com/rivet-gg/opengb-modules/commit/83ce5b8189509efebf6b09f7719b5d4a47b3747f))
* bootstrap releases for path: . ([#105](https://github.com/rivet-gg/opengb-modules/issues/105)) ([9582f3a](https://github.com/rivet-gg/opengb-modules/commit/9582f3abaee7d49914bd3fae380e7d2cdff3f08b))
* Convert old modules to camelCase and register `RuntimeErrors` ([116761f](https://github.com/rivet-gg/opengb-modules/commit/116761f07b8b323baa99c05e1db31d166fca1656))
* Convert old modules to camelCase and register `RuntimeErrors` ([#52](https://github.com/rivet-gg/opengb-modules/issues/52)) ([035a138](https://github.com/rivet-gg/opengb-modules/commit/035a138ebfb00f41a2bc06f8772603eb8ff4ce06))
* fix modules ([794dbeb](https://github.com/rivet-gg/opengb-modules/commit/794dbeb6668a528467ff8a79581e12edc9443c2b))
* fix modules ([#45](https://github.com/rivet-gg/opengb-modules/issues/45)) ([fff4081](https://github.com/rivet-gg/opengb-modules/commit/fff4081aa1d6c326185e50e7c567c8d21e9e2124))
* make errors lowercase ([#64](https://github.com/rivet-gg/opengb-modules/issues/64)) ([cc9b388](https://github.com/rivet-gg/opengb-modules/commit/cc9b3880acb3102e37dbde8154c7a44000232e1d))
* Migrate all existing tests and modules to `camelCase` and fix some lint errors ([fff6345](https://github.com/rivet-gg/opengb-modules/commit/fff6345bda73fb991425d05e3f821ffc8b34106c))
* Migrate all existing tests and modules to `camelCase` and fix some lint errors ([#61](https://github.com/rivet-gg/opengb-modules/issues/61)) ([174206b](https://github.com/rivet-gg/opengb-modules/commit/174206b85747cb5e9392a0db20719623efb317a8))
* migrate from yaml to json ([#103](https://github.com/rivet-gg/opengb-modules/issues/103)) ([54ce087](https://github.com/rivet-gg/opengb-modules/commit/54ce08766d477ce332c9f41b97f058ca921da189))
* migrate modules from ogse ([6fa408e](https://github.com/rivet-gg/opengb-modules/commit/6fa408e9f3f2d081a9d16ab38deb7e89184761df))
* migrate modules from ogse ([#44](https://github.com/rivet-gg/opengb-modules/issues/44)) ([a99d546](https://github.com/rivet-gg/opengb-modules/commit/a99d5462c9b57a1b9274d517c0ffac0d2b293bee))
* re-enable rate_limit module ([#107](https://github.com/rivet-gg/opengb-modules/issues/107)) ([c7a6789](https://github.com/rivet-gg/opengb-modules/commit/c7a67897c5056ac6cf7fdb00b200b617e71887da))
* release 0.1.0 ([1e2a0ca](https://github.com/rivet-gg/opengb-modules/commit/1e2a0ca23f05effe919e8aad2cdbaa316b9659f7))
* rename ogs to opengb ([7321766](https://github.com/rivet-gg/opengb-modules/commit/7321766cf71c54478ec38274dc8f87dcea23f975))
* rename ogs to opengb ([#51](https://github.com/rivet-gg/opengb-modules/issues/51)) ([a6fef01](https://github.com/rivet-gg/opengb-modules/commit/a6fef0114aa8f044ae74b3a06e11992a6134ba35))
* rename users.authenticate_user ([9c03df3](https://github.com/rivet-gg/opengb-modules/commit/9c03df3ca4dccc2b9aa77c6873fe6278724e5a1f))
* rename users.authenticate_user ([#66](https://github.com/rivet-gg/opengb-modules/issues/66)) ([9c03df3](https://github.com/rivet-gg/opengb-modules/commit/9c03df3ca4dccc2b9aa77c6873fe6278724e5a1f))
* Standardize `types` folder -&gt; `utils` ([#80](https://github.com/rivet-gg/opengb-modules/issues/80)) ([1317b2b](https://github.com/rivet-gg/opengb-modules/commit/1317b2b7fefee3674751ec0f8bd91457dd25f51a))
* Update deno.lock and fix `tokens` import issue ([#87](https://github.com/rivet-gg/opengb-modules/issues/87)) ([0aaf9ca](https://github.com/rivet-gg/opengb-modules/commit/0aaf9ca0605f995a0474f4e512e3b0b69eb08f92))
* update imports for module.gen.ts ([#89](https://github.com/rivet-gg/opengb-modules/issues/89)) ([9db8e08](https://github.com/rivet-gg/opengb-modules/commit/9db8e0873bdb5fc25fa134b7470b9ce445704b03))
* update opengb-registry -&gt; opengb-modules ([#104](https://github.com/rivet-gg/opengb-modules/issues/104)) ([99724f7](https://github.com/rivet-gg/opengb-modules/commit/99724f767c2da6a44cd6c63a88e23b93dda15b1e))
