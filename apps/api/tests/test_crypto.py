import pytest
from app.core.crypto import (
    compute_blind_index,
    compute_incident_fingerprint,
    decrypt_secret,
    encrypt_secret,
)


def test_encryption_and_decryption_roundtrip():
    secret_value = "AKIAIOSFODNN7EXAMPLE"
    encrypted_b64 = encrypt_secret(secret_value)

    assert encrypted_b64 != secret_value.encode("utf-8")
    assert isinstance(encrypted_b64, bytes)
    assert len(encrypted_b64) > 12

    decrypted = decrypt_secret(encrypted_b64)
    assert decrypted == secret_value


def test_blind_index_determinism_and_uniqueness():
    token_a = "ghp_xxxxxxxxxxxxxxxxxxxx"
    token_b = "ghp_yyyyyyyyyyyyyyyyyyyy"

    hash_a1 = compute_blind_index(token_a)
    hash_a2 = compute_blind_index(token_a)
    hash_b = compute_blind_index(token_b)

    # Deterministic
    assert hash_a1 == hash_a2
    # Distinct
    assert hash_a1 != hash_b
    assert len(hash_a1) == 64


def test_incident_fingerprint_generation():
    repo_id = "00000000-0000-0000-0000-000000000001"
    rule_id = "AWS_ACCESS_KEY"
    file_path = "src/config.py"
    secret_hash = "abcdef0123456789"

    fp1 = compute_incident_fingerprint(repo_id, rule_id, file_path, secret_hash)
    fp2 = compute_incident_fingerprint(repo_id, rule_id, file_path, secret_hash)
    fp_different = compute_incident_fingerprint(repo_id, rule_id, "src/other.py", secret_hash)

    assert fp1 == fp2
    assert fp1 != fp_different
    assert len(fp1) == 64


def test_token_b64_encryption_and_user_model_integration():
    from app.core.crypto import encrypt_token_b64, decrypt_token_b64
    from app.models.user import User

    raw_token = "gho_SuperSecretGitHubAccessToken1234567890"
    encrypted_str = encrypt_token_b64(raw_token)

    assert encrypted_str is not None
    assert encrypted_str != raw_token
    assert isinstance(encrypted_str, str)

    decrypted = decrypt_token_b64(encrypted_str)
    assert decrypted == raw_token

    # Test backward compatibility fallback on plaintext
    legacy_plaintext = "gho_legacy_token"
    assert decrypt_token_b64(legacy_plaintext) == legacy_plaintext

    # Test User model methods
    user = User(email="test_token@example.com")
    user.set_github_token(raw_token)
    assert user.github_access_token != raw_token
    assert user.get_github_token() == raw_token

