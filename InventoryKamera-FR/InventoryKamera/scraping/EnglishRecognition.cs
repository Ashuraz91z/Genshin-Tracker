using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace InventoryKamera
{
    /// <summary>
    /// Reads text from a game set to English. The rules are those of the original Inventory Kamera (MIT, Andrewthe13th),
    /// kept for the English mode; FrenchRecognition is used only when the game is set to French.
    /// </summary>
    internal static class EnglishRecognition
    {
        internal static List<KeyValuePair<string,decimal>> ReadArtifactSubstats(string text, Func<string,string> findStat, Action<string> error)
        {
            var lines = new List<string>((text ?? "").Split('\n'));
            lines.RemoveAll(line => string.IsNullOrWhiteSpace(line));

            var index = lines.FindIndex(line => line.Contains(":") || line.Contains("piece") || line.Contains("set") || line.Contains("2-"));
            if (index >= 0)
                lines.RemoveRange(index, lines.Count - index);

            var result = new List<KeyValuePair<string,decimal>>();
            foreach (string raw in lines)
            {
                var line = Regex.Replace(raw, @"(?:^[^a-zA-Z]*)", string.Empty).Replace(" ", string.Empty);
                if (!line.Any(char.IsDigit))
                    continue;

                var match = new Regex(@"^(.*?)(\d+.*)").Match(line);
                var stat = Regex.Replace(match.Groups[1].Value, @"[^\w]", string.Empty);
                string name = line.Contains("%") ? stat + "%" : stat;
                string code = findStat(name) ?? "";

                var digits = Regex.Replace(match.Groups[2].Value, @"[^0-9]", string.Empty);
                decimal value;
                if (!decimal.TryParse(digits, out value))
                {
                    error?.Invoke("Substat illisible : " + raw);
                    value = -1;
                }
                else if (code.Contains("_"))
                {
                    value /= 10;
                }

                result.Add(new KeyValuePair<string,decimal>(code, value));
            }
            return result;
        }

        // "Equipped: Name" on artifacts and weapons; returns the closest character name, or null when nothing is equipped.
        internal static string ReadEquippedCharacter(string text, Func<string,string> findCharacter)
        {
            string lower = (text ?? "").ToLower();
            if (!(lower.Contains("equipped") && lower.Contains(":")))
                return null;
            string name = Regex.Replace(lower.Split(':')[1], @"[\W]", string.Empty);
            return findCharacter(name);
        }

        // Inventory counter: "123/1800", or the count alone with the page capacity removed.
        internal static bool TryReadInventoryCount(string text, string pageCapacity, out int count)
        {
            count = 0;
            text = text ?? "";
            if (text.Contains("/"))
                return int.TryParse(text.Split('/')[0], out count);
            if (Regex.Matches(text, pageCapacity).Count != 1)
                return false;
            return int.TryParse(text.Replace(pageCapacity, string.Empty), out count);
        }
    }
}
