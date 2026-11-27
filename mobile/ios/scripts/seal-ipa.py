#!/usr/bin/env python3
"""Seal the completed IPA before delivery; device signing is still performed by the user's sideloading tool."""
import argparse
import pathlib
import plistlib
import re
import subprocess
import sys

MACHO_MAGIC = {bytes.fromhex(value) for value in ('cffaedfe','feedfacf','cefaedfe','feedface','cafebabe','bebafeca','cafebabf','bfbafeca')}

def invoke(*arguments):
    subprocess.run(arguments, check=True)

def signing_identifier(item):
    container = item if item.is_dir() else item.parent
    info = container / "Info.plist"
    identifier = None
    if info.is_file():
        with info.open("rb") as stream:
            identifier = plistlib.load(stream).get("CFBundleIdentifier")
    if not isinstance(identifier, str) or not re.fullmatch(r"[A-Za-z0-9._-]{1,200}", identifier):
        identifier = "site.solcord.temporary." + re.sub(r"[^A-Za-z0-9._-]", "_", item.name)[:120]
    return identifier

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('app', type=pathlib.Path)
    options = parser.parse_args()
    app = options.app.resolve()
    if not app.is_dir() or app.suffix != '.app':
        parser.error('Expected the completed .app directory')
    binaries = []
    for file in sorted(app.rglob('*')):
        if not file.is_file() or file.is_symlink():
            continue
        with file.open('rb') as stream:
            if stream.read(4) in MACHO_MAGIC:
                binaries.append(file)
    if not binaries:
        raise RuntimeError('No Mach-O executables found in the app')
    containers = [file for file in app.rglob('*') if file.is_dir() and file.suffix in ('.framework','.appex','.xpc','.app')]
    containers.sort(key=lambda file: len(file.parts), reverse=True)
    containers.append(app)
    for item in [*binaries, *containers]:
        identifier = signing_identifier(item)
        # An App Store designated requirement cannot be satisfied by a temporary ad-hoc signature.
        # Replace it explicitly; the user's sideloading tool later signs with device provisioning.
        requirement = '=designated => identifier "' + identifier + '"'
        invoke('codesign','--force','--sign','-','--timestamp=none','--generate-entitlement-der','--preserve-metadata=entitlements','--identifier',identifier,'--requirements',requirement,str(item))
    for item in [*binaries, *containers]:
        invoke('codesign','--verify','--strict','--verbose=2',str(item))
    invoke('codesign','--verify','--deep','--strict','--verbose=2',str(app))
    print('Final temporary signatures and resource seals verified.')
    print('Mach-O files verified: ' + str(len(binaries)))
    print('App/framework/extension bundles verified: ' + str(len(containers)))
    print('No resources may be changed after this step without re-signing.')
    print('No Apple device provisioning is included. Use Apple ID Sideload in Sideloadly to sign for your own device.')

if __name__ == '__main__':
    main()
