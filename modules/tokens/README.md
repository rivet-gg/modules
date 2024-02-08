# tokens

## FAQ

### Why not use JWTs?

**Performance**

JWTs are often touted as better performing since you can cryptographically validate them. However, you still need to check the database to see if the token is expired, which is just as slow as handling normal tokens. Opt for better caching.

**Simplicity**

JWTs require handling & rotating a private key, in addition to being able to blacklist tokens in case of a leaked private key. This is cumbersome and error prone.

**Length**

JWTs are _long_ and are cumbersome to copy & paste. Database-backed tokens can store unlimited metadata.

