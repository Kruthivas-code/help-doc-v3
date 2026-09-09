---
title: "Custom & MCP Integrations for Wingman"
description: "How Wingman connects to tools through APIs and MCP (Model Context Protocol) — both Wingman-managed MCP integrations and custom third-party MCP servers you add yourself."
tags: [wingman integrations, mcp, model context protocol, custom integration, third-party mcp, mcp server, hosted http mcp, add custom integration, wingman tools, composio]
groups: [wingman]
status: draft
visibility: public
author: kamran@emergent.sh
created_at: 2026-06-10
updated_at: 2026-06-10
---

# Custom & MCP Integrations for Wingman

Beyond the built-in OAuth integrations (see **Wingman Integrations & Tasks**), Wingman can also connect to tools through **APIs** and **MCP (Model Context Protocol)** — an open standard that apps expose so AI agents can access their data and take actions. MCP lets you connect Wingman to more tools without waiting for a custom-built integration for every app. You can add these integrations and mcp by asking your wingman directly.

You don't need to think about the underlying technology: MCP-backed tools appear inside the same **Integrations** surface as everything else. There are two kinds.

## Wingman-Managed (First-Party) MCP Integrations

These are MCP integrations added and maintained by the Wingman team. They behave like any other integration:

1. Open **Integrations** and find the integration by browsing or searching.
2. Start the standard **connect** flow.
3. Wingman handles authentication using the same patterns as other integrations.
4. Once connected, the integration's tools become available to your Wingman.
5. Manage, disconnect, or reconnect it from the same Integrations surface.

You can also just ask your Wingman in chat to do something that needs one of these integrations — it will identify the right integration and walk you through connecting it, then continue your task.

## Custom (Third-Party) MCP Servers

You can also add your own MCP server — for example, one provided by a tool you already use.

### Adding a custom MCP server

1. Ask your wingman to connect with a custom MCP server.
2. Provide either:
   - the MCP server's **endpoint URL**, or
   - a **JSON config** using the standard `mcpServers` shape used by MCP clients (e.g., Claude Code / Desktop).
3. Wingman validates that the server supports **hosted HTTP MCP** and reads its metadata to suggest a display name (you can rename it).
4. If the server needs authentication, Wingman prompts you through a **secure credential flow** (bearer token, API key, or custom header) — you never paste secrets into the chat. Only references to those secrets are stored, not the raw values.
5. Wingman discovers the server's available tools and registers the ones you enable for that Wingman.
6. View status, disconnect, or remove the custom integration anytime from **Integrations**.

### Permissions

MCP tools use the **same permission flow** as the rest of your Wingman's tools — read-only actions run automatically, while actions that modify data ask for your approval before running. See **Wingman Channels** for how approval prompts appear on each channel.

## Supported & Not Yet Supported

- **Supported:** hosted **HTTP / Streamable HTTP** MCP servers (servers already running at a URL). Wingman only needs the endpoint and auth details to validate the server, discover tools, and call them.
- **Not yet supported:** **command-based / local MCP servers** (e.g., `npx`, `uvx`, stdio). These require running a local process and are planned for a later phase.

Removing a custom MCP integration revokes its credentials, removes its tools, clears cached schemas, and invalidates any permissions tied to that server.

## Related

- **Wingman Integrations & Tasks** — OAuth integrations and scheduled tasks
- **Wingman Channels** — connecting Telegram, WhatsApp, iMessage
- **What is Wingman** — overview and getting started
