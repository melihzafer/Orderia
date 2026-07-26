# Menu AI Edge Function

`menu-ai-draft` turns a short manager prompt into a strict, editable catalog
draft. It never publishes menu data. Publication happens later through the
manager-only `publish_menu_ai_draft` transaction after explicit review.

Set server-only secrets in each Supabase environment:

```sh
supabase secrets set OPENAI_API_KEY=... \
  OPENAI_MENU_MODEL=gpt-5.6-luna \
  ORDERIA_ALLOWED_ORIGINS=https://app.example.com
```

Deploy the authenticated function:

```sh
supabase functions deploy menu-ai-draft
```

`ORDERIA_ALLOWED_ORIGINS` accepts a comma-separated allowlist. Native requests
do not send an Origin header. When the variable is omitted, only localhost web
origins are accepted.

The OpenAI key stays in the Edge Function runtime. The function uses the
Responses API with strict Structured Outputs and `store: false`, records
latency/token usage, and enforces per-user burst and per-organization daily
quotas before calling the model.
