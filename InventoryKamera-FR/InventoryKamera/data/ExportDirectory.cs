using System;
using System.IO;

namespace InventoryKamera
{
    public static class ExportDirectory
    {
        public static string Resolve(string path)
        {
            return Path.GetFullPath(string.IsNullOrWhiteSpace(path)
                ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "GenshinTracker", "Exports")
                : path.Trim());
        }

        public static string Prepare(string path)
        {
            var resolved = Resolve(path);
            Directory.CreateDirectory(resolved);
            return resolved;
        }
    }
}
