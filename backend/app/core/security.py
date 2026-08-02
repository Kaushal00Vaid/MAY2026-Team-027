from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter instance — attach to app.state.limiter in app factory
limiter = Limiter(key_func=get_remote_address, default_limits=[])
