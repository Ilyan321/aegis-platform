import hashlib
import hmac
import os
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings


def mask_secret(secret: str) -> str:
    """
    Masks a raw credential, preserving the first 4 characters for operator identification
    while replacing the remainder with asterisks.
    """
    if not secret:
        return ""
    if len(secret) <= 4:
        return "****"
    # Show first 4 characters, mask remaining characters (min 16 asterisks for display clarity)
    mask_len = max(len(secret) - 4, 16)
    return secret[:4] + ("*" * mask_len)


def compute_blind_index(secret: str) -> str:
    """
    Computes a deterministic cryptographic HMAC-SHA256 blind index using an environment pepper.
    Enables fast indexed lookups in PostgreSQL without ever decrypting or storing plaintext.
    """
    if not secret:
        return ""
    pepper = settings.AEGIS_BLIND_PEPPER.encode("utf-8")
    return hmac.new(pepper, secret.encode("utf-8"), hashlib.sha256).hexdigest()


def compute_incident_fingerprint(
    repository_id: str,
    rule_id: str,
    file_path: str,
    secret_hash: str,
) -> str:
    """
    Computes an immutable, deterministic incident fingerprint:
    SHA256(repository_id + ":" + rule_id + ":" + normalized_path + ":" + secret_hash).
    Prevents duplicate ticket generation across branches or repeated commits.
    """
    normalized_path = file_path.replace("\\", "/").lstrip("./")
    raw_key = f"{repository_id}:{rule_id}:{normalized_path}:{secret_hash}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _get_aes_key() -> bytes:
    """Converts the 64-char hex master key into a 32-byte binary key."""
    hex_key = settings.AEGIS_MASTER_KEY.strip()
    try:
        key_bytes = bytes.fromhex(hex_key)
        if len(key_bytes) != 32:
            # Hash to derive 32 bytes if length doesn't match
            return hashlib.sha256(hex_key.encode("utf-8")).digest()
        return key_bytes
    except ValueError:
        return hashlib.sha256(hex_key.encode("utf-8")).digest()


def encrypt_secret(raw_secret: str) -> bytes:
    """
    Encrypts a raw secret using authenticated AES-256-GCM.
    Prepends a 12-byte random nonce to the ciphertext.
    """
    if not raw_secret:
        return b""
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # Standard 96-bit nonce for AES-GCM
    ciphertext = aesgcm.encrypt(nonce, raw_secret.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt_secret(encrypted_blob: bytes) -> Optional[str]:
    """
    Decrypts an AES-256-GCM encrypted blob (12-byte nonce + ciphertext).
    Returns the original UTF-8 plaintext string.
    """
    if not encrypted_blob or len(encrypted_blob) <= 12:
        return None
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    nonce = encrypted_blob[:12]
    ciphertext = encrypted_blob[12:]
    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode("utf-8")
    except Exception:
        return None
