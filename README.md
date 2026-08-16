# Best Condo Bot — Tickets

This project contains the common ticket system migrated from MikuBot. It includes only the standard ticket workflow and does not include MID tickets, ratings, or log delivery.

## Commands

- `/ticket panel`: publishes the ticket opening panel and accepts an optional title and thumbnail.
- `/ticket add user:<user>`: adds a user to the current ticket channel.
- `/ticket remove user:<user>`: removes a user from the current ticket channel.

Ticket buttons allow users to cancel, staff members to close, and authorized staff members to claim a ticket. Staff roles are configured through `TICKET_SUPPORT_ROLE_ID` and `TICKET_EXTRA_ROLE_ID`.

## Running the bot

Copy `.env.example` to `.env`, fill in the bot variables, and run `pnpm install`, followed by `pnpm run build` and `pnpm start`.
