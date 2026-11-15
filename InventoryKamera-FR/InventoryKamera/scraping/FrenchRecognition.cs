using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace InventoryKamera
{
    internal static class FrenchRecognition
    {
        private static readonly Lazy<Dictionary<string, string>> Names = new Lazy<Dictionary<string, string>>(() =>
            JsonConvert.DeserializeObject<Dictionary<string, string>>(File.ReadAllText(
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "inventorylists", "french-aliases.json"))));
        private static readonly Lazy<Dictionary<string, string>> Replacements = new Lazy<Dictionary<string, string>>(() =>
        {
            var map = new Dictionary<string, string>();
            foreach (var pair in Names.Value)
            {
                string key = Normalize(pair.Key);
                if (map.TryGetValue(key, out var existing) && existing != pair.Value)
                    throw new InvalidDataException("Nom français ambigu : " + pair.Key);
                map[key] = pair.Value;
            }
            foreach (var pair in new Dictionary<string, string> {
                ["PV"] = "HP", ["ATQ"] = "ATK", ["DÉF"] = "DEF",
                ["Recharge d'énergie"] = "Energy Recharge", ["Maîtrise élémentaire"] = "Elemental Mastery",
                ["Bonus de soins"] = "Healing Bonus", ["Taux CRIT"] = "CRIT Rate", ["DGT CRIT"] = "CRIT DMG",
                ["Bonus de DGT physiques"] = "Physical DMG Bonus", ["Équipé par"] = "Equipped",
                ["Équipé"] = "Equipped", ["Equipped"] = "Equipped", ["Filtrer"] = "Filter",
                ["Filtre"] = "Filter", ["Niveau"] = "Level", ["Qualité"] = "Quality", ["pièces"] = "piece", ["Voyageur"] = "Traveler",
                ["Voyageuse"] = "Traveler", ["Nomade"] = "Wanderer"
            }) map[Normalize(pair.Key)] = pair.Value;
            foreach (string element in new[] {"Pyro", "Hydro", "Cryo", "Anémo", "Géo", "Électro", "Dendro"})
                map[Normalize("Bonus de DGT " + element)] = Normalize(element) + " DMG Bonus";
            return map;
        });
        private static readonly Lazy<Regex> Pattern = new Lazy<Regex>(() => new Regex(
            @"(?<![\p{L}\p{N}])(?:" + string.Join("|", Replacements.Value.Keys
                .OrderByDescending(k => k.Length).Select(k => Regex.Escape(k).Replace(@"\ ", @"\s*")))
            + @")(?![\p{L}\p{N}])", RegexOptions.CultureInvariant, TimeSpan.FromSeconds(2)));

        internal static string Normalize(string text)
        {
            var result = new StringBuilder();
            foreach (char c in (text ?? "").Normalize(NormalizationForm.FormD))
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    result.Append(c);
            return result.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant()
                .Replace('’', '\'').Replace('œ', 'o').Replace('\u00a0', ' ').Replace('\u202f', ' ');
        }

        internal static bool TryReadInventoryCount(string text, out int count)
        {
            count = 0;
            string[] parts = Regex.Replace(text ?? "", @"\s", "").Split('/');
            return parts.Length == 2 && int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out count)
                && int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out int capacity)
                && capacity > 0 && count >= 0 && count <= capacity;
        }

        internal static bool TryReadNumber(string text, out decimal value)
        {
            string number = Regex.Replace(text ?? "", @"[\s%+]", "").Replace(',', '.');
            return decimal.TryParse(number, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out value);
        }

        internal static string ForScanner(string text)
        {
            string normalized = Normalize(text);
            return Pattern.Value.Replace(normalized, match => {
                string key = Regex.Replace(match.Value, @"\s+", " ");
                if (Replacements.Value.TryGetValue(key, out var value)) return value;
                string compact = Regex.Replace(key, @"\s", "");
                return Replacements.Value.First(p => Regex.Replace(p.Key, @"\s", "") == compact).Value;
            });
        }
    }
}
