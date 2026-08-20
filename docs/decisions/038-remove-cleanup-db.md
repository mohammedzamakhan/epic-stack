# Remove Cleanup DB

Date: 2024-10-28

Status: accepted

## Context

We have a utility called `cleanupDb` that removes all tables from the database
except for migration-history tables. The reference to those tables is
unfortunate because they are an implementation detail that we should not have to
think about.

The goal of `cleanupDb` was to make it easy for tests to reset the database
without having to recreate the SQLite database, which is too slow for lower
level tests.

We also used `cleanupDb` in the seed file to reset the database before seeding
it.

However, after a lot of work on the tests, we found a much simpler solution to
resetting the database between tests: simply copy/paste the `base.db` file
(which is a fresh database) to `test.db` before each test. We were already doing
this before all the tests. It takes nanoseconds and is much simpler.

For the seed script, it's nice to have the database be completely reset before
running the seed command (in fact, our seed expects the database to be empty),
but you can get the same behavior as our current `seed` with a fresh database by
running `npm run db:migrate:deploy` against a clean database after resetting it.

It would be nice to ditch the implementation detail of migration-history tables,
so we'd like to remove this utility.

## Decision

Remove the `cleanupDb` utility and update our CI to use the Drizzle migration
runner against a clean database instead of a separate seed reset command.

## Consequences

Running the seed script will fail because it expects the database to be empty.
We could address this by using upsert or something, but people should run the
database migration and seed workflow against a clean SQLite file.
