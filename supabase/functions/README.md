# Menu AI Edge Function

`menu-ai-draft` turns a short manager prompt into a strict, editable catalog
draft. It never publishes menu data. Publication happens later through the
manager-only `publish_menu_ai_draft` transaction after explicit review.

Set server-only secrets in each Supabase environment:

```sh
supabase secrets set NVIDIA_API_KEY=... \
  NVIDIA_MENU_MODEL=nvidia/nemotron-3-nano-30b-a3b \
  ORDERIA_ALLOWED_ORIGINS=https://app.example.com
```

Deploy the authenticated function:

```sh
supabase functions deploy menu-ai-draft
```

`ORDERIA_ALLOWED_ORIGINS` accepts a comma-separated allowlist. Native requests
do not send an Origin header. When the variable is omitted, only localhost web
origins are accepted.

The NVIDIA key stays in the Edge Function runtime. The function calls
NVIDIA's OpenAI-compatible Chat Completions API (`integrate.api.nvidia.com`)
in JSON-object mode, with the target schema embedded in the system prompt
and validated server-side after the response comes back. It records
latency/token usage and enforces per-user burst and per-organization daily
quotas before calling the model.
