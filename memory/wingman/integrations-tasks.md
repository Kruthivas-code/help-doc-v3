---
title: "Wingman Integrations & Tasks"
description: "How to connect external services to your Wingman via integrations and set up scheduled automated tasks."
tags: [wingman integrations, wingman tasks, gmail, linkedin, notion, google calendar, scheduled tasks, recurring tasks, cron, oauth, composio, connect integration, automation, daily summary, task schedule, delete wingman, deactivate wingman]
groups: [wingman]
status: published
visibility: public
author: kamran@emergent.sh
helpjuice_id: 3759116
created_at: 2026-04-10
updated_at: 2026-06-10
---

# Wingman Integrations & Tasks

Your Wingman can connect to **300+ external services** (Gmail, LinkedIn, Notion, Slack, and more) to take actions on your behalf, and run **scheduled tasks** — recurring automations or one-time jobs that execute even when you're not chatting.
To add these integrations and tasks, you can directly ask your wingman.

## Built-in Capabilities

Your Wingman has several capabilities that work **without connecting any integration**:

- **Web search** — searches the internet for current information, articles, and data
- **File analysis** — directly reads PNG, JPEG, GIF, WebP, and PDF files (see **What is Wingman**). For other formats like Excel, CSV, or other spreadsheets, your Wingman uses code execution to parse and analyze them.
- **Code execution** — can write and run code to process data, generate files, and automate tasks
- **Memory** — remembers facts and preferences across conversations

Integrations extend these capabilities by giving your Wingman access to your personal accounts and services.

## Integrations

### What Integrations Do

Integrations give your Wingman **OAuth or API access** to external services. Once connected, your Wingman can search for available actions, read data, and perform operations in that service — like fetching your Gmail inbox, creating a LinkedIn post, or adding a row to a Google Sheet.

Each Wingman has its own separate connections. Connecting Gmail to one Wingman does not give your other Wingmen access to Gmail.

### Available Integrations

| Category | Services |
| --- | --- |
| **Google** | Gmail, Google Calendar, Google Sheets, Google Drive, Google Docs, Google Slides, Google Meet |
| **Productivity** | Notion, Asana, Trello, Linear, Airtable, Monday.com, Jira |
| **Communication** | Slack, Discord, Outlook, Mailchimp, SendGrid |
| **Social** | LinkedIn, X (Twitter), Instagram, Facebook |
| **CRM & Sales** | HubSpot, Salesforce, Pipedrive, Calendly |
| **Support** | Freshdesk, Zendesk, Intercom |
| **Finance** | Stripe, Shopify, QuickBooks, Xero |
| **Developer** | GitHub, Supabase, Figma |
| **Other** | Zoom, Dropbox, Make, Typeform, DocuSign |

### Connecting an Integration

1. Click **Preferences** (top-right) → **Integrations**.
2. Search or browse the grid of available services.
3. Click the **connect icon** on the service you want.
4. A new window opens with the service's OAuth consent screen. You'll see **"Composio would like to:"** followed by the permissions being requested — this is expected. Composio is the integration infrastructure that manages OAuth connections on behalf of Emergent.
5. Click **Allow**.
6. A success page appears: **"[Service] Connected — You can close this window and return to your conversation."** The page auto-closes in 2 seconds.

Connected integrations show a green **"active"** badge in the Integrations grid. Click the **three-dot menu** (⋯) to disconnect.

### What Your Wingman Can Do With Integrations

Capabilities vary by service. Your Wingman automatically discovers what actions are available for each connected integration. For example:

- **Gmail** — read, search, send, and draft emails
- **Google Calendar** — view, create, and manage events
- **LinkedIn** — create and delete posts, fetch profile information (connection request management is not currently supported)
- **Notion** — read and write pages and databases
- **GitHub** — manage repositories, issues, and pull requests

When your Wingman doesn't have a direct integration action for something, it tries alternative approaches — for example, checking your Gmail for LinkedIn notification emails, or using web search to find information.

### Accessing Apps Built on Emergent

If you have applications built on the Emergent app builder, your Wingman can access their databases directly — no separate integration setup required. This is native to the platform.

### Integration Permissions

Read-only actions (searching, fetching data) are performed automatically. Actions that modify external data (sending an email, creating a post, deleting a record) require your **explicit approval** before execution. You can grant one-time approval or "Always Allow" for a specific action type. See **Wingman Channels** for how approval prompts appear on each channel.

---

## Scheduled Tasks

### What Tasks Are

Tasks are automated jobs your Wingman runs on a schedule — even when you're not chatting. A task can be **recurring** (runs on a cron schedule, e.g., every weekday at 9am) or **one-time** (runs once at a specific date and time).

### Creating a Task

Open the **Tasks** tab (next to Chat at the top of the Wingman interface). When empty, it shows suggested templates:

- "Send me a daily email summary"
- "Remind me every Monday at 9am"
- "Check my calendar every morning"
- "Weekly project status report"

Click a suggestion to get started, or describe a custom task in the chat. Your Wingman creates the schedule and confirms the details.

You can also just ask your wingman to create a scheduled task conversationally.

### How Tasks Execute

When a scheduled task fires, your Wingman receives the full context — your identity, personality, connected integrations, and channel presence. It executes the task and delivers the result to the **delivery channel** you specified (web, Telegram, WhatsApp, iMessage). Scheduled tasks run independently and continue working even when you're not chatting.

All schedules are **timezone-aware** — "every day at 9am" means 9am in your timezone.

### Managing Tasks

From the **Tasks** tab, you can:

- **Pause** a task — temporarily stops it from executing
- **Resume** a paused task
- **Edit** — change the schedule, task description, or delivery channel
- **Delete** — permanently remove the task

You can also manage tasks conversationally by telling your Wingman in chat (e.g., "pause my daily email summary" or "change my Monday reminder to 10am").

### Paused Tasks & Auto-Resume

If a scheduled task fails because your account has **insufficient credits**, the task is automatically paused with a status of **Paused (No Credits)**. Once you add more credits to your account, paused tasks **automatically resume** — no manual action is required. Your Wingman receives a signal when credits are available again and restarts any tasks that were paused for this reason.

## Deleting a Wingman

Disconnecting a single channel (the **Disconnect** action on Telegram/WhatsApp/iMessage in the **Channels** section) leaves the Wingman itself intact. To delete a Wingman **entirely** — not just unhook one channel:

1. Click **Preferences** (top-right of the Wingman interface, on **app.emergent.sh/wingman**, **getwingman.com**).
2. Go to the **Settings** section.
3. Scroll to the bottom and click **Delete Wingman [Name]**.
4. Confirm by clicking the red **Delete [Name]** button.

This is **permanent** and wipes everything tied to that Wingman — all conversations, connected integrations, channels, and scheduled automations.

## Related

- **What is Wingman** — overview and getting started
- **Wingman Channels** — connecting Telegram, WhatsApp, iMessage
- **How Credits Work** — credit types, costs, billing
