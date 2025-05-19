#!/bin/bash

set -e

APP_NAME="babycall"
BUILD_DIR="$(pwd)/builds/${APP_NAME}.app/Contents"
RESOURCES_DIR="$(pwd)/resources"
BIN_OUTPUT="${BUILD_DIR}/MacOS"
INFO_PLIST_SRC="${RESOURCES_DIR}/Info.plist"
ICON_SRC="${RESOURCES_DIR}/apple-icon.icns"
ICON_DEST="${BUILD_DIR}/Resources"
BINARY_NAME="${APP_NAME}"
LAUNCHER="${BIN_OUTPUT}/launcher"
ANSI_GREEN_TEXT='\033[0;32m'
ANSI_YELLOW_TEXT='\033[0;33m'
ANSI_RED_TEXT='\033[0;31m'
ANSI_RESET_TEXT='\033[0m'

# Create folders structure
mkdir -p "${BIN_OUTPUT}" "${ICON_DEST}"

# Generate binary with pkg
if NODE_NO_WARNINGS=1 pkg . --targets node16-macos-x64 --output "${BIN_OUTPUT}/${BINARY_NAME}"; then
    printf "${ANSI_GREEN_TEXT}✔${ANSI_RESET_TEXT} Binary generated correctly\n"
else
    printf "${ANSI_RED_TEXT}✖${ANSI_RESET_TEXT} Error generating the binary\n"
    exit 1
fi

# Copy Info.plist
if cp "${INFO_PLIST_SRC}" "${BUILD_DIR}/"; then
    printf "${ANSI_GREEN_TEXT}✔${ANSI_RESET_TEXT} Info.plist copied correctly\n"
else
    printf "${ANSI_RED_TEXT}✖${ANSI_RESET_TEXT} Error copying Info.plist\n"
    exit 1
fi

# Copy icon
if cp "${ICON_SRC}" "${ICON_DEST}/"; then
    printf "${ANSI_GREEN_TEXT}✔${ANSI_RESET_TEXT} Icon copied correctly\n"
else
    printf "${ANSI_RED_TEXT}✖${ANSI_RESET_TEXT} Error copying the icon\n"
    exit 1
fi

# Create launcher that opens the binary in Terminal
cat > "$LAUNCHER" <<EOF
#!/bin/bash
/usr/bin/osascript <<EOT
tell application "iTerm"
    activate
    repeat until (count of windows) > 0
        delay 0.1
    end repeat
    tell current session of current window
        write text "cd \"$BIN_OUTPUT\"; exec ./${BINARY_NAME}"
    end tell
end tell
EOT
EOF


chmod +x "$LAUNCHER" || {
  printf "${ANSI_RED_TEXT}✖ Error assigning permissions to the launcher\n"
  exit 1
}

printf "${ANSI_GREEN_TEXT}✅ ${ANSI_RESET_TEXT}Application ${APP_NAME}.app created successfully in builds/\n"
