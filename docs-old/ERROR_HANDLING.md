# Error Handling

## Usage

All errors that are thrown from modules should be defined in the `module.json`,
like this:

```json
{
	"errors": {
		"FOO": {},
		"BAR": {}
	}
}
```

The errors can then be thrown from within scripts like:

```typescript
throw new RuntimeError("FOO");
```

## Motivation

**HAndling errors**

When calling external APIs, it's difficult to handle errors correctly. Some
errors are meant to be recoverable (i.e. username not unique), others indicate
an invalid state (i.e. not found), while others are unrecoverable (i.e. database
errors).

Enforcing each module to have concrete error tyeps makes it easier to explicitly
handle different types of errors.

**Documentation**

One goal of Open Game Backend is to have high qulaity documentation, and that includes all
errors.

This error handling system is inspired by Stripe's well documented error types
[here](https://stripe.com/docs/error-codes).
