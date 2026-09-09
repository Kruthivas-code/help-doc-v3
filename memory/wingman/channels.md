---
title: "Wingman Channels"
description: "How to connect and use Telegram, WhatsApp, and iMessage channels with your Wingman, including multi-channel messaging, voice messages, and channel permissions."
tags: [wingman channels, telegram, whatsapp, imessage, multi-channel, messaging, connect channel, qr code, access code, whatsapp 24 hour, channel permissions, disconnect channel, voice messages, plain text]
groups: [wingman]
status: published
visibility: public
author: kamran@emergent.sh
helpjuice_id: 3759115
created_at: 2026-04-10
updated_at: 2026-04-28
---

# Wingman Channels

Your Wingman lives on the web at **app.emergent.sh/wingman**, **getwingman.com** , but you can also reach it through **WhatsApp**, **Telegram**, and **iMessage**. All channels feed into one continuous conversation — a message sent via WhatsApp and a message sent on the web are part of the same chat with the same memory and context.

## Available Channels

| Channel | Format | Connection Method | Notes |
| --- | --- | --- | --- |
| **Web Chat** | Markdown | Always on | Default. Rich cards with action buttons. Tool execution visible. |
| **Telegram** | Markdown | Bot verification | Photos, documents, voice, locations. No contacts/polls/video notes. |
| **WhatsApp** | Plain text only | QR code or access code | 24-hour reply window. No video messages. Contact card on connect. |
| **iMessage** | Plain text only | Access code | Images and files supported. ~3,000 messages/day limit per number. |

## Voice Messages


## Phone Calls

Your Wingman can make outbound phone calls on your behalf. When a call is initiated, an **inline call card** appears in the chat showing:

- **Pre-call countdown** with a **Cancel** button to abort before the call connects.
- **Call in progress** status while the call is active.
- **Terminal status** once the call ends — completed, failed, or cancelled.

If your Wingman makes multiple calls in a single turn, they collapse into a single **batch card** summarizing results (e.g., "3/5 calls successful").

You can tap a call card to open a **Call info sheet** with full call details.

Phone call cards are currently available on **Web Chat** only.

You can send voice messages to your Wingman on **Telegram** , **WhatsApp** , and **iMessage**. Your Wingman transcribes the audio and responds to the content. Voice message limits: **10 MB** maximum file size, **2 minutes** maximum duration. Supported formats: MP3, WAV, M4A, FLAC, and OGG.

## Connecting a Channel

1. Open your Wingman and click **Preferences** (top-right).
2. Go to the **Channels** tab.
3. Click **Connect** on the channel you want.
4. Follow the connection flow for that channel (see below).

You can also connect channels directly from the **banner at the top of the chat input box** , which shows Telegram, WhatsApp, and iMessage icons with **"Add me on your phone and I will keep you posted 24×7"**.

### WhatsApp Connection

Two methods are offered:

- **Scan QR code** with your phone's WhatsApp camera.
- **Send an access code** — open WhatsApp or via gatewingman.com/WhatsApp, send the displayed code (e.g., `YXED-4856`) to the phone number shown (e.g., +1 415-378-3939).

Once verified, your Wingman sends a **contact card** with its name and a confirmation message: *"[Name] connected! You can now chat here. Save the contact card sent above so you always know who's texting!"*

**Note:** The WhatsApp contact name shows the platform's assigned name (e.g., "Wingman\_3"), not your custom Wingman name. This is normal — your Wingman still knows its name and personality inside the conversation. **Video messages are not supported on WhatsApp** — send photos, documents, or voice messages instead.

### Telegram Connection

You receive a verification code to send to the assigned Telegram bot. Once verified, the bot responds to your messages as your Wingman.

**Supported media:** photos, documents, voice messages, audio files, locations, venues, stickers. **Not supported:** contacts, polls, and video notes.

### iMessage Connection

Send the displayed access code to the assigned phone number via iMessage. A contact card is sent on successful connection.

