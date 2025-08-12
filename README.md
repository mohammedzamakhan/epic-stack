<div align="center">
  <h1 align="center"><a href="https://www.epicweb.dev/epic-stack">The Epic Stack 🚀</a></h1>
  <strong align="center">
    Ditch analysis paralysis and start shipping Epic Web apps.
  </strong>
  <p>
    This is an opinionated project starter and reference that allows teams to
    ship their ideas to production faster and on a more stable foundation based
    on the experience of <a href="https://kentcdodds.com">Kent C. Dodds</a> and
    <a href="https://github.com/epicweb-dev/epic-stack/graphs/contributors">contributors</a>.
  </p>
</div>

```sh
npx epicli
```

[![The Epic Stack](https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/246885449-1b00286c-aa3d-44b2-9ef2-04f694eb3592.png)](https://www.epicweb.dev/epic-stack)

[The Epic Stack](https://www.epicweb.dev/epic-stack)

<hr />

## Watch Kent's Introduction to The Epic Stack

[![Epic Stack Talk slide showing Flynn Rider with knives, the text "I've been around and I've got opinions" and Kent speaking in the corner](https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/277818553-47158e68-4efc-43ae-a477-9d1670d4217d.png)](https://www.epicweb.dev/talks/the-epic-stack)

["The Epic Stack" by Kent C. Dodds](https://www.epicweb.dev/talks/the-epic-stack)

## Docs

[Read the docs](https://github.com/epicweb-dev/epic-stack/blob/main/docs)
(please 🙏).

## Monorepo Structure

This project is a monorepo managed by Turborepo. The code is organized into two
main directories: `apps` and `packages`.

- **`apps`**: Contains the different applications that make up the Epic Stack.
- **`packages`**: Contains reusable packages that are shared across the
  different applications.

### Applications

| Application       | Description                                         | Dev Command                            |
| ----------------- | --------------------------------------------------- | -------------------------------------- |
| `web`             | The main Remix application.                         | `npm run dev:web`                      |
| `background-jobs` | Trigger.dev app for background jobs.                | `npm run dev:trigger`                  |
| `docs`            | Mintlify app for documentation.                     | `npm run docs:dev`                     |
| `email`           | React Email app for developing & previewing emails. | `cd apps/email && npm run dev`         |
| `notifications`   | Novu app for managing notifications.                | `cd apps/notifications && npm run dev` |
| `studio`          | Prisma Studio for database viewing and editing.     | `cd apps/studio && npm run dev`        |

### Packages

The `packages` directory contains reusable packages that are shared across the
different applications.

- **`@repo/prisma`**: Contains the database schema, Prisma client, and
  migrations.
- **`@repo/ui`**: Contains the UI components that are shared across the
  applications.
- **`@repo/config`**: Contains the shared configuration for the applications
  (e.g. ESLint, Prettier, etc.).
- **`@repo/email`**: Contains the email templates and logic for sending emails.
- **`@repo/background-jobs`**: Contains the background job definitions.
- **`@repo/integrations`**: Contains the code for integrating with third-party
  services.
- **`@repo/notifications`**: Contains the notification workflows.

### Development

To run all the applications in development mode, run the following command from
the root of the repository:

```sh
npm run dev
```

This will start the following applications:

- `web`
- `background-jobs`
- `docs`
- `email`
- `notifications`
- `studio`

You can also run each application individually. Refer to the "Applications"
section for the specific commands.

## Support

- 🆘 Join the
  [discussion on GitHub](https://github.com/epicweb-dev/epic-stack/discussions)
  and the [KCD Community on Discord](https://kcd.im/discord).
- 💡 Create an
  [idea discussion](https://github.com/epicweb-dev/epic-stack/discussions/new?category=ideas)
  for suggestions.
- 🐛 Open a [GitHub issue](https://github.com/epicweb-dev/epic-stack/issues) to
  report a bug.

## Branding

Want to talk about the Epic Stack in a blog post or talk? Great! Here are some
assets you can use in your material:
[EpicWeb.dev/brand](https://epicweb.dev/brand)

## Thanks

You rock 🪨
