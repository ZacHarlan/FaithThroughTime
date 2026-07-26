using Xunit;

// All integration tests share a single SQLite file at bin/Debug/net9.0/faith-through-time.db.
// The DatabaseInitializer's seed gate (`SELECT COUNT(*) FROM people` followed by a separate
// INSERT block) is not atomic, so when xUnit runs different test classes in parallel and each
// spins up its own WebApplicationFactory<Program>, multiple factories can race the seed:
// some see an empty table mid-seed, partial inserts can clash with FK/unique constraints, and
// downstream tests then see an incomplete dataset.
//
// Disabling cross-class parallelization makes seeding happen exactly once and keeps every
// integration test deterministic. All tests are read-only, so sequential execution costs us
// nothing functionally and trades a small amount of wall time for stability.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
