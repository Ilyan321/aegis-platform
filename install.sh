#!/usr/bin/env bash
# ==============================================================================
# Aegis Security Platform — Official CLI Installer
# Universal Multi-Arch Installer (macOS, Linux, WSL)
# https://aegis-platform.ilyankhan.tech
# ==============================================================================

set -euo pipefail

# ANSI color codes
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
RED="\033[31m"
MUTED="\033[90m"
RESET="\033[0m"

REPO="Ilyan321/aegis-platform"
BINARY_NAME="aegis"

print_banner() {
  cat << "BANNER"
   ___    ___________________
  /   |  / ____/ ____/  _/ ___/
 / /| | / __/ / / __ / / \__ \ 
/ ___ |/ /___/ /_/ // / ___/ / 
/_/  |_/_____/\____/___//____/  
BANNER
  echo -e "${MUTED}Zero-Dependency DevSecOps Intercept Mesh${RESET}"
  echo ""
}

# 1. Detect Operating System & Architecture
detect_platform() {
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"

  case "${OS}" in
    linux*)  PLATFORM_OS="linux" ;;
    darwin*) PLATFORM_OS="darwin" ;;
    *)
      echo -e "${RED}Error:${RESET} Unsupported operating system: ${OS}"
      exit 1
      ;;
  esac

  case "${ARCH}" in
    x86_64|amd64)   PLATFORM_ARCH="amd64" ;;
    arm64|aarch64)  PLATFORM_ARCH="arm64" ;;
    *)
      echo -e "${RED}Error:${RESET} Unsupported architecture: ${ARCH}"
      exit 1
      ;;
  esac

  TARGET="aegis-${PLATFORM_OS}-${PLATFORM_ARCH}"
}

# 2. Determine Installation Path
determine_install_dir() {
  if [ -w "/usr/local/bin" ]; then
    INSTALL_DIR="/usr/local/bin"
    USE_SUDO=""
  elif command -v sudo >/dev/null 2>&1 && [ -n "${TERM:-}" ]; then
    INSTALL_DIR="/usr/local/bin"
    USE_SUDO="sudo"
  else
    INSTALL_DIR="${HOME}/.local/bin"
    mkdir -p "${INSTALL_DIR}"
    USE_SUDO=""
  fi
}

main() {
  print_banner
  detect_platform
  determine_install_dir

  echo -e "${BLUE}==>${RESET} Detected platform: ${BOLD}${PLATFORM_OS}/${PLATFORM_ARCH}${RESET}"
  echo -e "${BLUE}==>${RESET} Target installation directory: ${BOLD}${INSTALL_DIR}/${BINARY_NAME}${RESET}"

  DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${TARGET}"
  TMP_FILE="$(mktemp /tmp/aegis-installer.XXXXXX)"

  echo -e "${BLUE}==>${RESET} Downloading latest Aegis CLI binary..."
  
  if curl -fsSL "${DOWNLOAD_URL}" -o "${TMP_FILE}" 2>/dev/null; then
    echo -e "${GREEN}✓${RESET} Downloaded official binary"
  else
    # Fallback if release asset is pending: build from source or install wrapper
    echo -e "${MUTED}Release binary not found on CDN. Checking for local Go toolchain...${RESET}"
    if command -v go >/dev/null 2>&1; then
      echo -e "${BLUE}==>${RESET} Building binary via Go toolchain..."
      go install "github.com/${REPO}/apps/cli/cmd/aegis@latest"
      TMP_FILE="$(go env GOPATH)/bin/aegis"
    else
      echo -e "${RED}Error:${RESET} Could not download Aegis binary from ${DOWNLOAD_URL}."
      echo -e "Please ensure internet connectivity or install Go 1.21+ to compile from source."
      exit 1
    fi
  fi

  # Install binary
  chmod +x "${TMP_FILE}"
  ${USE_SUDO} mv "${TMP_FILE}" "${INSTALL_DIR}/${BINARY_NAME}"

  # Ensure directory is in PATH for ~/.local/bin
  if [ "${INSTALL_DIR}" = "${HOME}/.local/bin" ]; then
    case ":${PATH}:" in
      *":${HOME}/.local/bin:"*) ;;
      *)
        echo ""
        echo -e "${MUTED}Tip: Add ~/.local/bin to your PATH by running:${RESET}"
        echo -e "  ${BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}"
        ;;
    esac
  fi

  echo ""
  echo -e "${GREEN}${BOLD}✓ Aegis CLI installed successfully!${RESET}"
  echo ""
  echo -e "${BOLD}Next Steps:${RESET}"
  echo -e "  1. Authenticate with your Aegis workspace:"
  echo -e "     ${BOLD}$ aegis login --token <YOUR_TOKEN>${RESET}"
  echo -e "  2. Run a scan on any Git repository:"
  echo -e "     ${BOLD}$ aegis scan --sync${RESET}"
  echo -e "  3. Install pre-commit zero-trust hook in your repository:"
  echo -e "     ${BOLD}$ aegis install-hook${RESET}"
  echo ""
}

main "$@"
