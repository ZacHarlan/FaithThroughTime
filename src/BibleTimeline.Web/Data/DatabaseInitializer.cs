using Microsoft.Data.Sqlite;
using System.Reflection;

namespace BibleTimeline.Web.Data;

public class DatabaseInitializer
{
    private readonly string _connectionString;

    public DatabaseInitializer(string connectionString)
    {
        _connectionString = connectionString;
    }

    public void Initialize()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        var schemaSql = ReadEmbeddedResource("BibleTimeline.Web.Data.Schema.sql");

        using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = schemaSql;
            cmd.ExecuteNonQuery();
        }

        // Only seed if database is empty
        using (var checkCmd = connection.CreateCommand())
        {
            checkCmd.CommandText = "SELECT COUNT(*) FROM people";
            var count = (long)checkCmd.ExecuteScalar()!;
            if (count == 0)
            {
                var seedSql = ReadEmbeddedResource("BibleTimeline.Web.Data.SeedData.sql");
                using var seedCmd = connection.CreateCommand();
                seedCmd.CommandText = seedSql;
                seedCmd.ExecuteNonQuery();
            }
        }
    }

    public void InitializeForTesting(SqliteConnection connection)
    {
        var schemaSql = ReadEmbeddedResource("BibleTimeline.Web.Data.Schema.sql");

        using var cmd = connection.CreateCommand();
        cmd.CommandText = schemaSql;
        cmd.ExecuteNonQuery();
    }

    private static string ReadEmbeddedResource(string resourceName)
    {
        var assembly = Assembly.GetAssembly(typeof(DatabaseInitializer))!;
        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new FileNotFoundException($"Embedded resource '{resourceName}' not found.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
