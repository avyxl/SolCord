# iPhone signing

The generated IPA is prepared for re-signing. Final temporary signatures and resource seals are checked after all app changes. The build does not use an Apple certificate or a device provisioning profile.

In Sideloadly, select Apple ID Sideload and enter your Apple ID in Sideloadly itself. Normal Install cannot provision this IPA for a stock iPhone. Do not send Apple ID passwords or verification codes to the Solcord developer.

Signing-Checks.txt accompanies the build artifact. It verifies package integrity, not installation or operation on a physical iPhone.
