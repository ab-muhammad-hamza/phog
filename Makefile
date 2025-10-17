.DEFAULT_GOAL := all

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------
DIST_DIR := dist
BUILD_TEMP_DIR := .build_temp
FRAMEWORK_NAME := phog

# NOTE: phog/env.js has been removed from this list, which is correct for the build.
PHOG_SRC_FILES := \
    phog/core.js \
    phog/component.js \
    phog/router.js

# Paths for bundled and minified framework files
PHOG_BUNDLED_FILE := $(DIST_DIR)/$(FRAMEWORK_NAME).js
PHOG_MINIFIED_FILE := $(DIST_DIR)/$(FRAMEWORK_NAME).min.js

# Source files for the build process (will point to the temp directory)
PHOG_BUILD_SRC_FILES := $(patsubst %,$(BUILD_TEMP_DIR)/%,$(PHOG_SRC_FILES))
JS_PHOG_SRC_FILES := $(foreach file,$(PHOG_BUILD_SRC_FILES),'$(file)',)

# All other source assets to be processed
SRC_ASSETS := $(shell find src -type f \( -name "*.js" -o -name "*.css" \))

# Cross-platform compatible sed command
ifeq ($(shell uname), Darwin)
	SED_INPLACE = sed -i ""
else
	SED_INPLACE = sed -i
endif

# -----------------------------------------------------------------------------
# Main Targets
# -----------------------------------------------------------------------------
all: build

build: clean check-tools
	@printf "[ BUILD ] Starting Phog build process\n"

	@printf "  + Creating distribution directory...\n"
	@mkdir -p $(DIST_DIR)

	# --- New Step: Prepare JS files for production ---
	@printf "  + Preparing framework scripts for production...\n"
	@mkdir -p $(BUILD_TEMP_DIR)/phog
	@cp $(PHOG_SRC_FILES) $(BUILD_TEMP_DIR)/phog/
	@# Comment out the runtime .env loading in core.js
	@$(SED_INPLACE) 's/await this.loadEnv();/\/\/ await this.loadEnv();/' $(BUILD_TEMP_DIR)/phog/core.js
	@# Remove env processing calls, as the Makefile handles this for builds
	@$(SED_INPLACE) -e 's/html = this.processEnvVariables(html);//g' $(BUILD_TEMP_DIR)/phog/router.js
	@$(SED_INPLACE) 's/let rendered = this.processEnvVariables(template);/let rendered = template;/' $(BUILD_TEMP_DIR)/phog/component.js
	
	@printf "  + Bundling and minifying Phog framework...\n"
	@node -e "\
const fs = require('fs');\
const path = require('path');\
const distDir = '$(DIST_DIR)';\
const bundledFile = path.resolve('$(PHOG_BUNDLED_FILE)');\
const srcFiles = [$(JS_PHOG_SRC_FILES)];\
const absSrcFiles = srcFiles.map(f => path.resolve(f));\
let content = '';\
absSrcFiles.forEach(file => {\
  if (!fs.existsSync(file)) { console.error('File not found:', file); process.exit(1); }\
  content += fs.readFileSync(file, 'utf8') + '\n';\
});\
fs.writeFileSync(bundledFile, content);\
"
	@npx esbuild "$(PHOG_BUNDLED_FILE)" --minify --outfile="$(PHOG_MINIFIED_FILE)" > /dev/null 2>&1
	@rm "$(PHOG_BUNDLED_FILE)"

	@printf "  + Processing main HTML file...\n"
	@cp index.html $(DIST_DIR)/
	@$(SED_INPLACE) \
		-e '/<script src=".\/phog\/.*\.js"><\/script>/d' \
		-e 's|</body>|    <script src="phog.min.js"></script>\n</body>|' \
		$(DIST_DIR)/index.html

	@printf "  + Processing application source assets...\n"
	@if [ -n "$(SRC_ASSETS)" ]; then \
		npx esbuild $(SRC_ASSETS) --minify --outbase=. --outdir=$(DIST_DIR) > /dev/null 2>&1; \
	fi
	@rsync -a --prune-empty-dirs --exclude='*.js' --exclude='*.css' src $(DIST_DIR)/ > /dev/null 2>&1

	@printf "  + Injecting environment variables...\n"
	@if [ -f .env ]; then \
		ALL_HTML_FILES=$$(find $(DIST_DIR) -type f -name "*.html"); \
		for file in $$ALL_HTML_FILES; do \
			if [ -f $$file ]; then \
				grep -v '^#' .env | grep '=' | while IFS='=' read -r key value; do \
					unquoted_value=$$(echo "$$value" | sed -e 's/^"//' -e 's/"$$//' -e "s/^'//" -e "s/'$$//"); \
					escaped_value=$$(printf '%s\n' "$$unquoted_value" | sed -e 's/[\\,&]/\\&/g'); \
					$(SED_INPLACE) "s,{{\s*env.$${key}\s*}},$${escaped_value},g" "$$file"; \
				done; \
			fi; \
		done; \
	else \
		printf "    - .env file not found, skipping injection.\n"; \
	fi

	@printf "  + Cleaning up temporary files...\n"
	@rm -rf $(BUILD_TEMP_DIR)

	@printf "[ SUCCESS ] Build complete. Artifacts are in the '$(DIST_DIR)' directory.\n"

clean:
	@printf "[ CLEAN ] Removing distribution and temporary directories...\n"
	@rm -rf $(DIST_DIR) $(BUILD_TEMP_DIR)

# -----------------------------------------------------------------------------
# Prerequisite Checks
# -----------------------------------------------------------------------------
check-tools:
	@if ! command -v node >/dev/null 2>&1 || ! command -v npx >/dev/null 2>&1; then \
		printf "[ ERROR ] Node.js and npx are required for the build process.\n"; \
		printf "  > Please install Node.js from https://nodejs.org and try again.\n"; \
		exit 1; \
	fi
	@if ! command -v sed >/dev/null 2>&1; then \
		printf "[ ERROR ] 'sed' command is required but not found.\n"; \
		printf "  > Please install 'sed' and try again. It is usually included in 'gnu-sed' on macOS.\n"; \
		exit 1; \
	fi
	@if ! command -v rsync >/dev/null 2>&1; then \
		printf "[ ERROR ] 'rsync' command is required but not found.\n"; \
		printf "  > Please install 'rsync' and try again.\n"; \
		exit 1; \
	fi
	@if ! command -v awk >/dev/null 2>&1; then \
		printf "[ ERROR ] 'awk' command is required but not found.\n"; \
		printf "  > Please install 'awk' and try again.\n"; \
		exit 1; \
	fi

.PHONY: all build clean check-tools