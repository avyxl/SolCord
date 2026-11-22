# Solcord iOS build

The iOS loader must be compiled with Apple SDKs on macOS. The repository workflow .github/workflows/solcord-mobile-ios.yml builds it with Theos, injects it into the pinned base IPA, embeds this mobile client and uploads the resulting Solcord.ipa as a workflow artifact.

The workflow does not publish a release or require your private update signing key. It embeds the existing owner public key and only accepts signed future network updates. The client bundled inside the IPA works for first launch without a published mobile feed.

The generated IPA must be signed for your own device through your chosen sideloading method. Compilation does not supply an Apple distribution certificate or guarantee a successful device launch.
