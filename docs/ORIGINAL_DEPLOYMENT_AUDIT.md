# Original deployment boundary

The original office sweepstake deployment was reviewed only to understand the product shape. It includes personal staff assignments, employer branding, and work-contact information, so none of its source, data, or visual assets are reproduced here.

This repository is instead a clean-room portfolio demo. It uses fictional participants, fictional fixtures, locally stored demo selections, and a server-side optional live-data adapter that exposes only the fields the interface needs.

## Safe feature set retained

- Participant-to-team assignments
- Automatically calculated standings
- Fixture status and score handling
- Optional live match ingestion with a sample-data fallback
- Responsive interface and timed refresh

## Deliberate exclusions

- Real participant names, selections, and standings
- Employer names, logos, emails, and internal wording
- Original source code and deployment configuration
- Provider credentials, raw provider responses, and quota headers

If an internal version is required, it should be hosted privately with authentication and the relevant employer approvals.
