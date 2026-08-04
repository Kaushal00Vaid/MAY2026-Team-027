import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError


_argon2 = PasswordHasher()


def hash_password(plain: str) -> str:
    """Hash a password with Argon2id for newly created credentials."""
    return _argon2.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify Argon2id hashes while retaining compatibility with legacy bcrypt hashes."""
    if hashed.startswith("$2"):
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except ValueError:
            return False

    try:
        return _argon2.verify(hashed, plain)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False
