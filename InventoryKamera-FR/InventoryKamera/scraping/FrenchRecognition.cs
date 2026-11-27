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

        internal static string ReadEquippedCharacter(string text, Func<string,string> findCharacter)
        {
            // French equipment labels omit the colon used by the English UI.
            var match = Regex.Match(ForScanner(text),
                @"^\s*equipped(?:\s*:\s*|\s+)([\p{L}][\p{L}\s'.-]*)\s*$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            if (!match.Success) return null;
            string name = Regex.Replace(match.Groups[1].Value, @"[^\p{L}]", "").ToLowerInvariant();
            return findCharacter(name);
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

        internal static List<KeyValuePair<string,decimal>> ReadArtifactSubstats(string text, Func<string,string> findStat, Action<string> error)
        {
            var stats=new List<KeyValuePair<string,decimal>>();
            foreach(string raw in (text??"").Split('\n'))
            {
                string line=Regex.Replace(Normalize(raw),@"\s","");
                if(string.IsNullOrWhiteSpace(line))continue;
                if(line.Contains(":")||line.Contains("piece")||line.Contains("set")||line.Contains("2-"))break;
                if(!line.Any(char.IsDigit))continue;
                // Locked preview rolls are not active substats; do not add their values to the export.
                // OCR often cuts the marker to "(a" / "(aact", so accept any "(a…" tail.
                if(Regex.IsMatch(line,@"\(a[a-z]*\)?$"))continue;
                line=Regex.Replace(line,@"^[^a-zA-Z]*","");
                // OCR turns 1s into letters: "n" is "11", other glyphs (i l h j t | !) are one "1"; repaired after "+" only.
                // ("atk+n,1%" -> "11,1%", "atk+hi6" -> "16"). A % roll under 2 still means a dropped digit: error.
                line=Regex.Replace(line,@"(?<=\+)[^+]*",m=>Regex.Replace(m.Value.Replace("n","11"),@"[ilhjt|!]+","1"));
                var match=Regex.Match(line,@"^(.*?)(\d+.*)$");
                string name=Regex.Replace(match.Groups[1].Value,@"[^\w]","");
                string valueText=match.Groups[2].Value;
                string key=findStat(name+(valueText.Contains("%")?"%":""))??"";
                decimal value;
                if(string.IsNullOrWhiteSpace(key)||!TryReadNumber(valueText,out value)||value<=0||(valueText.Contains("%")&&value<2))
                {
                    error("Sous-statistique illisible : « "+raw.Trim()+" ». Cette pièce est exclue de l’export valide.");
                    stats.Add(new KeyValuePair<string,decimal>("",-1));
                    continue;
                }
                stats.Add(new KeyValuePair<string,decimal>(key,value));
            }
            return stats;
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
