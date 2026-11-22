TARGET := iphone:clang:latest:14.0
SDK = iPhoneOS14.5
ARCHS = arm64
INSTALL_TARGET_PROCESSES = Discord
THEOS_PACKAGE_SCHEME = rootless
FINALPACKAGE = 1

include $(THEOS)/makefiles/common.mk

TWEAK_NAME = Solcord

Solcord_FILES = $(wildcard Sources/*.x Sources/*.xm Sources/*.m Sources/*.mm Sources/**/*.x Sources/**/*.xm Sources/**/*.m Sources/**/*.mm)
Solcord_CFLAGS = -fobjc-arc -DPACKAGE_VERSION='@"$(THEOS_PACKAGE_BASE_VERSION)"' -I$(THEOS_PROJECT_DIR)/Headers
Solcord_CCFLAGS = -std=c++17 -Wno-c++11-narrowing -I$(THEOS_PROJECT_DIR)/Headers
Solcord_FRAMEWORKS = Foundation UIKit CoreGraphics CoreText CoreFoundation QuartzCore UniformTypeIdentifiers Security AuthenticationServices
Solcord_LDFLAGS = -undefined dynamic_lookup

# The key signed bundle releases are checked with (bundle/scripts/sign-release.mjs). SOLCORD_REQUIRE_SIGNED=1 also refuses
# a published bundle that has no signed release.
SOLCORD_RELEASE_KEY ?= $(shell cat $(THEOS_PROJECT_DIR)/../bundle/release-key.pub)
Solcord_CFLAGS += -DSOLCORD_RELEASE_KEY='@"$(SOLCORD_RELEASE_KEY)"'
ifdef SOLCORD_REQUIRE_SIGNED
Solcord_CFLAGS += -DSOLCORD_REQUIRE_SIGNED=1
endif

# A custom bundle link (loader.json, the recovery menu) is taken only by builds made with this: a developer's, and the
# simulator test's. A release build loads the published, signed bundle only
ifdef SOLCORD_ALLOW_CUSTOM_BUNDLE
Solcord_CFLAGS += -DSOLCORD_ALLOW_CUSTOM_BUNDLE=1
endif

# The simulator test's build (Tests/run.sh) downloads the bundle from its own server
ifdef SOLCORD_BUNDLE_URL
Solcord_CFLAGS += -DSOLCORD_BUNDLE_URL='@"$(SOLCORD_BUNDLE_URL)"'
endif

include $(THEOS_MAKE_PATH)/tweak.mk

after-stage::
	$(ECHO_NOTHING)find $(THEOS_STAGING_DIR) -name ".DS_Store" -delete$(ECHO_END)
