# Region Selection

Date: 2023-06-02

Status: accepted

## Context

Cloudflare Workers runs your app in hundreds of data centers all over the world.
The Epic Stack is set up to allow you to take advantage of this global network,
but for the tenant databases (which are regional), it's best to start out with a
single region until your app needs that level of scale.

Region selection has an important impact on the performance of your app. When
you're choosing a single region, you're choosing who your app is going to be
slower for. So you really should choose the region that's closest to the most
critical/closest users.

Unfortunately, there's no way for us to know this for every app. We can't just
select a region for you. And we also can't just select the region that's closest
to you. We need you to actually think about and make this decision.

## Decision

Ask which region the app should be deployed to during setup.

## Consequences

Forces the developer to make a choice (goes against the "Minimize Setup
Friction" guiding principle). However, we can make it slightly better by
defaulting to the region that's closest to the developer.
