## Your data & ownership

Beyond the GDPR/DPA specifics, here's what to expect about getting your code and data out, and about stability.

## Exporting your code & data

You can take your code and your data out of Emergent:

- **Your code** — push it to GitHub with **Save → Save to GitHub** (Standard plan and above), then clone locally; or browse and copy files with the **Code** button in the top toolbar (all plans, web only). Full steps: see **[Save to GitHub](/save-to-github)**.
- **Your database** — export it at any time with `mongodump` or MongoDB Compass, or as per-collection CSV from the Database Viewer. You may need to allowlist our IPs first ([app.emergent.sh/ip-addresses](https://app.emergent.sh/ip-addresses)). Full steps: see **[Database (MongoDB)](/database-mongodb)**.

<Note>
**Not included** in a code export: environment variables and secrets, database contents, and `node_modules` — handle those separately.
</Note>

## Backups & data safety

Emergent keeps routine back-ups of production data, and you can export your own copy at any time using the methods above.

## Platform stability & uptime

Check current platform status at the Trust Centre: **[emergent.trust.site](https://emergent.trust.site)**.
