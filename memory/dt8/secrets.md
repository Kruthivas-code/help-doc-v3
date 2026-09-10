<Steps>
<Step title="Store secrets in the Secrets manager">
Reference them by name in code (for example `process.env.STRIPE_KEY`); the values stay out of your source.
</Step>
<Step title="Keep them out of version control">
Ensure `.env` files are git-ignored before you Save to GitHub.
</Step>
<Step title="Rotate anything exposed">
If a key ends up in a commit or a screenshot, revoke and reissue it at the provider.
</Step>
</Steps>
