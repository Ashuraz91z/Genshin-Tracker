using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;

namespace InventoryKamera
{
    internal static class ScanReport
    {
        private static readonly ConcurrentQueue<string> Errors = new ConcurrentQueue<string>();
        private static readonly ConcurrentQueue<JObject> PartialCharacters = new ConcurrentQueue<JObject>();
        private static readonly ConcurrentQueue<object> Events = new ConcurrentQueue<object>();
        internal static void Progress(string message) { Events.Enqueue(new { at=DateTime.UtcNow.ToString("o"), message }); while(Events.Count>500) Events.TryDequeue(out _); }
        internal static int? ExpectedWeapons, ExpectedArtifacts;
        internal static bool HasErrors => !Errors.IsEmpty;
        internal static string Status = "not_started";
        internal static void Reset()
        {
            while (Errors.TryDequeue(out _)) { }
            while (PartialCharacters.TryDequeue(out _)) { }
            ExpectedWeapons = ExpectedArtifacts = null;
            while (Events.TryDequeue(out _)) { }
            Status = "running";
        }
        internal static void Error(string message) { Errors.Enqueue(message); }
        internal static void Partial(Character character) { PartialCharacters.Enqueue(JObject.FromObject(character)); }
        internal static void Write(string path, InventoryKamera data)
        {
            var settings = Properties.Settings.Default;
            var report = new {
                status = Status, completenessVerified = false, language = "fr",
                notice = "Scan expérimental : les données absentes ne prouvent pas l'absence d'un objet. Les personnages incomplets restent dans ce rapport, hors export GOOD.",
                selected = new { characters = settings.ScanCharacters, weapons = settings.ScanWeapons, artifacts = settings.ScanArtifacts,
                    materials = settings.ScanMaterials, developmentItems = settings.ScanCharDevItems },
                counts = new { characters = data.Characters.Count, weapons = data.Inventory.Weapons.Count,
                    artifacts = data.Inventory.Artifacts.Count, materials = data.Inventory.AllMaterials.Count() },
                expectedFromScreen = new { weapons = ExpectedWeapons, artifacts = ExpectedArtifacts },
                countsAgree = new { weapons = ExpectedWeapons.HasValue ? (bool?)(ExpectedWeapons.Value == data.Inventory.Weapons.Count) : null,
                    artifacts = ExpectedArtifacts.HasValue ? (bool?)(ExpectedArtifacts.Value == data.Inventory.Artifacts.Count) : null },
                events = Events.ToArray(), errors = Errors.ToArray(), partialCharacters = PartialCharacters.ToArray(),
                unsupported = new[] { "quêtes", "succès", "exploration", "événements", "autres onglets d'inventaire" }
            };
            File.WriteAllText(path, JsonConvert.SerializeObject(report, Formatting.Indented));
        }
    }
}
