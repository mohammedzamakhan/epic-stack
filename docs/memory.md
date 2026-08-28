# Memory

Epic Stack apps run on Cloudflare Workers, which have memory limits based on
your plan (e.g., 128MB per worker instance). Since Cloudflare Workers scale
automatically with request traffic, memory is allocated per-isolate and
automatically managed by the runtime.

There is no swap file or virtual memory to manage. To handle tasks requiring
more memory, consider breaking them up into smaller chunks, using Cloudflare
queues, or upgrading to a Cloudflare Workers Paid plan which provides higher
resource limits.