iMessage has a daily message limit of approximately **3,000 messages per number**. If you hit this limit, messages will resume the following day.

## How Multi-Channel Works

## In-Channel Payments

If your credits run out while chatting on an external channel, your Wingman offers a convenient way to recharge without leaving the app:

- **WhatsApp** — tap-to-pay buttons appear with up to 3 suggested amounts basis the different available plans.
- **iMessage** — checkout links are sent with the same personalized amount options.
- **Web Chat, Telegram** — a plain-text recharge message with a link is shown instead.

The suggested amounts are based on the current on-going top-up bundles. Users already at the top tier may see fewer options.

### Supported Payment Gateways

In-channel checkout (tap-to-pay buttons or direct checkout links) is supported for **Stripe (USD)**, **Razorpay (INR)**, and **PagBrasil (BRL)**. Other gateways (Paddle, RevenueCat) fall back to a plain-text message directing you to recharge on the web.

All channels share **one conversation and one memory** per Wingman. If you ask a question on WhatsApp and follow up on the web, your Wingman has the full context from both. Messages from external channels appear in the web chat tagged with their source (e.g., **"via WhatsApp"**).

When your Wingman completes a scheduled task or wants to proactively reach you, it delivers the message to the channel you specified when creating the task — or to your most recently active channel.

## WhatsApp 24-Hour Window

WhatsApp requires businesses to respond within **24 hours** of the last user message. If your Wingman needs to reach you after this window expires (e.g., a scheduled task result), it sends a re-engagement notification. Once you reply, the 24-hour window resets and normal messaging resumes.

## Channel Permissions

When your Wingman needs approval for a sensitive action (e.g., sending an email on your behalf), it asks for permission through whichever channel you're on:

- **Web** — clickable buttons in the chat
- **Playstore (coming soon on IOS)** -  Wingman: AI Agent & Assistant
- **Telegram** — inline keyboard buttons (Allow / Deny / Always Allow)
- **WhatsApp** — interactive buttons (up to 3)
- **iMessage** — numbered text replies (1 = Deny, 2 = Allow, 3 = Always Allow)

## Disconnecting a Channel

Go to **Preferences → Channels**. Connected channels show a green **"Connected"** badge and a red **"Disconnect"** button. Click Disconnect to remove that channel from your Wingman.

## Related

- **What is Wingman** — overview and getting started
- **Wingman Integrations & Tasks** — connecting apps, scheduled automations

## Steps when the Wingman WhatsApp connection flow fails

  1. Can't see the connect link? This is the #1 documented failure. WhatsApp hides web links until the sender is a saved contact — save the Wingman/platform number to your phone contacts first, then reopen
  the chat and the link/code appears.
  2. Send the access code to the right number. Copy the exact access_code (e.g. KUFV-3589) and send it as a message to the WhatsApp number Wingman gave you — from the same phone number you're trying to
  connect.
  3. Wait a few seconds and refresh. The UI polls every ~3–5s; give it a moment to move from pending → connected rather than retrying immediately.
  4. "Already connected" / stale state? If it claims the page/number is already connected but isn't working, disconnect the channel and reconnect (Channels section → Disconnect on WhatsApp → start
  verification again) to clear the stale/duplicate connection.
  5. Get a fresh code if it expired by restarting verification, then resend.

  If it's the WhatsApp integration (Meta/OAuth, sending on your behalf)

  This path fails far more often, and the failures are mechanical, not user error:

  1. Open the connect link in a normal browser session, not inside an in-app webview, and complete Meta's consent screen.
  2. Grant every requested scope and pick the correct account/page — declined or partial consent leaves it silently unconnected.
  3. If the agent keeps saying "try a fresh link" (the OAuth-callback-didn't-register loop), don't keep clicking new links — disconnect any half-finished connection, then start one clean attempt.
  4. Check it actually connected before relying on it, since the agent often can't verify connection state itself.